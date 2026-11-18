"""Prism 기능 호출 모음. API 키(/v1/prism)와 콘솔 로그인(/api/console/prism)이 같은 함수를 쓴다.

지원 기능
- documents      : 보고서·메모·제안서·요약문·이메일 작성 (LLM)
- presentations  : 주제로 발표 구성(슬라이드 목록) 작성 (LLM)
- images         : 이미지 생성 (image_generator)
- descriptive    : 기술통계 (prism_statistics_layer)
- correlation    : 변수 간 상관 분석 (prism_statistics_layer)

입력 오류는 ValueError, 외부 모델 호출 실패는 RuntimeError로 올린다. 키·원본 응답은 오류 메시지에 넣지 않는다.
"""

from typing import Any, Dict, List

MAX_DATA_POINTS = 10_000
MAX_VARIABLES = 20

FEATURES = [
    {"id": "documents", "title": "문서 작성", "desc": "보고서, 메모, 제안서, 요약문, 이메일을 마크다운으로 씁니다.", "requires": "llm"},
    {"id": "presentations", "title": "발표 자료 구성", "desc": "주제로 슬라이드 제목, 내용, 발표자 메모를 만듭니다.", "requires": "llm"},
    {"id": "images", "title": "이미지 생성", "desc": "텍스트 설명으로 이미지를 만듭니다.", "requires": "image"},
    {"id": "descriptive", "title": "기술통계", "desc": "숫자 목록의 평균, 중앙값, 분산, 분위수 등을 계산합니다.", "requires": "stats"},
    {"id": "correlation", "title": "상관 분석", "desc": "여러 변수 사이의 상관계수를 계산합니다.", "requires": "stats"},
]
DOC_TYPES = {"report": "보고서", "memo": "메모", "proposal": "제안서", "summary": "요약문", "email": "이메일"}


def _numbers(values: Any, name: str) -> List[float]:
    if not isinstance(values, list) or not values:
        raise ValueError(f"{name}은(는) 숫자 목록이어야 합니다.")
    if len(values) > MAX_DATA_POINTS:
        raise ValueError(f"데이터는 최대 {MAX_DATA_POINTS}개까지 보낼 수 있습니다.")
    try:
        return [float(v) for v in values]
    except (TypeError, ValueError):
        raise ValueError(f"{name}에 숫자가 아닌 값이 있습니다.")


def run_document(params: Dict[str, Any]) -> Dict[str, Any]:
    from src.api.ai_routes import _ask  # 토큰 사용량은 _ask가 장부에 기록한다
    content_type = params.get("content_type", "report")
    if content_type not in DOC_TYPES:
        raise ValueError("지원하지 않는 문서 종류입니다: " + ", ".join(DOC_TYPES))
    prompt = str(params.get("prompt", "")).strip()
    if not prompt:
        raise ValueError("요청 내용을 입력해 주세요.")
    language = "en" if params.get("language") == "en" else "ko"
    title = str(params.get("title", "")).strip()[:120]
    system = (f"너는 전문 문서 작성자다. {DOC_TYPES[content_type]}를 마크다운으로 쓴다. "
              "제목은 #, 소제목은 ##으로 구분하고, 근거 없는 수치는 쓰지 않는다. "
              f"{'English' if language == 'en' else '한국어'}로 쓴다.")
    content, tokens = _ask(system, f"제목: {title}\n요청: {prompt}")
    return {"title": title, "content": content, "format": "markdown", "language": language,
            "type": content_type, "tokens_used": tokens}


