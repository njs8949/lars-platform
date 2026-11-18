"""발표 자료 개요 생성과 장표 구조 정리. 생성 API와 편집기가 함께 쓴다."""

import json
import os
from typing import Any, Dict, Iterator, List, Optional

import requests

from src.core import usage_ledger
from src.core.llm_provider import bedrock_complete, bedrock_model_name, bedrock_stream, is_production

OLLAMA_URL = "http://localhost:11434/api/chat"
OLLAMA_MODEL = os.getenv("ASSISTANT_OLLAMA_MODEL", "gemma4:31b")
ALLOWED_LAYOUTS = ("title", "table_of_contents", "section", "content", "stats", "steps", "columns", "table", "conclusion")


def outline_system_prompt(slide_count: int) -> str:
    system = ("너는 실무용 발표 자료 작성자다. 주제에 맞는 한국어 발표 개요를 JSON 하나로만 쓴다. 형식: "
              '{"title": "제목", "subtitle": "부제", "sections": ["목차 항목", ...], '
              '"content": [ 슬라이드 목록 ], "conclusion": ["결론 문장", ...], "call_to_action": "마무리 행동 문장"}. '
              "content의 각 슬라이드는 layout으로 형태를 고른다. 같은 형태만 반복하지 말고 내용에 맞게 섞는다:\n"
              '- "bullets": {"title", "bullets": [짧은 문장 3~5개]}\n'
              '- "stats": {"title", "stats": [{"value": "숫자나 짧은 값", "label": "설명"}]}  (2~4개, 근거 있는 값만)\n'
              '- "steps": {"title", "steps": [{"title": "단계 이름", "text": "한 문장 설명"}]}  (3~5단계, 순서가 있는 내용)\n'
              '- "columns": {"title", "columns": [{"heading": "항목", "bullets": [..3개 이하]}]}  (2개 비교)\n'
              '- "table": {"title", "table": {"header": [..], "rows": [[..], ..]}}  (3~5행 비교표)\n'
              f"content는 정확히 {slide_count - 3}개 슬라이드로 쓴다. 한 슬라이드에는 한 가지 메시지만 담고, 문장은 짧게 쓴다. "
              "각 슬라이드에 발표자가 말할 내용을 notes에 한두 문장 쓴다. "
              "추측한 수치는 쓰지 말고, 근거가 없으면 stats나 table을 쓰지 말고 bullets로 쓴다.")
    return system


def llm_json(system: str, user: str, max_tokens: int = 8000) -> str:
    """운영은 Bedrock, 개발은 로컬 모델로 JSON 한 개를 받는다."""
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    if is_production():
        return bedrock_complete(messages, max_tokens)[0].strip()
    response = requests.post(OLLAMA_URL, timeout=600, json={
        "model": OLLAMA_MODEL, "think": False, "stream": False, "format": "json", "messages": messages,
        "options": {"temperature": 0.4, "num_predict": max_tokens}})
    response.raise_for_status()
    return (response.json().get("message", {}).get("content") or "").strip()


def slide_from_outline(c: dict) -> dict:
    """모델이 쓴 슬라이드 한 장을 작성기가 아는 장표 구조로 바꾼다. 형태가 틀리면 글머리 기호 장으로 대신한다."""
    title = str(c.get("title", ""))[:120]
    notes = str(c.get("notes", ""))[:400]
    layout = str(c.get("layout", "bullets"))
    if layout == "stats":
        stats = [{"value": str(x.get("value", ""))[:20], "label": str(x.get("label", ""))[:80]}
                 for x in c.get("stats", []) if isinstance(x, dict)][:4]
        if stats:
            return {"layout": "stats", "title": title, "stats": stats, "notes": notes}
    if layout == "steps":
        steps = [{"title": str(x.get("title", ""))[:30], "text": str(x.get("text", ""))[:120]}
                 for x in c.get("steps", []) if isinstance(x, dict)][:5]
        if len(steps) >= 2:
            return {"layout": "steps", "title": title, "steps": steps, "notes": notes}
    if layout == "columns":
        cols = [{"heading": str(x.get("heading", ""))[:40], "bullets": [str(b)[:200] for b in x.get("bullets", [])][:5]}
                for x in c.get("columns", []) if isinstance(x, dict)][:2]
        if len(cols) == 2:
            return {"layout": "columns", "title": title, "columns": cols, "notes": notes}
    if layout == "table":
        table = c.get("table") if isinstance(c.get("table"), dict) else {}
        header = [str(h)[:30] for h in table.get("header", [])][:5]
        rows = [[str(v)[:60] for v in r] for r in table.get("rows", []) if isinstance(r, list)][:6]
        if header and rows:
            return {"layout": "table", "title": title, "table": {"header": header, "rows": rows}, "notes": notes}
    return {"layout": "content", "title": title,
            "bullets": [str(b)[:200] for b in c.get("bullets", [])][:5], "notes": notes}


