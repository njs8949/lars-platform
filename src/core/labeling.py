"""
데이터 라벨링 엔진 (텍스트 · 이미지 · OCR 결과)

방식:
1. 자기 일관성(self-consistency): 항목마다 모델을 여러 번(기본 3회, 온도 > 0) 호출해 다수결로 라벨을 정한다.
2. 불확실성 선별: 일치율이 임계값 미만인 항목만 사람 검수 큐로 보낸다.
3. 최종 데이터셋: 사람이 검수한 라벨이 AI 라벨보다 우선한다.

출력은 .lars/labeling/<데이터셋>/ 아래 JSONL 파일로 남는다.
"""

import json
import re
from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Callable, Dict, Iterable, List, Optional, Tuple

from src.core.code_agent import LLMClient, complete_vision

DEFAULT_VOTES = 3
DEFAULT_THRESHOLD = 0.67
VOTE_TEMPERATURE = 0.8
OUTPUT_ROOT = Path(".lars/labeling")

SYSTEM_TEMPLATE = (
    "주어진 입력에 대해 다음 라벨 중 정확히 하나만 고르세요: {labels}. "
    '응답은 JSON 한 개만 출력하세요. 예: {{"label": "라벨"}}'
)


@dataclass
class Item:
    id: str
    text: Optional[str] = None
    image: Optional[str] = None

    @property
    def preview(self) -> str:
        return (self.text or self.image or "")[:120]


@dataclass
class LabelRecord:
    id: str
    label: Optional[str]
    agreement: float
    votes: List[Optional[str]] = field(default_factory=list)
    source: str = "ai"
    status: str = "auto"
    preview: str = ""


@dataclass
class RunSummary:
    total: int = 0
    auto: int = 0
    review: int = 0
    failed: int = 0


def load_items(path: Path) -> List[Item]:
    items = []
    for line_no, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        data = json.loads(line)
        item_id = str(data.get("id", line_no))
        if not data.get("text") and not data.get("image"):
            raise ValueError(f"{path}:{line_no} 에 text 또는 image가 없습니다.")
        items.append(Item(id=item_id, text=data.get("text"), image=data.get("image")))
    return items


def parse_vote(reply: str, labels: List[str]) -> Optional[str]:
    match = re.search(r"\{.*?\}", reply, re.S)
    if match:
        try:
            value = json.loads(match.group(0)).get("label")
            if value in labels:
                return value
        except (json.JSONDecodeError, AttributeError):
            pass
    hits = [label for label in labels if label and label in reply]
    return max(hits, key=len) if len(hits) == 1 else None


def _messages(labels: List[str], text: str) -> List[dict]:
    return [
        {"role": "system", "content": SYSTEM_TEMPLATE.format(labels=", ".join(labels))},
        {"role": "user", "content": text},
    ]


def vote_text(item: Item, labels: List[str], llm: LLMClient, k: int) -> List[Optional[str]]:
    messages = _messages(labels, f"입력:\n{item.text}")
    return [parse_vote(llm.complete(messages, temperature=VOTE_TEMPERATURE), labels) for _ in range(k)]


def vote_image(item: Item, labels: List[str], llm: LLMClient, k: int) -> List[Optional[str]]:
    prompt = SYSTEM_TEMPLATE.format(labels=", ".join(labels))
    return [parse_vote(complete_vision(llm, prompt, item.image, VOTE_TEMPERATURE), labels) for _ in range(k)]


def aggregate(votes: List[Optional[str]], k: int) -> Tuple[Optional[str], float]:
    counts = Counter(v for v in votes if v)
    if not counts:
        return None, 0.0
    label, n = counts.most_common(1)[0]
    return label, n / k


