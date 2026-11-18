"""토큰 사용량 장부: 모델 호출마다 입력·출력 토큰을 .lars/usage/usage.jsonl에 한 줄씩 남긴다.

- 로컬 Ollama 호출은 비용이 0원으로 계산한다.
- 클라우드 모델(Claude, EXAONE)은 .lars/billing/prices.json에 단가가 있을 때만 추정 비용을 계산한다.
  단가 파일이 없으면 비용은 '단가 미설정'으로 표시하고 임의의 금액을 쓰지 않는다.
- 청구 내역은 이 장부에서 계산한 추정치다. 실제 결제 금액은 결제사 정산 내역이 기준이다.
"""

import json
import time
import re
import threading
from contextvars import ContextVar
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

USAGE_FILE = Path(".lars") / "usage" / "usage.jsonl"
PRICES_FILE = Path(".lars") / "billing" / "prices.json"
LIMITS_FILE = Path(".lars") / "billing" / "limits.json"
SESSION_START = datetime.now()  # 백엔드가 뜬 시각 = 이번 세션의 시작
LOCAL_PROVIDERS = {"ollama"}
_lock = threading.Lock()
# 지금 처리 중인 채팅이 사용한 LARS 모델 이름 (예: LARS-Native). 요청마다 설정된다.
CURRENT_LARS_MODEL: ContextVar[Optional[str]] = ContextVar("current_lars_model", default=None)
DEFAULT_LABEL = "LARS 기본 모델"
_LABEL = re.compile(r"^[A-Za-z0-9가-힣 _.\-]{1,40}$")


# 정식 모델 이름. 키는 이름을 소문자로 바꾸고 공백·하이픈·밑줄을 뺀 형태다.
# 앱 기본 선택이 LARS-Native라서 이름이 없는 채팅은 LARS Native로 본다.
CANONICAL_MODELS = {
    "larsnative": "LARS Native",
    "larscosmos": "LARS Cosmos",
    "larsprime": "LARS Prime",
    "rekora": "Rekora",
    "synzora": "Synzora",
    "aivora": "Aivora",
    "luminaic": "Luminaic",
    "kexaone": "K-EXAONE 2.5",
    "exaone": "K-EXAONE 2.5",
}
OTHER_LABEL = "기타"
# 프리즘이 제공하는 모델 전체 목록. 호출 기록이 없어도 콘솔 모델 화면에 항상 보인다.
CATALOG_MODELS = [
    "LARS Native", "LARS Cosmos", "LARS Prime",
    "Rekora", "Synzora", "Aivora", "Luminaic", "K-EXAONE 2.5",
]


def _key(name: str) -> str:
    return re.sub(r"[\s\-_.]", "", name).lower()


def canonical_model(name: Optional[str]) -> str:
    """모델 이름을 정식 이름으로 바꾼다. 모르는 이름은 '기타'로 묶는다. 정식 이름을 다시 넣어도 같은 결과다."""
    if not name:
        return CANONICAL_MODELS["larsnative"]
    key = _key(name)
    if key in CANONICAL_MODELS:
        return CANONICAL_MODELS[key]
    for display in CANONICAL_MODELS.values():
        if _key(display) == key:
            return display
    return OTHER_LABEL


def set_lars_model(name: Optional[str]) -> None:
    """채팅 요청이 고른 모델을 정식 이름으로 저장해 둔다. 모르는 이름은 '기타'가 된다."""
    value = (name or "").strip()
    CURRENT_LARS_MODEL.set(canonical_model(value) if value else None)


def model_label(row: dict) -> str:
    # API 호출은 호출할 때 고른 모델 ID로 집계한다 (채팅 세션의 모델과 섞이지 않도록).
    if row.get("feature") == "api":
        return canonical_model(row.get("model"))
    if row.get("feature") == "agent":
        # 사용자가 연결한 외부 에이전트 호출은 LARS 모델과 따로 본다.
        return "외부 Claude" if row.get("provider") == "external-anthropic" else "외부 GPT"
    lars = row.get("lars_model")
    if lars:
        return canonical_model(lars)
    # 모델 이름 없이 제공자로만 남은 호출은 제공자로 구분한다.
    if row.get("provider") == "exaone":
        return CANONICAL_MODELS["exaone"]
    return canonical_model(None)


