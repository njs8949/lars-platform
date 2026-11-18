import json
from pathlib import Path

import pytest

from src.core import labeling
from src.core.labeling import Item, aggregate, export_dataset, evaluate_against_gold, label_items, parse_vote, pending_reviews, save_human_label, stats


class SeqLLM:
    """항목별로 정해진 투표 시퀀스를 돌려준다 (text 기준)."""

    provider = "test"

    def __init__(self, scripts):
        self.scripts = scripts  # text -> list of reply strings
        self.calls = {}

    def complete(self, messages, temperature=0.2):
        text = messages[-1]["content"]
        key = next(k for k in self.scripts if k in text)
        index = self.calls.get(key, 0)
        self.calls[key] = index + 1
        return self.scripts[key][index]


def test_parse_vote_json_and_plain_text():
    labels = ["긍정", "부정", "중립"]
    assert parse_vote('{"label": "긍정"}', labels) == "긍정"
    assert parse_vote("답은 부정입니다.", labels) == "부정"
    assert parse_vote('{"label": "모름"}', labels) is None
    assert parse_vote("긍정 또는 부정", labels) is None  # 모호하면 무효


def test_aggregate_majority_and_agreement():
    assert aggregate(["긍정", "긍정", "부정"], 3) == ("긍정", pytest.approx(2 / 3))
    assert aggregate(["긍정", "긍정", "긍정"], 3) == ("긍정", 1.0)
    assert aggregate([None, None, None], 3) == (None, 0.0)


def test_label_items_splits_auto_and_review(tmp_path):
    labels = ["긍정", "부정"]
    llm = SeqLLM({
        "좋아요": ['{"label": "긍정"}', '{"label": "긍정"}', '{"label": "긍정"}'],   # 3/3 자동
        "애매해요": ['{"label": "긍정"}', '{"label": "부정"}', '{"label": "긍정"}'],  # 2/3 기준 자동 (0.67)
        "모르겠어요": ['{"label": "긍정"}', '{"label": "부정"}', '{"label": "중립"}'],  # 실패로 무효 1표 포함, 검수
    })
    items = [Item("1", text="좋아요"), Item("2", text="애매해요"), Item("3", text="모르겠어요")]
    summary = label_items(items, labels, llm, tmp_path, k=3, threshold=0.9)
    assert summary.total == 3
    assert summary.auto == 1
    assert summary.review == 2
    queue = pending_reviews(tmp_path)
    assert [r["id"] for r in queue] == ["2", "3"]


def test_human_review_overrides_ai_on_export(tmp_path):
    labels = ["긍정", "부정"]
    llm = SeqLLM({"나쁨": ['{"label": "긍정"}', '{"label": "부정"}', '{"label": "긍정"}']})
    label_items([Item("a", text="나쁨")], labels, llm, tmp_path, k=3, threshold=0.99)
    assert len(pending_reviews(tmp_path)) == 1
    save_human_label(tmp_path, "a", "부정", labels)
    assert pending_reviews(tmp_path) == []
    dataset = export_dataset(tmp_path)
    rows = [json.loads(line) for line in dataset.read_text(encoding="utf-8").splitlines()]
    assert rows == [rows[0]] and rows[0]["label"] == "부정" and rows[0]["source"] == "human"


def test_human_label_must_be_in_schema(tmp_path):
    with pytest.raises(ValueError):
        save_human_label(tmp_path, "x", "중립", ["긍정", "부정"])


def test_stats_and_gold_evaluation(tmp_path):
    labels = ["긍정", "부정"]
    llm = SeqLLM({
        "A": ['{"label": "긍정"}'] * 3,
        "B": ['{"label": "부정"}'] * 3,
        "C": ['{"label": "긍정"}', '{"label": "부정"}', '{"label": "긍정"}'],
    })
    label_items([Item("1", text="A"), Item("2", text="B"), Item("3", text="C")], labels, llm, tmp_path, k=3, threshold=0.99)
    data = stats(tmp_path)
    assert data["total"] == 3 and data["auto"] == 2 and data["pending_review"] == 1

    gold = tmp_path / "gold.jsonl"
    gold.write_text('{"id": "1", "label": "긍정"}\n{"id": "2", "label": "긍정"}\n{"id": "3", "label": "긍정"}\n', encoding="utf-8")
    result = evaluate_against_gold(tmp_path, gold)
    assert result["compared"] == 3
    assert result["accuracy"] == pytest.approx(2 / 3, abs=1e-3)
    assert result["auto_compared"] == 2 and result["auto_accuracy"] == 0.5


def test_image_items_need_claude_provider(tmp_path):
    img = tmp_path / "pic.png"
    img.write_bytes(b"\x89PNG")

    class OllamaLike:
        provider = "ollama"

        def complete(self, messages, temperature=0.2):
            return "{}"

    summary = label_items([Item("img1", image=str(img))], ["개", "고양이"], OllamaLike(), tmp_path / "out", k=2)
    assert summary.failed == 1 and summary.total == 1


def test_load_items_validates_input(tmp_path):
    good = tmp_path / "ok.jsonl"
    good.write_text('{"id": "1", "text": "안녕"}\n{"id": "2", "image": "a.png"}\n', encoding="utf-8")
    items = labeling.load_items(good)
    assert [i.id for i in items] == ["1", "2"]
    bad = tmp_path / "bad.jsonl"
    bad.write_text('{"id": "1"}\n', encoding="utf-8")
    with pytest.raises(ValueError):
        labeling.load_items(bad)
