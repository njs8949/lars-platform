"""데이터 웨어하우스: 계정마다 PostgreSQL 스키마 하나를 두고, 파일을 테이블로 적재하고, SQL로 조회한다.

스노우플레이크에서 가져온 구조 (규모는 Prism에 맞게 줄였다)
- 계정 분리: 계정마다 스키마(wh_...)를 따로 쓴다. 다른 계정의 테이블은 보이지 않는다.
- 적재와 조회를 나눈다: 적재는 테이블 쓰기, 조회는 읽기 전용 트랜잭션으로 실행한다.
- 적재 이력(_load_log)과 쿼리 이력(_query_log)을 남긴다.
- 카탈로그: information_schema로 테이블과 열, 자료형, 행 수를 조회한다.
- 조회 제한: SELECT와 WITH만, 한 문장만, 읽기 전용 트랜잭션, 8초 시간 제한, 최대 1,000행.

설정
- WAREHOUSE_DATABASE_URL 환경 변수가 있으면 PostgreSQL을 쓴다. 예: postgresql://user:pass@host:5432/prism
- 없으면 기존처럼 계정별 SQLite 파일을 쓴다(개발용 대체 경로).

보안 참고
- 운영에서는 웨어하우스 전용 로그인 역할을 만들어 쓰는 것을 권장한다. 그 역할은 다른 스키마에 접근 권한이 없어야 한다.
- 제외한 것: 가상 웨어하우스(컴퓨트 분리), 마이크로 파티션, 시간 여행, 제로 카피 복제.
"""

import hashlib
import io
import os
import re
import sqlite3
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_ROWS = 1_000_000
RESULT_LIMIT = 1000
QUERY_SECONDS = 8
NAME_RULE = re.compile(r"^[A-Za-z_가-힣][A-Za-z0-9_가-힣]{0,62}$")
SYSTEM_TABLES = {"_load_log", "_query_log"}
SQLITE_DIR = Path(".lars") / "warehouse"
_engine = None


# ---------- 공통 ----------
def _account_key(email: str) -> str:
    return hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()[:20]


def _pg_url() -> Optional[str]:
    url = os.getenv("WAREHOUSE_DATABASE_URL", "").strip()
    if not url:
        return None
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def uses_postgres() -> bool:
    return _pg_url() is not None


def _get_engine():
    global _engine
    if _engine is None:
        from sqlalchemy import create_engine
        _engine = create_engine(_pg_url(), pool_pre_ping=True, pool_size=5, max_overflow=5)
    return _engine


def check_table_name(name: str) -> str:
    value = (name or "").strip()
    if not NAME_RULE.match(value):
        raise ValueError("테이블 이름은 한글, 영문, 숫자, 밑줄(_)만 쓸 수 있고 글자로 시작해야 합니다.")
    if value in SYSTEM_TABLES:
        raise ValueError("시스템 이름이라 사용할 수 없습니다.")
    return value


def _read_table(filename: str, data: bytes) -> pd.DataFrame:
    suffix = Path(filename).suffix.lower()
    if suffix in (".xlsx", ".xls"):
        df = pd.read_excel(io.BytesIO(data))
    elif suffix in (".csv", ".txt"):
        last_error: Optional[Exception] = None
        for encoding in ("utf-8-sig", "cp949", "utf-8"):
            try:
                df = pd.read_csv(io.BytesIO(data), encoding=encoding)
                break
            except (UnicodeDecodeError, pd.errors.ParserError) as err:
                last_error = err
        else:
            raise ValueError(f"CSV 파일을 읽지 못했습니다: {last_error}")
    else:
        raise ValueError("CSV, TXT, XLSX, XLS 파일만 적재할 수 있습니다.")
    if df.empty:
        raise ValueError("비어 있는 파일입니다.")
    if len(df) > MAX_ROWS:
        raise ValueError(f"행이 너무 많습니다. 최대 {MAX_ROWS:,}행까지 적재할 수 있습니다.")
    seen: Dict[str, int] = {}
    columns = []
    for index, column in enumerate(df.columns):
        base = str(column).strip() or f"column_{index + 1}"
        count = seen.get(base, 0)
        seen[base] = count + 1
        columns.append(base if count == 0 else f"{base}_{count + 1}")
    df.columns = columns
    return df