def assemble_deck(outline: Dict[str, Any], target: int, topic: str) -> Dict[str, Any]:
    """개요 JSON 하나를 장표 목록으로 바꾼다. 스트림 생성과 일반 생성이 같이 쓴다."""
    content = [c for c in outline.get("content", []) if isinstance(c, dict) and c.get("title")][:target]
    if not content:
        raise ValueError("슬라이드 내용이 비어 있습니다. 주제를 더 구체적으로 적어 주세요.")
    title = str(outline.get("title") or topic)[:120]
    sections = [str(x) for x in (outline.get("sections") or [c["title"] for c in content])][:12]
    slides: List[Dict[str, Any]] = [
        {"layout": "title", "title": title, "subtitle": str(outline.get("subtitle", ""))[:200], "author": ""},
        {"layout": "table_of_contents", "items": sections},
    ]
    slides.extend(slide_from_outline(c) for c in content)
    slides.append({"layout": "conclusion", "key_points": [str(x)[:200] for x in outline.get("conclusion", [])][:3],
                   "call_to_action": str(outline.get("call_to_action", ""))[:200]})
    return {"title": title, "slides": slides}


def generate_outline_slides(topic: str, audience: str, slide_count: int, context: str = "") -> Dict[str, Any]:
    """주제로 개요를 쓰고 편집 가능한 장표 목록을 만든다. 실패하면 ValueError."""
    system = outline_system_prompt(slide_count)
    user = f"주제: {topic}\n청중: {audience}" + (f"\n참고 자료:\n{context}" if context else "")
    target = max(1, slide_count - 3)
    outline = None
    for attempt in range(2):
        try:
            outline = json.loads(llm_json(system, user))
        except (requests.RequestException, ValueError) as err:
            if attempt == 1:
                raise ValueError(f"개요를 만들지 못했습니다: {str(err)[:200]}")
            continue
        content = [c for c in outline.get("content", []) if isinstance(c, dict) and c.get("title")][:target]
        if len(content) >= target:
            break
        # 장수가 모자라면 한 번 더 요청하면서 정확한 장수를 다시 강조한다
        user = user + f"\n\n(중요: 이전 답은 {len(content)}장뿐이었다. 반드시 content를 정확히 {target}개 쓴다.)"
    if not outline:
        raise ValueError("개요를 만들지 못했습니다.")
    return assemble_deck(outline, target, topic)


# ---------- 스트림 생성: 슬라이드가 완성되는 대로 꺼낸다 ----------

def stream_outline_text(system: str, user: str, max_tokens: int = 8000, usage: Optional[dict] = None) -> Iterator[str]:
    """개요 JSON 텍스트를 조각 단위로 낸다. 운영은 Bedrock, 개발은 로컬 모델."""
    messages = [{"role": "system", "content": system}, {"role": "user", "content": user}]
    if is_production():
        yield from bedrock_stream(messages, max_tokens=max_tokens, usage_out=usage if usage is not None else {})
        return
    with requests.post(OLLAMA_URL, timeout=600, stream=True, json={
            "model": OLLAMA_MODEL, "think": False, "stream": True, "format": "json", "messages": messages,
            "options": {"temperature": 0.4, "num_predict": max_tokens}}) as response:
        response.raise_for_status()
        for line in response.iter_lines():
            if not line:
                continue
            obj = json.loads(line)
            piece = (obj.get("message") or {}).get("content", "")
            if piece:
                yield piece
            if obj.get("done") and usage is not None:
                usage["inputTokens"] = obj.get("prompt_eval_count") or 0
                usage["outputTokens"] = obj.get("eval_count") or 0


