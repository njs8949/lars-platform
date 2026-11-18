"""프로젝트 저장소와 자료 검색.

설계 (ChatGPT·Claude 프로젝트를 참고해 정리)
- 프로젝트는 계정별로 서버에 저장한다. 기기나 브라우저가 바뀌어도 그대로 남는다.
- 파일은 올릴 때 글만 뽑아 저장한다(원본은 보관하지 않는다). PDF, Word, 엑셀, 텍스트를 모두 받는다.
- 대화할 때는 자료 전체가 예산 안에 들어가면 통째로 넣고(Claude 방식),
  넘치면 질문과 관련 있는 조각만 골라 넣는다(ChatGPT 방식). 조각마다 출처 파일명을 붙인다.
- 검색은 글자 n-gram TF-IDF로 한다. 한국어처럼 띄어쓰기가 불규칙한 언어에도 형태소 분석기 없이 동작한다.
"""

import hashlib
import json
import secrets
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_DIR = Path(".lars") / "projects"
CONTEXT_BUDGET = 24000  # 대화에 넣는 자료의 최대 글자 수
CHUNK_SIZE = 900
CHUNK_OVERLAP = 150
MAX_FILE_TEXT = 300_000
MAX_FILES_PER_PROJECT = 30
MAX_INSTRUCTIONS = 4000


def _user_dir(email: str) -> Path:
    key = hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()[:24]
    return PROJECT_DIR / key


def _meta_path(email: str, project_id: str) -> Path:
    return _user_dir(email) / f"{project_id}.json"


def _text_path(email: str, project_id: str, file_id: str) -> Path:
    return _user_dir(email) / project_id / f"{file_id}.txt"


def _read_meta(email: str, project_id: str) -> Optional[Dict[str, Any]]:
    path = _meta_path(email, project_id)
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _write_meta(email: str, meta: Dict[str, Any]) -> None:
    _user_dir(email).mkdir(parents=True, exist_ok=True)
    _meta_path(email, meta["id"]).write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")


def list_projects(email: str) -> List[Dict[str, Any]]:
    folder = _user_dir(email)
    if not folder.exists():
        return []
    items = []
    for path in folder.glob("*.json"):
        try:
            items.append(json.loads(path.read_text(encoding="utf-8")))
        except ValueError:
            continue
    return sorted(items, key=lambda m: m.get("createdAt", ""), reverse=True)