# ---------- PostgreSQL 경로 ----------
def _schema(email: str) -> str:
    return f"wh_{_account_key(email)}"


def _pg_connect():
    import psycopg2
    return psycopg2.connect(_pg_url().replace("postgresql+psycopg2://", "postgresql://", 1))


def _pg_ensure(email: str) -> str:
    from psycopg2 import sql
    schema = _schema(email)
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute(sql.SQL("CREATE SCHEMA IF NOT EXISTS {}").format(sql.Identifier(schema)))
            cur.execute(sql.SQL(
                "CREATE TABLE IF NOT EXISTS {} (id BIGSERIAL PRIMARY KEY, table_name TEXT, source TEXT, mode TEXT, rows BIGINT, loaded_at TIMESTAMP)"
            ).format(sql.Identifier(schema, "_load_log")))
            cur.execute(sql.SQL(
                "CREATE TABLE IF NOT EXISTS {} (id BIGSERIAL PRIMARY KEY, sql_text TEXT, rows BIGINT, elapsed_ms BIGINT, ran_at TIMESTAMP, error TEXT)"
            ).format(sql.Identifier(schema, "_query_log")))
    finally:
        conn.close()
    return schema


def _pg_type(series: pd.Series) -> str:
    kind = series.dtype.kind
    if kind == "b":
        return "BOOLEAN"
    if kind in ("i", "u"):
        return "BIGINT"
    if kind == "f":
        return "DOUBLE PRECISION"
    if kind == "M":
        return "TIMESTAMP"
    return "TEXT"


def _py_value(value: Any) -> Any:
    if value is None:
        return None
    try:
        if pd.isna(value):
            return None
    except (TypeError, ValueError):
        pass
    if hasattr(value, "item"):
        return value.item()
    if isinstance(value, pd.Timestamp):
        return value.to_pydatetime()
    return value


def _pg_load(email: str, filename: str, df: pd.DataFrame, name: str, mode: str) -> Dict[str, Any]:
    """적재: 열 자료형을 정하고, 덮어쓰기면 새로 만들고, 추가면 뒤에 넣는다. 한 트랜잭션으로 처리한다."""
    from psycopg2 import sql
    from psycopg2.extras import execute_values
    schema = _pg_ensure(email)
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema=%s AND table_name=%s ORDER BY ordinal_position", (schema, name))
            current = [r[0] for r in cur.fetchall()]
            table = sql.Identifier(schema, name)
            if mode == "append" and current:
                if current != list(df.columns):
                    raise ValueError("추가하려는 파일의 열이 기존 테이블과 다릅니다.")
            else:
                cur.execute(sql.SQL("DROP TABLE IF EXISTS {}").format(table))
                column_defs = [sql.SQL("{} {}").format(sql.Identifier(c), sql.SQL(_pg_type(df[c]))) for c in df.columns]
                cur.execute(sql.SQL("CREATE TABLE {} ({})").format(table, sql.SQL(", ").join(column_defs)))
            rows = [tuple(_py_value(v) for v in row) for row in df.itertuples(index=False, name=None)]
            insert = sql.SQL("INSERT INTO {} ({}) VALUES %s").format(table, sql.SQL(", ").join(sql.Identifier(c) for c in df.columns))
            execute_values(cur, insert.as_string(conn), rows, page_size=1000)
            cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(table))
            total = cur.fetchone()[0]
            cur.execute(sql.SQL("INSERT INTO {} (table_name, source, mode, rows, loaded_at) VALUES (%s, %s, %s, %s, %s)").format(sql.Identifier(schema, "_load_log")),
                        (name, filename[:200], mode, int(len(df)), datetime.now()))
    finally:
        conn.close()
    return {"total": int(total)}