class ContentStream:
    """스트림으로 들어오는 개요 JSON에서 "content" 배열의 슬라이드를 하나씩 꺼낸다.

    중괄호 깊이와 문자열 상태를 따라가서, 슬라이드 객체 하나가 닫히는 순간 그 객체를 돌려준다.
    """

    def __init__(self) -> None:
        self.text = ""
        self.pos: Optional[int] = None  # content 배열 안에서 읽고 있는 위치
        self.depth = 0
        self.in_str = False
        self.esc = False
        self.start: Optional[int] = None
        self.done = False

    def feed(self, piece: str) -> List[dict]:
        self.text += piece
        out: List[dict] = []
        if self.pos is None:
            key = self.text.find('"content"')
            if key < 0:
                return out
            bracket = self.text.find("[", key)
            if bracket < 0:
                return out
            self.pos = bracket + 1
        i = self.pos
        while i < len(self.text) and not self.done:
            ch = self.text[i]
            if self.in_str:
                if self.esc:
                    self.esc = False
                elif ch == "\\":
                    self.esc = True
                elif ch == '"':
                    self.in_str = False
            elif ch == '"':
                self.in_str = True
            elif ch == "{":
                if self.depth == 0:
                    self.start = i
                self.depth += 1
            elif ch == "}":
                self.depth -= 1
                if self.depth == 0 and self.start is not None:
                    try:
                        obj = json.loads(self.text[self.start:i + 1])
                        if isinstance(obj, dict) and obj.get("title"):
                            out.append(obj)
                    except ValueError:
                        pass
                    self.start = None
            elif ch == "]" and self.depth == 0:
                self.done = True
            i += 1
        self.pos = i
        return out


def stream_deck(topic: str, audience: str, slide_count: int, context: str = "") -> Iterator[dict]:
    """개요를 스트림으로 쓰면서 슬라이드가 완성될 때마다 이벤트를 낸다.

    이벤트: status, title, slide(index/total/slide). 마지막에 built(장표 목록 전체)를 낸다.
    결과가 온전하지 않으면 일반 생성으로 다시 만든다. 실패하면 ValueError.
    """
    import re as _re

    target = max(1, slide_count - 3)
    system = outline_system_prompt(slide_count)
    user = f"주제: {topic}\n청중: {audience}" + (f"\n참고 자료:\n{context}" if context else "")
    usage: dict = {}
    parser = ContentStream()
    parts: List[str] = []
    count = 0
    title_sent = False
    yield {"type": "status", "message": "개요를 쓰는 중"}
    try:
        for piece in stream_outline_text(system, user, usage=usage):
            parts.append(piece)
            if not title_sent:
                m = _re.search(r'"title"\s*:\s*"((?:[^"\\]|\\.)*)"', "".join(parts))
                if m:
                    title_sent = True
                    yield {"type": "title", "title": json.loads('"' + m.group(1) + '"')}
            for obj in parser.feed(piece):
                if count >= target:
                    break
                count += 1
                yield {"type": "slide", "index": count, "total": target, "slide": slide_from_outline(obj)}
    except (requests.RequestException, ValueError) as err:
        raise ValueError(f"개요를 만들지 못했습니다: {str(err)[:200]}")
    if usage.get("inputTokens") or usage.get("outputTokens"):
        if is_production():
            usage_ledger.record("bedrock", bedrock_model_name(), "deck", int(usage.get("inputTokens") or 0), int(usage.get("outputTokens") or 0), True)
        else:
            usage_ledger.record("ollama", OLLAMA_MODEL, "deck", int(usage.get("inputTokens") or 0), int(usage.get("outputTokens") or 0), True)
    try:
        built = assemble_deck(json.loads("".join(parts)), target, topic)
    except ValueError:
        built = generate_outline_slides(topic, audience, slide_count, context)
    yield {"type": "built", "built": built}


def _text(value: Any, limit: int) -> str:
    return str(value if value is not None else "")[:limit]


def _strings(values: Any, limit: int, count: int) -> List[str]:
    if not isinstance(values, list):
        return []
    return [_text(v, limit) for v in values][:count]