def run_presentation(params: Dict[str, Any]) -> Dict[str, Any]:
    import json
    from src.api.ai_routes import _ask
    topic = str(params.get("topic", "")).strip()
    if not topic:
        raise ValueError("발표 주제를 입력해 주세요.")
    try:
        count = int(params.get("num_slides", 6))
    except (TypeError, ValueError):
        raise ValueError("슬라이드 수는 숫자여야 합니다.")
    count = max(3, min(count, 15))
    language = "en" if params.get("language") == "en" else "ko"
    title = str(params.get("title", "")).strip()[:120]
    system = ('발표 자료를 JSON으로만 쓴다. 형식: {"slides": [{"title": "슬라이드 제목", "content": "핵심 내용 3문장 이내", '
              '"speaker_notes": "발표자 메모"}]}. ' f"슬라이드는 {count}장이다. "
              f"{'English' if language == 'en' else '한국어'}로 쓴다.")
    raw, tokens = _ask(system, f"제목: {title}\n주제: {topic}", json_mode=True, tokens=3000)
    try:
        slides_in = json.loads(raw).get("slides", [])
    except (ValueError, AttributeError):
        raise RuntimeError("발표 구성을 만들지 못했습니다. 주제를 더 구체적으로 적어 주세요.")
    slides = [{"slide_num": i, "title": str(s.get("title", ""))[:120], "content": str(s.get("content", ""))[:800],
               "speaker_notes": str(s.get("speaker_notes", ""))[:800]}
              for i, s in enumerate(slides_in[:count], start=1) if isinstance(s, dict)]
    if not slides:
        raise RuntimeError("슬라이드를 만들지 못했습니다.")
    return {"title": title, "slides": slides, "num_slides": len(slides), "language": language, "tokens_used": tokens}


def run_image(params: Dict[str, Any]) -> Dict[str, Any]:
    from src.core.image_generator import image_generator
    prompt = str(params.get("prompt", "")).strip()
    if not prompt:
        raise ValueError("이미지 설명을 입력해 주세요.")
    if len(prompt) > 1000:
        raise ValueError("이미지 설명은 1000자 이하로 써 주세요.")
    result = image_generator.generate_image(
        prompt,
        str(params.get("model", "dalle")),
        str(params.get("quality", "hd")),
        str(params.get("style", "vibrant")),
        str(params.get("size", "1024x1024")),
    )
    if result.get("status") != "success":
        raise RuntimeError(result.get("message") or "이미지 생성에 실패했습니다.")
    return result


def run_descriptive(params: Dict[str, Any]) -> Dict[str, Any]:
    from src.core.prism_statistics_layer import prism_statistics_layer
    if prism_statistics_layer is None:
        raise RuntimeError("통계 레이어가 로드되지 않았습니다.")
    return prism_statistics_layer.descriptive_statistics(_numbers(params.get("data"), "data"))


def run_correlation(params: Dict[str, Any]) -> Dict[str, Any]:
    from src.core.prism_statistics_layer import prism_statistics_layer
    if prism_statistics_layer is None:
        raise RuntimeError("통계 레이어가 로드되지 않았습니다.")
    variables = params.get("variables")
    if not isinstance(variables, dict) or len(variables) < 2:
        raise ValueError("variables는 변수 이름과 숫자 목록의 객체이며, 변수가 2개 이상이어야 합니다.")
    if len(variables) > MAX_VARIABLES:
        raise ValueError(f"변수는 최대 {MAX_VARIABLES}개까지 보낼 수 있습니다.")
    cleaned = {str(k)[:60]: _numbers(v, str(k)) for k, v in variables.items()}
    lengths = {len(v) for v in cleaned.values()}
    if len(lengths) != 1:
        raise ValueError("모든 변수는 같은 개수의 값을 가져야 합니다.")
    return prism_statistics_layer.correlation_analysis(cleaned)


RUNNERS = {
    "documents": run_document,
    "presentations": run_presentation,
    "images": run_image,
    "descriptive": run_descriptive,
    "correlation": run_correlation,
}


def run(feature: str, params: Dict[str, Any]) -> Dict[str, Any]:
    if feature not in RUNNERS:
        raise ValueError("지원하지 않는 기능입니다: " + feature)
    if not isinstance(params, dict):
        raise ValueError("params는 객체여야 합니다.")
    return RUNNERS[feature](params)
