"""워크플로 최적화: 단계와 의존 관계로 실행 순서, 병렬 가능 단계, 임계 경로, 병목을 계산한다.

계산은 모두 결정적(입력이 같으면 결과가 같다)이며, 추측 값을 넣지 않는다. 시간은 입력한 값을 그대로 쓴다.
"""

from collections import defaultdict, deque
from typing import Any, Dict, List


def optimize(steps: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not steps:
        raise ValueError("단계를 하나 이상 입력해 주세요.")
    if len(steps) > 200:
        raise ValueError("단계는 200개까지 분석할 수 있습니다.")
    by_id: Dict[str, Dict[str, Any]] = {}
    for s in steps:
        sid = str(s.get("id", "")).strip()
        if not sid:
            raise ValueError("모든 단계에 id가 필요합니다.")
        if sid in by_id:
            raise ValueError(f"단계 id가 중복되었습니다: {sid}")
        try:
            minutes = float(s.get("minutes", 0))
        except (TypeError, ValueError):
            raise ValueError(f"{sid}: 소요 시간은 숫자여야 합니다.")
        if minutes < 0:
            raise ValueError(f"{sid}: 소요 시간은 0 이상이어야 합니다.")
        by_id[sid] = {"id": sid, "name": str(s.get("name") or sid), "minutes": minutes,
                      "depends_on": [str(d) for d in (s.get("depends_on") or [])]}

    warnings: List[str] = []
    for node in by_id.values():
        missing = [d for d in node["depends_on"] if d not in by_id]
        if missing:
            raise ValueError(f"{node['id']}: 없는 단계에 의존합니다 ({', '.join(missing)})")

    # 위상 정렬 (순환 검사)
    indegree = {sid: len(n["depends_on"]) for sid, n in by_id.items()}
    children: Dict[str, List[str]] = defaultdict(list)
    for sid, n in by_id.items():
        for d in n["depends_on"]:
            children[d].append(sid)
    queue = deque(sorted(sid for sid, deg in indegree.items() if deg == 0))
    order: List[str] = []
    level: Dict[str, int] = {}
    while queue:
        sid = queue.popleft()
        order.append(sid)
        level[sid] = 0 if not by_id[sid]["depends_on"] else max(level[d] for d in by_id[sid]["depends_on"]) + 1
        for c in sorted(children[sid]):
            indegree[c] -= 1
            if indegree[c] == 0:
                queue.append(c)
    if len(order) != len(by_id):
        cyclic = sorted(sid for sid in by_id if sid not in order)
        raise ValueError(f"순환 의존 관계가 있습니다: {', '.join(cyclic)}")

    # 임계 경로: 가장 오래 걸리는 의존 경로
    finish: Dict[str, float] = {}
    best_prev: Dict[str, str] = {}
    for sid in order:
        deps = by_id[sid]["depends_on"]
        start = 0.0
        if deps:
            prev = max(deps, key=lambda d: finish[d])
            start = finish[prev]
            best_prev[sid] = prev
        finish[sid] = start + by_id[sid]["minutes"]
    end = max(order, key=lambda sid: finish[sid])
    critical: List[str] = [end]
    while critical[-1] in best_prev:
        critical.append(best_prev[critical[-1]])
    critical.reverse()

    sequential = sum(n["minutes"] for n in by_id.values())
    optimized = finish[end]
    levels: Dict[int, List[str]] = defaultdict(list)
    for sid in order:
        levels[level[sid]].append(sid)
    parallel_groups = [{"stage": k + 1, "steps": v, "minutes": max(by_id[s]["minutes"] for s in v)}
                       for k, v in sorted(levels.items())]

    bottleneck = max(critical, key=lambda sid: by_id[sid]["minutes"])
    suggestions: List[str] = []
    for group in parallel_groups:
        if len(group["steps"]) > 1:
            suggestions.append(f"{group['stage']}단계의 {', '.join(group['steps'])}은(는) 동시에 실행할 수 있습니다.")
    if sequential and by_id[bottleneck]["minutes"] / sequential >= 0.4 and len(by_id) > 1:
        suggestions.append(f"'{by_id[bottleneck]['name']}'이(가) 전체 시간의 {round(100 * by_id[bottleneck]['minutes'] / sequential)}%를 차지합니다. 이 단계를 나누거나 줄이는 것이 가장 효과적입니다.")
    isolated = [sid for sid in by_id if not by_id[sid]["depends_on"] and sid not in children]
    if len(by_id) > 1 and len(isolated) == len(by_id):
        warnings.append("모든 단계가 서로 연결되어 있지 않습니다. 의존 관계를 확인해 주세요.")

    return {
        "order": order,
        "steps": [{**by_id[sid], "level": level[sid], "finish_minutes": finish[sid]} for sid in order],
        "critical_path": critical,
        "critical_path_minutes": optimized,
        "sequential_minutes": sequential,
        "parallel_groups": parallel_groups,
        "bottleneck": bottleneck,
        "speedup": round(sequential / optimized, 2) if optimized else 1.0,
        "suggestions": suggestions,
        "warnings": warnings,
    }