def _pg_catalog(email: str) -> List[Dict[str, Any]]:
    from psycopg2 import sql
    schema = _pg_ensure(email)
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_type='BASE TABLE' ORDER BY table_name", (schema,))
            names = [r[0] for r in cur.fetchall() if r[0] not in SYSTEM_TABLES]
            out = []
            for name in names:
                cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema=%s AND table_name=%s ORDER BY ordinal_position", (schema, name))
                columns = [{"name": r[0], "type": r[1]} for r in cur.fetchall()]
                cur.execute(sql.SQL("SELECT COUNT(*) FROM {}").format(sql.Identifier(schema, name)))
                rows = cur.fetchone()[0]
                cur.execute("SELECT source, loaded_at FROM " + f'"{schema}"."_load_log"' + " WHERE table_name=%s ORDER BY id DESC LIMIT 1", (name,))
                last = cur.fetchone()
                out.append({"name": name, "columns": columns, "rows": int(rows),
                            "source": last[0] if last else "", "loaded_at": last[1].isoformat(timespec="seconds") if last and last[1] else ""})
            return out
    finally:
        conn.close()


def _pg_preview(email: str, name: str, limit: int) -> Dict[str, Any]:
    from psycopg2 import sql
    schema = _pg_ensure(email)
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name=%s", (schema, name))
            if not cur.fetchone():
                raise ValueError("테이블을 찾을 수 없습니다.")
            cur.execute(sql.SQL("SELECT * FROM {} LIMIT %s").format(sql.Identifier(schema, name)), (max(1, min(limit, 200)),))
            cols = [d[0] for d in cur.description]
            return {"columns": cols, "rows": [list(r) for r in cur.fetchall()]}
    finally:
        conn.close()


def _pg_drop(email: str, name: str) -> bool:
    from psycopg2 import sql
    schema = _pg_ensure(email)
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT 1 FROM information_schema.tables WHERE table_schema=%s AND table_name=%s", (schema, name))
            if not cur.fetchone():
                return False
            cur.execute(sql.SQL("DROP TABLE {}").format(sql.Identifier(schema, name)))
            cur.execute("DELETE FROM " + f'"{schema}"."_load_log"' + " WHERE table_name=%s", (name,))
            return True
    finally:
        conn.close()


def _json_value(value: Any) -> Any:
    """결과 값을 JSON으로 보낼 수 있는 형태로 바꾼다 (Decimal은 실수, 날짜는 문자열)."""
    from decimal import Decimal
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime,)):
        return value.isoformat(timespec="seconds")
    if isinstance(value, (bytes, memoryview)):
        return "<binary>"
    return value


def _pg_query(email: str, text: str) -> Dict[str, Any]:
    from psycopg2 import sql
    schema = _pg_ensure(email)
    conn = _pg_connect()
    started = time.time()
    error = None
    result: Dict[str, Any] = {}
    try:
        with conn.cursor() as cur:
            # 읽기 전용 트랜잭션 + 시간 제한 + 이 계정의 스키마만 보이도록 검색 경로를 고정한다
            cur.execute("SET TRANSACTION READ ONLY")
            cur.execute("SET LOCAL statement_timeout = %s", (f"{QUERY_SECONDS * 1000}",))
            cur.execute(sql.SQL("SET LOCAL search_path TO {}").format(sql.Identifier(schema)))
            cur.execute(text)
            cols = [d[0] for d in cur.description] if cur.description else []
            rows = cur.fetchmany(RESULT_LIMIT + 1)
            result = {"columns": cols, "rows": [[_json_value(v) for v in r] for r in rows[:RESULT_LIMIT]], "truncated": len(rows) > RESULT_LIMIT}
            conn.rollback()
    except Exception as err:
        conn.rollback()
        error = str(err).strip().splitlines()[0][:300] if str(err).strip() else "알 수 없는 오류"
    finally:
        elapsed = int((time.time() - started) * 1000)
        try:
            with conn, conn.cursor() as cur:
                cur.execute("INSERT INTO " + f'"{schema}"."_query_log"' + " (sql_text, rows, elapsed_ms, ran_at, error) VALUES (%s, %s, %s, %s, %s)",
                            (text[:2000], len(result.get("rows", [])), elapsed, datetime.now(), error))
        finally:
            conn.close()
    if error:
        raise ValueError(f"쿼리 오류: {error}")
    result["elapsed_ms"] = elapsed
    return result