def create_project(email: str, name: str, description: str) -> Dict[str, Any]:
    meta = {
        "id": secrets.token_hex(6),
        "name": name[:80],
        "description": description[:300],
        "instructions": "",
        "files": [],
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    _write_meta(email, meta)
    return meta


def update_project(email: str, project_id: str, patch: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    meta = _read_meta(email, project_id)
    if meta is None:
        return None
    if "name" in patch and str(patch["name"]).strip():
        meta["name"] = str(patch["name"]).strip()[:80]
    if "description" in patch:
        meta["description"] = str(patch["description"] or "")[:300]
    if "instructions" in patch:
        meta["instructions"] = str(patch["instructions"] or "")[:MAX_INSTRUCTIONS]
    _write_meta(email, meta)
    return meta


def delete_project(email: str, project_id: str) -> bool:
    import shutil

    meta_path = _meta_path(email, project_id)
    if not meta_path.exists():
        return False
    meta_path.unlink()
    shutil.rmtree(_user_dir(email) / project_id, ignore_errors=True)
    return True


def add_file(email: str, project_id: str, name: str, text: str) -> Optional[Dict[str, Any]]:
    meta = _read_meta(email, project_id)
    if meta is None:
        return None
    if len(meta["files"]) >= MAX_FILES_PER_PROJECT:
        raise ValueError(f"한 프로젝트에는 최대 {MAX_FILES_PER_PROJECT}개 파일까지 넣을 수 있습니다.")
    text = text[:MAX_FILE_TEXT]
    file_id = secrets.token_hex(5)
    path = _text_path(email, project_id, file_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    entry = {"id": file_id, "name": name[:200], "chars": len(text), "addedAt": time.strftime("%Y-%m-%dT%H:%M:%S")}
    meta["files"].append(entry)
    _write_meta(email, meta)
    return entry


def remove_file(email: str, project_id: str, file_id: str) -> bool:
    meta = _read_meta(email, project_id)
    if meta is None:
        return False
    before = len(meta["files"])
    meta["files"] = [f for f in meta["files"] if f["id"] != file_id]
    if len(meta["files"]) == before:
        return False
    _text_path(email, project_id, file_id).unlink(missing_ok=True)
    _write_meta(email, meta)
    return True


def _chunks(text: str) -> List[str]:
    out, start = [], 0
    while start < len(text):
        out.append(text[start:start + CHUNK_SIZE])
        if start + CHUNK_SIZE >= len(text):
            break
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return out


def _select_relevant(pieces: List[Dict[str, Any]], query: str, budget: int) -> List[Dict[str, Any]]:
    """질문과 가장 비슷한 조각을 예산 안에서 고른다. 글자 n-gram TF-IDF 코사인 유사도를 쓴다."""
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity

    docs = [p["text"] for p in pieces] + [query or " "]
    vectorizer = TfidfVectorizer(analyzer="char_wb", ngram_range=(2, 4), sublinear_tf=True)
    matrix = vectorizer.fit_transform(docs)
    scores = cosine_similarity(matrix[-1], matrix[:-1]).ravel()
    order = sorted(range(len(pieces)), key=lambda i: scores[i], reverse=True)
    chosen, used = [], 0
    for i in order:
        size = len(pieces[i]["text"])
        if used + size > budget:
            continue
        chosen.append(pieces[i])
        used += size
        if used >= budget - 200:
            break
    # 읽기 좋게 원래 파일 순서와 조각 순서로 정렬한다
    chosen.sort(key=lambda p: (p["file_index"], p["chunk_index"]))
    return chosen


def build_context(email: str, project_id: str, query: str, budget: int = CONTEXT_BUDGET) -> str:
    """대화에 넣을 프로젝트 지침과 자료 글을 만든다. 없으면 빈 문자열."""
    meta = _read_meta(email, project_id)
    if meta is None:
        return ""
    parts: List[str] = []
    if meta.get("instructions", "").strip():
        parts.append(f"[프로젝트 지침: {meta['name']}]\n{meta['instructions'].strip()}")
    files = meta.get("files", [])
    if not files:
        return "\n\n".join(parts)

    texts = []
    for index, entry in enumerate(files):
        path = _text_path(email, project_id, entry["id"])
        texts.append((index, entry, path.read_text(encoding="utf-8") if path.exists() else ""))

    total = sum(len(t) for _, _, t in texts)
    if total <= budget:
        # Claude 방식: 자료가 작으면 전부 넣는다
        body = "\n\n".join(f"--- {entry['name']} ---\n{text}" for _, entry, text in texts)
        parts.append(f"[프로젝트 자료: {meta['name']}]\n{body}")
        return "\n\n".join(parts)

    # ChatGPT 방식: 자료가 크면 질문과 관련된 조각만 넣는다
    pieces = []
    for index, entry, text in texts:
        for c, chunk in enumerate(_chunks(text)):
            pieces.append({"file_index": index, "chunk_index": c, "name": entry["name"], "text": chunk})
    chosen = _select_relevant(pieces, query, budget) if pieces else []
    lines = [f"[프로젝트 자료 발췌: {meta['name']} · 전체 {len(files)}개 파일 중 질문과 관련된 부분]"]
    for piece in chosen:
        lines.append(f"--- {piece['name']} (조각 {piece['chunk_index'] + 1}) ---\n{piece['text']}")
    parts.append("\n\n".join(lines))
    return "\n\n".join(parts)