def sanitize_slide(raw: Any) -> Dict[str, Any] | None:
    """편집기에서 온 장표 한 장을 저장 가능한 모양으로 정리한다. 알 수 없는 레이아웃은 본문 장으로 바꾼다."""
    if not isinstance(raw, dict):
        return None
    layout = str(raw.get("layout", "content"))
    if layout not in ALLOWED_LAYOUTS:
        layout = "content"
    notes = _text(raw.get("notes"), 800)
    if layout == "title":
        out = {"title": _text(raw.get("title"), 120), "subtitle": _text(raw.get("subtitle"), 200), "author": _text(raw.get("author"), 120)}
    elif layout == "table_of_contents":
        out = {"items": _strings(raw.get("items"), 80, 12)}
    elif layout == "section":
        out = {"number": _text(raw.get("number"), 4), "title": _text(raw.get("title"), 120)}
    elif layout == "stats":
        stats = [{"value": _text(x.get("value"), 20), "label": _text(x.get("label"), 80)} for x in raw.get("stats", []) if isinstance(x, dict)][:4]
        out = {"title": _text(raw.get("title"), 120), "stats": stats}
    elif layout == "steps":
        steps = [{"title": _text(x.get("title"), 30), "text": _text(x.get("text"), 120)} for x in raw.get("steps", []) if isinstance(x, dict)][:5]
        out = {"title": _text(raw.get("title"), 120), "steps": steps}
    elif layout == "columns":
        cols = [{"heading": _text(x.get("heading"), 40), "bullets": _strings(x.get("bullets"), 200, 5)} for x in raw.get("columns", []) if isinstance(x, dict)][:2]
        out = {"title": _text(raw.get("title"), 120), "columns": cols}
    elif layout == "table":
        table = raw.get("table") if isinstance(raw.get("table"), dict) else {}
        rows = [[_text(v, 60) for v in r] for r in table.get("rows", []) if isinstance(r, list)][:8]
        out = {"title": _text(raw.get("title"), 120), "table": {"header": _strings(table.get("header"), 30, 5), "rows": rows}}
    elif layout == "conclusion":
        out = {"key_points": _strings(raw.get("key_points"), 200, 3), "call_to_action": _text(raw.get("call_to_action"), 200)}
    else:
        out = {"title": _text(raw.get("title"), 120), "body": _text(raw.get("body") or raw.get("content"), 300),
               "bullets": _strings(raw.get("bullets"), 200, 6)}
    out["layout"] = layout
    if notes:
        out["notes"] = notes
    return out


DESIGN_SYSTEM = (
    "너는 발표 자료 디자이너다. 사용자의 수정 요청을 반영해 결과를 JSON 하나로만 쓴다. 형식: "
    '{"summary": "무엇을 바꿨는지 한 문장", '
    '"theme": {"preset": "corporate|midnight|warm|minimal", "font": "글꼴 이름 또는 생략", '
    '"overrides": {"primary": "#RRGGBB", "accent": "#RRGGBB", "bg": "#RRGGBB", "ink": "#RRGGBB"}}, '
    '"slides": [전체 슬라이드 목록]}. '
    "슬라이드의 layout은 title, table_of_contents, section, content, stats, steps, columns, table, conclusion 중 하나다. "
    "사실과 수치는 바꾸지 않는다. 디자인 요청(색, 글꼴, 순서, 형태, 문장 길이)만 반영한다. "
    "요청이 테마와 무관하면 theme은 생략한다."
)


def design_edit(deck: Dict[str, Any], instruction: str) -> Dict[str, Any]:
    """자연어 수정 요청을 받아 테마와 장표 목록을 고친 결과를 돌려준다. 실패하면 ValueError."""
    current = json.dumps({"theme": deck.get("theme", {}), "slides": deck.get("slides", [])}, ensure_ascii=False)[:14000]
    user = f"요청: {instruction.strip()[:800]}\n\n현재 발표 자료:\n{current}"
    try:
        result = json.loads(llm_json(DESIGN_SYSTEM, user, 8000))
    except (requests.RequestException, ValueError) as err:
        raise ValueError(f"수정 결과를 만들지 못했습니다: {str(err)[:200]}")
    slides = [s for s in (sanitize_slide(x) for x in result.get("slides", [])) if s]
    if not slides:
        raise ValueError("수정된 장표가 비어 있어 적용하지 않았습니다.")
    return {"summary": _text(result.get("summary"), 200), "theme": result.get("theme") if isinstance(result.get("theme"), dict) else None,
            "slides": slides}