def _pg_history(email: str, limit: int) -> Dict[str, Any]:
    schema = _pg_ensure(email)
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT sql_text, rows, elapsed_ms, ran_at FROM " + f'"{schema}"."_query_log"' + " ORDER BY id DESC LIMIT %s", (limit,))
            queries = [{"sql": r[0], "rows": r[1], "elapsed_ms": r[2], "ran_at": r[3].isoformat(timespec="seconds")} for r in cur.fetchall()]
            cur.execute("SELECT table_name, source, mode, rows, loaded_at FROM " + f'"{schema}"."_load_log"' + " ORDER BY id DESC LIMIT %s", (limit,))
            loads = [{"table": r[0], "source": r[1], "mode": r[2], "rows": r[3], "loaded_at": r[4].isoformat(timespec="seconds")} for r in cur.fetchall()]
        return {"queries": queries, "loads": loads}
    finally:
        conn.close()


# ---------- SQLite 대체 경로 (WAREHOUSE_DATABASE_URL 이 없을 때) ----------
_ALLOWED_ACTIONS = {sqlite3.SQLITE_SELECT, sqlite3.SQLITE_READ, sqlite3.SQLITE_FUNCTION, sqlite3.SQLITE_RECURSIVE}


def _sqlite_connect(email: str) -> sqlite3.Connection:
    path = SQLITE_DIR / f"{_account_key(email)}.sqlite"
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path), check_same_thread=False)
    conn.execute("CREATE TABLE IF NOT EXISTS _load_log (id INTEGER PRIMARY KEY, table_name TEXT, source TEXT, mode TEXT, rows INTEGER, loaded_at TEXT)")
    conn.execute("CREATE TABLE IF NOT EXISTS _query_log (id INTEGER PRIMARY KEY, sql_text TEXT, rows INTEGER, elapsed_ms INTEGER, ran_at TEXT, error TEXT)")
    conn.commit()
    return conn


def _sqlite_authorizer(action, arg1, arg2, dbname, source):
    return sqlite3.SQLITE_OK if action in _ALLOWED_ACTIONS else sqlite3.SQLITE_DENY


def _sqlite_load(email: str, filename: str, df: pd.DataFrame, name: str, mode: str) -> Dict[str, Any]:
    conn = _sqlite_connect(email)
    try:
        if mode == "append":
            if conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone():
                current = [row[1] for row in conn.execute(f'PRAGMA table_info("{name}")')]
                if current != list(df.columns):
                    raise ValueError("추가하려는 파일의 열이 기존 테이블과 다릅니다.")
        df.to_sql(name, conn, if_exists="replace" if mode == "replace" else "append", index=False)
        conn.execute("INSERT INTO _load_log (table_name, source, mode, rows, loaded_at) VALUES (?, ?, ?, ?, ?)",
                     (name, filename[:200], mode, int(len(df)), datetime.now().isoformat(timespec="seconds")))
        conn.commit()
        total = conn.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
    finally:
        conn.close()
    return {"total": int(total)}


def _sqlite_catalog(email: str) -> List[Dict[str, Any]]:
    conn = _sqlite_connect(email)
    try:
        names = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")]
        out = []
        for name in names:
            if name in SYSTEM_TABLES:
                continue
            columns = [{"name": r[1], "type": r[2] or "TEXT"} for r in conn.execute(f'PRAGMA table_info("{name}")')]
            rows = conn.execute(f'SELECT COUNT(*) FROM "{name}"').fetchone()[0]
            last = conn.execute("SELECT source, loaded_at FROM _load_log WHERE table_name=? ORDER BY id DESC LIMIT 1", (name,)).fetchone()
            out.append({"name": name, "columns": columns, "rows": int(rows), "source": last[0] if last else "", "loaded_at": last[1] if last else ""})
        return out
    finally:
        conn.close()