def record(provider: str, model: str, feature: str, input_tokens: int = 0, output_tokens: int = 0, known: bool = True, key_id: Optional[str] = None) -> None:
    """호출 한 번을 기록한다. 토큰을 알 수 없으면 known=False로 남긴다. 기록 실패가 응답을 막지는 않는다."""
    try:
        row = {
            "ts": datetime.now().isoformat(timespec="seconds"),
            "provider": provider,
            "model": model or "",
            "feature": feature,
            "input_tokens": int(input_tokens or 0),
            "output_tokens": int(output_tokens or 0),
            "known": bool(known),
            "lars_model": CURRENT_LARS_MODEL.get(),
        }
        if key_id:
            row["key_id"] = key_id
        with _lock:
            USAGE_FILE.parent.mkdir(parents=True, exist_ok=True)
            with USAGE_FILE.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")
    except OSError:
        pass


# 기본 단가 (100만 토큰당 USD). 원가 기준이다.
#  - Bedrock Claude Sonnet 5.5: 입력 $2, 출력 $10 (제3자 집계 가격, AWS 공식 가격표와 대조 필요)
#  - 'provider:*' 는 그 제공자의 모든 모델에 적용된다.
#  - 로컬 Ollama 는 LOCAL_PROVIDERS 로 $0 처리. K-EXAONE 은 무료 개방 기간이므로 $0.
# 서버에 .lars/billing/prices.json 이 있으면 그 값이 우선한다.
DEFAULT_PRICES = {
    "bedrock:*": {"input_per_mtok": 2.0, "output_per_mtok": 10.0},
    "claude:*": {"input_per_mtok": 2.0, "output_per_mtok": 10.0},
    # K-EXAONE 은 현재 무료로 개방되어 있어 $0 으로 둔다.
    "exaone:*": {"input_per_mtok": 0.0, "output_per_mtok": 0.0},
}

# 기본 한도 (경고선). 월 원가 예산 $300 을 혼합 원가 $4/100만 토큰으로 환산했다.
# 넘으면 사용량 화면에서 빨갛게 표시되고 웹훅 알림이 간다. 호출을 막지는 않는다.
DEFAULT_LIMITS = {"monthly_tokens": 75_000_000, "weekly_tokens": 17_000_000, "session_tokens": 5_000_000}


def _prices() -> dict:
    try:
        return json.loads(PRICES_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return dict(DEFAULT_PRICES)


def prices_configured() -> bool:
    return bool(_prices())


def _rows_since(start: datetime) -> list:
    if not USAGE_FILE.exists():
        return []
    rows = []
    for line in USAGE_FILE.read_text(encoding="utf-8").splitlines():
        try:
            row = json.loads(line)
        except ValueError:
            continue
        if datetime.fromisoformat(row["ts"]) >= start:
            rows.append(row)
    return rows


def _cost(row: dict, prices: dict) -> Optional[float]:
    if row["provider"] in LOCAL_PROVIDERS:
        return 0.0
    price = prices.get(f"{row['provider']}:{row['model']}") or prices.get(f"{row['provider']}:*")
    if not price or not row["known"]:
        return None
    return (row["input_tokens"] * float(price.get("input_per_mtok", 0)) + row["output_tokens"] * float(price.get("output_per_mtok", 0))) / 1_000_000


def summary(start: Optional[datetime] = None) -> dict:
    """이번 달(또는 start 이후) 사용량을 제공자·기능별로 묶는다."""
    now = datetime.now()
    start = start or now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prices = _prices()
    rows = _rows_since(start)

    totals = {"requests": 0, "input_tokens": 0, "output_tokens": 0, "estimated_cost": 0.0, "unpriced_requests": 0, "unknown_token_requests": 0}
    by_model: dict = {}
    by_feature: dict = {}
    for row in rows:
        cost = _cost(row, prices)
        for bucket, key in ((by_model, model_label(row)), (by_feature, row["feature"])):
            entry = bucket.setdefault(key, {"requests": 0, "input_tokens": 0, "output_tokens": 0, "estimated_cost": 0.0, "unpriced_requests": 0})
            entry["requests"] += 1
            entry["input_tokens"] += row["input_tokens"]
            entry["output_tokens"] += row["output_tokens"]
            if cost is None:
                entry["unpriced_requests"] += 1
            else:
                entry["estimated_cost"] += cost
        totals["requests"] += 1
        totals["input_tokens"] += row["input_tokens"]
        totals["output_tokens"] += row["output_tokens"]
        if not row["known"]:
            totals["unknown_token_requests"] += 1
        if cost is None:
            totals["unpriced_requests"] += 1
        else:
            totals["estimated_cost"] += cost

    return {
        "period_start": start.isoformat(timespec="seconds"),
        "period_end": now.isoformat(timespec="seconds"),
        "totals": totals,
        "by_model": by_model,
        "by_feature": by_feature,
        "prices_configured": bool(prices),
    }


def daily_series(days: int = 30) -> list:
    """최근 days일의 날짜별 요청·토큰·추정 비용. 사용량이 없는 날도 0으로 채워서 돌려준다."""
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    start = today - timedelta(days=days - 1)
    prices = _prices()
    buckets = {(start + timedelta(days=i)).date().isoformat(): {"date": (start + timedelta(days=i)).date().isoformat(),
               "requests": 0, "input_tokens": 0, "output_tokens": 0, "estimated_cost": 0.0} for i in range(days)}
    for row in _rows_since(start):
        key = datetime.fromisoformat(row["ts"]).date().isoformat()
        b = buckets.get(key)
        if b is None:
            continue
        b["requests"] += 1
        b["input_tokens"] += row["input_tokens"]
        b["output_tokens"] += row["output_tokens"]
        cost = _cost(row, prices)
        if cost is not None:
            b["estimated_cost"] += cost
    return list(buckets.values())


def series(range_key: str = "7d") -> list:
    """기간별 추이. 24h는 시간 단위 24칸, 그 밖은 일 단위로 빈 날도 0으로 채운다."""
    now = datetime.now()
    prices = _prices()
    if range_key == "24h":
        start = now.replace(minute=0, second=0, microsecond=0) - timedelta(hours=23)
        keys = [(start + timedelta(hours=i)).strftime("%Y-%m-%dT%H") for i in range(24)]
        label = lambda k: k  # noqa: E731
        key_of = lambda ts: datetime.fromisoformat(ts).strftime("%Y-%m-%dT%H")  # noqa: E731
    else:
        days = {"7d": 7, "14d": 14, "30d": 30}.get(range_key, 7)
        start = now.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days - 1)
        keys = [(start + timedelta(days=i)).date().isoformat() for i in range(days)]
        label = lambda k: k  # noqa: E731
        key_of = lambda ts: datetime.fromisoformat(ts).date().isoformat()  # noqa: E731
    buckets = {k: {"date": k, "requests": 0, "input_tokens": 0, "output_tokens": 0, "estimated_cost": 0.0} for k in keys}
    for row in _rows_since(start):
        b = buckets.get(key_of(row["ts"]))
        if b is None:
            continue
        b["requests"] += 1
        b["input_tokens"] += row["input_tokens"]
        b["output_tokens"] += row["output_tokens"]
        cost = _cost(row, prices)
        if cost is not None:
            b["estimated_cost"] += cost
    return [buckets[k] for k in keys]