def label_items(
    items: Iterable[Item],
    labels: List[str],
    llm: LLMClient,
    out_dir: Path,
    k: int = DEFAULT_VOTES,
    threshold: float = DEFAULT_THRESHOLD,
    on_item: Optional[Callable[[Item, LabelRecord], None]] = None,
) -> RunSummary:
    if k < 1:
        raise ValueError("투표 수는 1 이상이어야 합니다.")
    if len(labels) < 2:
        raise ValueError("라벨은 최소 2개 이상이어야 합니다.")

    out_dir.mkdir(parents=True, exist_ok=True)
    summary = RunSummary()
    with (out_dir / "labels.jsonl").open("a", encoding="utf-8") as all_file, \
         (out_dir / "review.jsonl").open("a", encoding="utf-8") as review_file:
        for item in items:
            summary.total += 1
            try:
                votes = vote_image(item, labels, llm, k) if item.image else vote_text(item, labels, llm, k)
            except Exception:
                summary.failed += 1
                continue
            label, agreement = aggregate(votes, k)
            if label is None:
                summary.failed += 1
                continue
            status = "auto" if agreement >= threshold else "review"
            record = LabelRecord(
                id=item.id, label=label, agreement=round(agreement, 3), votes=votes,
                source="ai", status=status, preview=item.preview,
            )
            all_file.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")
            if status == "review":
                review_file.write(json.dumps(asdict(record), ensure_ascii=False) + "\n")
                summary.review += 1
            else:
                summary.auto += 1
            if on_item:
                on_item(item, record)
    return summary


def _read_jsonl(path: Path) -> List[dict]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def pending_reviews(out_dir: Path) -> List[dict]:
    done = {r["id"] for r in _read_jsonl(out_dir / "human.jsonl")}
    return [r for r in _read_jsonl(out_dir / "review.jsonl") if r["id"] not in done]


def save_human_label(out_dir: Path, item_id: str, label: str, labels: List[str]) -> None:
    if label not in labels:
        raise ValueError(f"허용되지 않은 라벨: {label}")
    record = {"id": item_id, "label": label, "agreement": 1.0, "votes": [], "source": "human",
              "status": "reviewed", "preview": ""}
    with (out_dir / "human.jsonl").open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")


def export_dataset(out_dir: Path) -> Path:
    """AI 라벨을 기본으로 하고, 사람 검수 라벨이 있으면 그것을 우선한다."""
    final: Dict[str, dict] = {}
    for record in _read_jsonl(out_dir / "labels.jsonl"):
        final[record["id"]] = record
    for record in _read_jsonl(out_dir / "human.jsonl"):
        final[record["id"]] = record
    path = out_dir / "dataset.jsonl"
    with path.open("w", encoding="utf-8") as f:
        for record in final.values():
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return path


def stats(out_dir: Path) -> dict:
    ai = _read_jsonl(out_dir / "labels.jsonl")
    human = _read_jsonl(out_dir / "human.jsonl")
    total = len(ai)
    auto = sum(1 for r in ai if r["status"] == "auto")
    return {
        "total": total,
        "auto": auto,
        "review_queue": len(_read_jsonl(out_dir / "review.jsonl")),
        "pending_review": len(pending_reviews(out_dir)),
        "human_reviewed": len(human),
        "auto_rate": round(auto / total, 3) if total else 0.0,
    }


def evaluate_against_gold(out_dir: Path, gold_path: Path) -> dict:
    """정답(gold) 라벨과 AI 라벨을 비교해 정확도를 낸다."""
    gold = {str(r["id"]): r["label"] for r in _read_jsonl(gold_path)}
    ai = {r["id"]: r for r in _read_jsonl(out_dir / "labels.jsonl")}
    matched = [i for i in gold if i in ai]
    correct = sum(1 for i in matched if ai[i]["label"] == gold[i])
    auto_ids = [i for i in matched if ai[i]["status"] == "auto"]
    auto_correct = sum(1 for i in auto_ids if ai[i]["label"] == gold[i])
    return {
        "compared": len(matched),
        "accuracy": round(correct / len(matched), 3) if matched else 0.0,
        "auto_compared": len(auto_ids),
        "auto_accuracy": round(auto_correct / len(auto_ids), 3) if auto_ids else 0.0,
    }