def _sqlite_preview(email: str, name: str, limit: int) -> Dict[str, Any]:
    conn = _sqlite_connect(email)
    try:
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone():
            raise ValueError("테이블을 찾을 수 없습니다.")
        cursor = conn.execute(f'SELECT * FROM "{name}" LIMIT ?', (max(1, min(limit, 200)),))
        return {"columns": [d[0] for d in cursor.description], "rows": [list(r) for r in cursor.fetchall()]}
    finally:
        conn.close()


def _sqlite_drop(email: str, name: str) -> bool:
    conn = _sqlite_connect(email)
    try:
        if not conn.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (name,)).fetchone():
            return False
        conn.execute(f'DROP TABLE "{name}"')
        conn.execute("DELETE FROM _load_log WHERE table_name=?", (name,))
        conn.commit()
        return True
    finally:
        conn.close()


def _sqlite_query(email: str, text: str) -> Dict[str, Any]:
    conn = _sqlite_connect(email)
    started = time.time()
    deadline = started + QUERY_SECONDS
    error = None
    result: Dict[str, Any] = {}
    try:
        conn.set_authorizer(_sqlite_authorizer)
        conn.set_progress_handler(lambda: 1 if time.time() > deadline else 0, 10000)
        cursor = conn.execute(text)
        cols = [d[0] for d in cursor.description] if cursor.description else []
        rows = cursor.fetchmany(RESULT_LIMIT + 1)
        result = {"columns": cols, "rows": [list(r) for r in rows[:RESULT_LIMIT]], "truncated": len(rows) > RESULT_LIMIT}
    except sqlite3.Error as err:
        error = str(err)[:300]
    finally:
        conn.set_authorizer(None)
        conn.set_progress_handler(None, 0)
        elapsed = int((time.time() - started) * 1000)
        conn.execute("INSERT INTO _query_log (sql_text, rows, elapsed_ms, ran_at, error) VALUES (?, ?, ?, ?, ?)",
                     (text[:2000], len(result.get("rows", [])), elapsed, datetime.now().isoformat(timespec="seconds"), error))
        conn.commit()
        conn.close()
    if error:
        raise ValueError(f"쿼리 오류: {error}")
    result["elapsed_ms"] = elapsed
    return result