def recent(limit: int = 50) -> list:
    """최근 기록 (최신순). 비용은 가격표가 있을 때만 채운다."""
    if not USAGE_FILE.exists():
        return []
    prices = _prices()
    rows = []
    for line in USAGE_FILE.read_text(encoding="utf-8").splitlines()[-max(1, min(limit, 500)):]:
        try:
            row = json.loads(line)
        except ValueError:
            continue
        cost = _cost(row, prices)
        rows.append({**row, "estimated_cost": cost})
    return list(reversed(rows))


def week_totals() -> dict:
    """최근 7일 합계 (주간 한도 표시용)."""
    return summary(datetime.now() - timedelta(days=7))["totals"]


def session_totals() -> dict:
    """백엔드를 띄운 뒤부터의 합계."""
    return summary(SESSION_START)["totals"]


def limits() -> dict:
    """한도 설정 (.lars/billing/limits.json). 파일이 없으면 DEFAULT_LIMITS 를 쓴다. 파일이 빈 {} 이면 한도 없음."""
    try:
        data = json.loads(LIMITS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return dict(DEFAULT_LIMITS)
    try:
        return {k: int(v) for k, v in data.items() if k in ("monthly_tokens", "weekly_tokens", "session_tokens") and int(v) > 0}
    except (TypeError, ValueError):
        return {}


# ---------- 콘솔: 한도 저장, 데이터 보관 기간, 내보내기 ----------

SETTINGS_FILE = Path(".lars") / "console" / "settings.json"
LIMIT_KEYS = ("monthly_tokens", "weekly_tokens", "session_tokens")


def set_limits(data: dict) -> dict:
    """한도를 저장한다. 0 또는 빈 값은 '제한 없음'이다."""
    clean = {}
    for k in LIMIT_KEYS:
        v = data.get(k)
        if v is None or v == "":
            continue
        n = int(v)
        if n < 0 or n > 10_000_000_000:
            raise ValueError(f"{k} 값이 범위를 벗어났습니다.")
        if n > 0:
            clean[k] = n
    LIMITS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        tmp = LIMITS_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding="utf-8")
        tmp.replace(LIMITS_FILE)
    return limits()