def _sqlite_history(email: str, limit: int) -> Dict[str, Any]:
    conn = _sqlite_connect(email)
    try:
        queries = [{"sql": r[0], "rows": r[1], "elapsed_ms": r[2], "ran_at": r[3]} for r in conn.execute(
            "SELECT sql_text, rows, elapsed_ms, ran_at FROM _query_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
        loads = [{"table": r[0], "source": r[1], "mode": r[2], "rows": r[3], "loaded_at": r[4]} for r in conn.execute(
            "SELECT table_name, source, mode, rows, loaded_at FROM _load_log ORDER BY id DESC LIMIT ?", (limit,)).fetchall()]
        return {"queries": queries, "loads": loads}
    finally:
        conn.close()


# ---------- 공개 함수: 설정에 따라 PostgreSQL 또는 SQLite 경로를 쓴다 ----------
def _single_statement(sql_text: str) -> str:
    text = sql_text.strip().rstrip(";").strip()
    if not text:
        raise ValueError("SQL을 입력해 주세요.")
    if ";" in text:
        raise ValueError("SQL은 한 번에 한 문장만 실행할 수 있습니다.")
    first = re.split(r"\s+", text, maxsplit=1)[0].lower()
    if first not in ("select", "with"):
        raise ValueError("조회(SELECT, WITH)만 실행할 수 있습니다. 데이터 변경은 파일 적재로 하세요.")
    return text


def load(email: str, filename: str, data: bytes, table_name: str, mode: str = "replace") -> Dict[str, Any]:
    if len(data) > MAX_UPLOAD_BYTES:
        raise ValueError("파일은 50MB까지 적재할 수 있습니다.")
    if mode not in ("replace", "append"):
        raise ValueError("적재 방식은 replace 또는 append 여야 합니다.")
    name = check_table_name(table_name)
    df = _read_table(filename, data)
    if uses_postgres():
        check_capacity(email, int(df.memory_usage(deep=True).sum()))
        result = _pg_load(email, filename, df, name, mode)
        _background_optimize(email)
    else:
        result = _sqlite_load(email, filename, df, name, mode)
    return {"table": name, "rows_loaded": int(len(df)), "rows_total": result["total"], "mode": mode, "columns": list(df.columns)}


def catalog(email: str) -> List[Dict[str, Any]]:
    return _pg_catalog(email) if uses_postgres() else _sqlite_catalog(email)


def preview(email: str, table_name: str, limit: int = 50) -> Dict[str, Any]:
    name = check_table_name(table_name)
    return _pg_preview(email, name, limit) if uses_postgres() else _sqlite_preview(email, name, limit)


def drop_table(email: str, table_name: str) -> bool:
    name = check_table_name(table_name)
    return _pg_drop(email, name) if uses_postgres() else _sqlite_drop(email, name)


def query(email: str, sql_text: str) -> Dict[str, Any]:
    text = _single_statement(sql_text)
    result = _pg_query(email, text) if uses_postgres() else _sqlite_query(email, text)
    if uses_postgres():
        _background_optimize(email)
    return result


def history(email: str, limit: int = 30) -> List[Dict[str, Any]]:
    data = _pg_history(email, limit) if uses_postgres() else _sqlite_history(email, limit)
    return data["queries"]


def load_history(email: str, limit: int = 30) -> List[Dict[str, Any]]:
    data = _pg_history(email, limit) if uses_postgres() else _sqlite_history(email, limit)
    return data["loads"]


def engine_name() -> str:
    return "PostgreSQL" if uses_postgres() else "SQLite (개발용)"


# ---------- 자동 분석과 자동 확장 (PostgreSQL) ----------
# 정책
#   1) 자동 최적화: 통계 갱신(ANALYZE), 느린 조회에 자주 쓰인 조건 열에 인덱스 생성, 쿼리 이력 정리.
#   2) 자동 확장(논리 한도): 사용량이 한도의 85%를 넘으면 최적화를 먼저 돌리고, 그래도 넘으면
#      상한(WAREHOUSE_DB_CEILING_GB) 안에서 한도를 50%씩 올린다. 모든 변경은 이벤트로 남긴다.
#   3) 상한에 닿으면 적재를 막고 "인프라 증설 필요"를 알린다. 서버 디스크 자체를 늘리는 일은 인프라 작업이다.
import threading as _threading

DB_LIMIT_BASE_GB = float(os.getenv("WAREHOUSE_DB_LIMIT_GB", "10"))
DB_CEILING_GB = float(os.getenv("WAREHOUSE_DB_CEILING_GB", "50"))
ACCOUNT_QUOTA_MB = float(os.getenv("WAREHOUSE_ACCOUNT_QUOTA_MB", "2048"))
OPTIMIZE_EVERY_SECONDS = 600
MAX_INDEXES_PER_TABLE = 6
SLOW_QUERY_MS = 500
QUERY_LOG_KEEP = 500
_last_optimize: Dict[str, float] = {}
_limit_state = {"gb": DB_LIMIT_BASE_GB}


def _pg_limit_bytes() -> int:
    return int(_limit_state["gb"] * 1024 ** 3)


def _pg_event(cur, kind: str, detail: str) -> None:
    cur.execute("CREATE TABLE IF NOT EXISTS public.wh_capacity_events (id BIGSERIAL PRIMARY KEY, kind TEXT, detail TEXT, at TIMESTAMP DEFAULT now())")
    cur.execute("INSERT INTO public.wh_capacity_events (kind, detail) VALUES (%s, %s)", (kind, detail[:500]))


def _pg_database_bytes() -> int:
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT pg_database_size(current_database())")
            return int(cur.fetchone()[0])
    finally:
        conn.close()


def _pg_account_bytes(email: str) -> int:
    schema = _schema(email)
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""SELECT COALESCE(SUM(pg_total_relation_size(c.oid)), 0) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                           WHERE n.nspname = %s AND c.relkind = 'r'""", (schema,))
            return int(cur.fetchone()[0])
    finally:
        conn.close()


def _pg_optimize_account(email: str) -> Dict[str, Any]:
    """한 계정의 자동 최적화: 통계, 인덱스, 이력 정리. 만든 것을 돌려준다."""
    from psycopg2 import sql
    schema = _pg_ensure(email)
    conn = _pg_connect()
    actions: List[str] = []
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema=%s AND table_type='BASE TABLE'", (schema,))
            tables = [r[0] for r in cur.fetchall() if r[0] not in SYSTEM_TABLES]
            columns: Dict[str, List[str]] = {}
            for t in tables:
                cur.execute("SELECT column_name FROM information_schema.columns WHERE table_schema=%s AND table_name=%s", (schema, t))
                columns[t] = [r[0] for r in cur.fetchall()]
            # 느린 조회에서 자주 나온 열 이름을 찾는다 (WHERE, GROUP BY, ORDER BY, JOIN 근처에 쓰인 것으로 본다)
            cur.execute("SELECT sql_text FROM " + f'"{schema}"."_query_log"' + " WHERE elapsed_ms >= %s AND error IS NULL ORDER BY id DESC LIMIT 200", (SLOW_QUERY_MS,))
            slow_sql = [r[0] for r in cur.fetchall()]
            hits: Dict[tuple, int] = {}
            for text in slow_sql:
                for t in tables:
                    if not re.search(rf'(?<![\w가-힣]){re.escape(t)}(?![\w가-힣])', text):
                        continue
                    for c in columns[t]:
                        if re.search(rf'(?<![\w가-힣]){re.escape(c)}(?![\w가-힣])', text):
                            hits[(t, c)] = hits.get((t, c), 0) + 1
            for (t, c), _count in sorted(hits.items(), key=lambda kv: -kv[1])[:3]:
                cur.execute("SELECT COUNT(*) FROM pg_indexes WHERE schemaname=%s AND tablename=%s", (schema, t))
                if cur.fetchone()[0] >= MAX_INDEXES_PER_TABLE:
                    continue
                index_name = f"ix_{t}_{c}"[:60]
                cur.execute(sql.SQL("CREATE INDEX IF NOT EXISTS {} ON {} ({})").format(
                    sql.Identifier(index_name), sql.Identifier(schema, t), sql.Identifier(c)))
                actions.append(f"인덱스 생성: {t}.{c}")
            for t in tables:
                cur.execute(sql.SQL("ANALYZE {}").format(sql.Identifier(schema, t)))
            actions.append(f"통계 갱신: {len(tables)}개 테이블")
            cur.execute("DELETE FROM " + f'"{schema}"."_query_log"' + " WHERE id NOT IN (SELECT id FROM " + f'"{schema}"."_query_log"' + " ORDER BY id DESC LIMIT %s)", (QUERY_LOG_KEEP,))
    finally:
        conn.close()
    return {"actions": actions}


def optimize(email: str, force: bool = False) -> None:
    """자동 최적화를 실행한다. 같은 계정은 10분에 한 번만 돌린다. 실패해도 적재와 조회는 막지 않는다."""
    if not uses_postgres():
        return
    now = time.time()
    if not force and now - _last_optimize.get(email, 0) < OPTIMIZE_EVERY_SECONDS:
        return
    _last_optimize[email] = now
    try:
        result = _pg_optimize_account(email)
        if result["actions"]:
            conn = _pg_connect()
            try:
                with conn, conn.cursor() as cur:
                    _pg_event(cur, "optimize", f"{_account_key(email)}: " + "; ".join(result["actions"]))
            finally:
                conn.close()
    except Exception:
        pass


def _background_optimize(email: str) -> None:
    _threading.Thread(target=optimize, args=(email,), daemon=True).start()


def check_capacity(email: str, incoming_bytes: int) -> None:
    """적재 전 용량 점검. 한도를 넘으면 자동 확장을 시도하고, 그래도 안 되면 막는다."""
    if not uses_postgres():
        return
    account = _pg_account_bytes(email)
    if account + incoming_bytes > ACCOUNT_QUOTA_MB * 1024 ** 2:
        raise ValueError(f"이 계정의 웨어하우스 용량 한도({int(ACCOUNT_QUOTA_MB)}MB)를 넘습니다. 테이블을 정리하거나 관리자에게 증설을 요청하세요.")
    used = _pg_database_bytes()
    if used + incoming_bytes < _pg_limit_bytes() * 0.85:
        return
    # 1단계: 자동 최적화로 줄여 본다
    optimize(email, force=True)
    used = _pg_database_bytes()
    if used + incoming_bytes < _pg_limit_bytes() * 0.85:
        return
    # 2단계: 상한 안에서 논리 한도를 자동으로 올린다
    if _limit_state["gb"] < DB_CEILING_GB:
        new_gb = min(DB_CEILING_GB, _limit_state["gb"] * 1.5)
        _limit_state["gb"] = new_gb
        conn = _pg_connect()
        try:
            with conn, conn.cursor() as cur:
                _pg_event(cur, "auto_expand", f"논리 한도를 {new_gb:.3f}GB로 자동 확장")
        finally:
            conn.close()
        return
    # 3단계: 상한에 닿았다. 적재를 막고 인프라 증설을 요청한다
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            _pg_event(cur, "expansion_needed", f"상한 {DB_CEILING_GB}GB 도달, 인프라 증설 필요")
    finally:
        conn.close()
    raise ValueError("웨어하우스 저장 공간이 상한에 도달해 적재를 멈췄습니다. 관리자에게 증설을 요청하세요.")


def status(email: str) -> Dict[str, Any]:
    """운영자와 사용자가 볼 용량 상태."""
    if not uses_postgres():
        return {"engine": engine_name(), "state": "정상", "note": "개발용 저장소라 용량 관리가 적용되지 않습니다."}
    used = _pg_database_bytes()
    limit = _pg_limit_bytes()
    percent = round(used / limit * 100, 1) if limit else 0
    at_ceiling = _limit_state["gb"] >= DB_CEILING_GB
    if percent >= 85 and at_ceiling:
        state = "확장 필요"
    elif percent >= 85:
        state = "주의"
    else:
        state = "정상"
    account = _pg_account_bytes(email)
    events: List[Dict[str, Any]] = []
    conn = _pg_connect()
    try:
        with conn, conn.cursor() as cur:
            if _has_events(cur):
                cur.execute("SELECT kind, detail, at FROM public.wh_capacity_events ORDER BY id DESC LIMIT 10")
                events = [{"kind": r[0], "detail": r[1], "at": r[2].isoformat(timespec="seconds")} for r in cur.fetchall()]
    finally:
        conn.close()
    return {
        "engine": engine_name(), "state": state,
        "database": {"used_mb": round(used / 1024 ** 2, 1), "limit_gb": round(_limit_state["gb"], 2), "ceiling_gb": DB_CEILING_GB, "percent": percent},
        "account": {"used_mb": round(account / 1024 ** 2, 2), "quota_mb": int(ACCOUNT_QUOTA_MB)},
        "events": events,
    }


def _has_events(cur) -> bool:
    cur.execute("SELECT to_regclass('public.wh_capacity_events') IS NOT NULL")
    return bool(cur.fetchone()[0])