def get_settings() -> dict:
    try:
        data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    return {"retention_days": int(data.get("retention_days") or 0)}


def set_retention(days: int) -> dict:
    if days < 0 or days > 3650:
        raise ValueError("보관 기간은 0(무기한)부터 3650일까지 정할 수 있습니다.")
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with _lock:
        SETTINGS_FILE.write_text(json.dumps({"retention_days": days}, ensure_ascii=False), encoding="utf-8")
    return get_settings()


def storage_info() -> dict:
    rows = []
    if USAGE_FILE.exists():
        for line in USAGE_FILE.read_text(encoding="utf-8").splitlines():
            try:
                rows.append(json.loads(line)["ts"])
            except (ValueError, KeyError):
                continue
    return {
        "records": len(rows),
        "oldest": min(rows) if rows else None,
        "newest": max(rows) if rows else None,
        "retention_days": get_settings()["retention_days"],
        "stores": [
            "호출 시각, 제공자, 모델, 기능, 토큰 수, 키 ID(API 호출인 경우)",
            "프롬프트와 응답 내용은 저장하지 않습니다.",
        ],
    }


def prune(days: Optional[int] = None) -> int:
    """보관 기간이 지난 기록을 지운다. days를 생략하면 설정된 보관 기간을 쓴다. 0이면 아무것도 지우지 않는다."""
    days = get_settings()["retention_days"] if days is None else days
    if days <= 0 or not USAGE_FILE.exists():
        return 0
    cutoff = datetime.now() - timedelta(days=days)
    removed = 0
    with _lock:
        keep = []
        for line in USAGE_FILE.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
                if datetime.fromisoformat(row["ts"]) >= cutoff:
                    keep.append(line)
                else:
                    removed += 1
            except (ValueError, KeyError):
                keep.append(line)
        tmp = USAGE_FILE.with_suffix(".tmp")
        tmp.write_text("\n".join(keep) + ("\n" if keep else ""), encoding="utf-8")
        tmp.replace(USAGE_FILE)
    return removed


def export_csv() -> str:
    """사용량 기록을 CSV 문자열로 만든다. 키 ID와 내용은 넣지 않는다."""
    import csv
    import io
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(["ts", "provider", "model", "feature", "input_tokens", "output_tokens", "known", "estimated_cost_usd"])
    if USAGE_FILE.exists():
        prices = _prices()
        for line in USAGE_FILE.read_text(encoding="utf-8").splitlines():
            try:
                row = json.loads(line)
            except ValueError:
                continue
            cost = _cost(row, prices)
            writer.writerow([row.get("ts"), row.get("provider"), model_label(row), row.get("feature"),
                             row.get("input_tokens", 0), row.get("output_tokens", 0), row.get("known"),
                             "" if cost is None else round(cost, 6)])
    return out.getvalue()


def all_rows() -> list:
    """사용량 기록 전부 (팀 사용량 합산용). 읽을 수 없는 줄은 건너뛴다."""
    rows = []
    if USAGE_FILE.exists():
        for line in USAGE_FILE.read_text(encoding="utf-8").splitlines():
            try:
                rows.append(json.loads(line))
            except ValueError:
                continue
    return rows


# ---------- 한도 상태 (채팅 요청마다 확인하므로 짧게 캐시한다) ----------

_LIMIT_TTL_SECONDS = 15
_limit_cache: dict = {"at": 0.0, "value": None}


def limit_status() -> dict:
    """사용량이 한도를 넘었는지 알려 준다. 결과는 15초 동안 재사용해서 요청마다 기록 파일을 읽지 않는다."""
    now = time.time()
    cached = _limit_cache["value"]
    if cached is not None and now - _limit_cache["at"] < _LIMIT_TTL_SECONDS:
        return cached
    lim = limits()
    value: dict = {"exceeded": False, "kind": None, "used": 0, "limit": 0}
    if lim:
        month = summary()["totals"]
        week = week_totals()
        session = session_totals()
        used = {
            "monthly_tokens": month["input_tokens"] + month["output_tokens"],
            "weekly_tokens": week["input_tokens"] + week["output_tokens"],
            "session_tokens": session["input_tokens"] + session["output_tokens"],
        }
        over = [k for k in ("monthly_tokens", "weekly_tokens", "session_tokens") if k in lim and used[k] >= lim[k]]
        if over:
            kind = over[0]
            value = {"exceeded": True, "kind": kind, "used": used[kind], "limit": lim[kind]}
    _limit_cache["at"] = now
    _limit_cache["value"] = value
    return value
