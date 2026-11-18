"""추천 앱 카탈로그와 예시 앱 실행기.

카탈로그의 앱은 Prism 서버가 직접 실행한다. 설치하면 플러그인 엔진이 같은 서버의 실행 주소를 호출한다.
외부 서비스 키가 필요 없어서 설치 직후 바로 동작한다.
"""

import ast
import datetime as dt
import operator
import os
import re
from typing import Any, Callable, Dict, List

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None

PUBLIC_URL = os.getenv("PRISM_PUBLIC_URL", "https://prism.lars-technologies.com").rstrip("/")
DEFAULT_TZ = "Asia/Seoul"


def _manifest(app_id: str, name: str, description: str, tools: List[dict]) -> dict:
    return {
        "id": app_id,
        "name": name,
        "description": description,
        "version": "1.0.0",
        "endpoint": PUBLIC_URL,
        "auth": {"type": "none"},
        "tools": [
            {**t, "method": "POST", "path": f"/api/plugins/examples/{app_id}/run"} for t in tools
        ],
    }


# ---- 도구 구현 ----

def _current_time(args: Dict[str, Any]) -> Dict[str, Any]:
    tz_name = str(args.get("timezone") or DEFAULT_TZ).strip()
    if ZoneInfo is None:
        raise ValueError("시간대 기능을 쓸 수 없습니다.")
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        raise ValueError(f"알 수 없는 시간대입니다: {tz_name} (예: Asia/Seoul, America/New_York)")
    now = dt.datetime.now(tz)
    return {"timezone": tz_name, "iso": now.isoformat(timespec="seconds"),
            "text": now.strftime("%Y-%m-%d %H:%M (%A)")}


UNIT_GROUPS = {
    "length": {"m": 1.0, "km": 1000.0, "cm": 0.01, "mm": 0.001, "mi": 1609.344, "ft": 0.3048, "in": 0.0254},
    "mass": {"kg": 1.0, "g": 0.001, "lb": 0.45359237, "oz": 0.028349523125},
}
TEMP_UNITS = {"c", "f", "k"}


def _convert(args: Dict[str, Any]) -> Dict[str, Any]:
    try:
        value = float(args.get("value"))
    except (TypeError, ValueError):
        raise ValueError("값은 숫자로 입력해 주세요.")
    src = str(args.get("from_unit") or "").strip().lower()
    dst = str(args.get("to_unit") or "").strip().lower()
    if src in TEMP_UNITS and dst in TEMP_UNITS:
        to_c = {"c": lambda v: v, "f": lambda v: (v - 32) * 5 / 9, "k": lambda v: v - 273.15}
        from_c = {"c": lambda v: v, "f": lambda v: v * 9 / 5 + 32, "k": lambda v: v + 273.15}
        result = from_c[dst](to_c[src](value))
    else:
        for group in UNIT_GROUPS.values():
            if src in group and dst in group:
                result = value * group[src] / group[dst]
                break
        else:
            raise ValueError("같은 종류의 단위끼리만 바꿀 수 있습니다 (길이: m, km, cm, mm, mi, ft, in / 무게: kg, g, lb, oz / 온도: c, f, k).")
    return {"value": value, "from_unit": src, "to_unit": dst, "result": round(result, 6)}


_OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
        ast.Pow: operator.pow, ast.Mod: operator.mod, ast.USub: operator.neg, ast.UAdd: operator.pos}


def _eval_node(node: ast.AST, depth: int = 0) -> float:
    if depth > 60:
        raise ValueError("식이 너무 깁니다.")
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, depth + 1)
    if isinstance(node, ast.Constant) and isinstance(node.value, (int, float)) and not isinstance(node.value, bool):
        return float(node.value)
    if isinstance(node, ast.BinOp) and type(node.op) in _OPS:
        left, right = _eval_node(node.left, depth + 1), _eval_node(node.right, depth + 1)
        if isinstance(node.op, ast.Pow) and abs(right) > 100:
            raise ValueError("거듭제곱 지수가 너무 큽니다.")
        return _OPS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _OPS:
        return _OPS[type(node.op)](_eval_node(node.operand, depth + 1))
    raise ValueError("사칙연산과 거듭제곱, 괄호만 계산할 수 있습니다.")


def _calc(args: Dict[str, Any]) -> Dict[str, Any]:
    expr = str(args.get("expression") or "").strip()
    if not expr or len(expr) > 200 or not re.match(r"^[0-9+\-*/%.()\s]+$", expr.replace("**", "*")):
        raise ValueError("계산식은 숫자와 + - * / % ( ) ** 만 쓸 수 있습니다.")
    try:
        value = _eval_node(ast.parse(expr, mode="eval"))
    except ZeroDivisionError:
        raise ValueError("0으로 나눌 수 없습니다.")
    except SyntaxError:
        raise ValueError("계산식을 읽을 수 없습니다.")
    return {"expression": expr, "result": round(value, 10)}


def _days_until(args: Dict[str, Any]) -> Dict[str, Any]:
    raw = str(args.get("date") or "").strip()
    try:
        target = dt.date.fromisoformat(raw)
    except ValueError:
        raise ValueError("날짜는 YYYY-MM-DD 형식으로 입력해 주세요.")
    today = dt.datetime.now(ZoneInfo(DEFAULT_TZ)).date() if ZoneInfo else dt.date.today()
    days = (target - today).days
    label = "남았습니다" if days > 0 else ("오늘입니다" if days == 0 else "지났습니다")
    return {"date": target.isoformat(), "days": abs(days), "text": f"{target.isoformat()}까지 {abs(days)}일 {label}"}


HANDLERS: Dict[str, Callable[[Dict[str, Any]], Dict[str, Any]]] = {
    "clock": _current_time,
    "units": _convert,
    "calc": _calc,
    "dday": _days_until,
}


# ---- 카탈로그 ----

CATALOG: List[Dict[str, Any]] = [
    {
        "key": "clock", "name": "현재 시각", "category": "유틸리티", "icon": "🕐", "color": "#6366f1",
        "description": "세계 여러 도시의 현재 날짜와 시각을 알려 줍니다.",
        "manifest": _manifest("clock", "현재 시각", "세계 여러 도시의 현재 날짜와 시각을 알려 줍니다.", [
            {"name": "current_time", "description": "지정한 시간대의 현재 날짜와 시각",
             "parameters": {"timezone": "string"},
             "input_schema": None},
        ]),
    },
    {
        "key": "units", "name": "단위 변환", "category": "유틸리티", "icon": "📏", "color": "#0ea5e9",
        "description": "길이, 무게, 온도 단위를 서로 바꿉니다.",
        "manifest": _manifest("units", "단위 변환", "길이, 무게, 온도 단위를 서로 바꿉니다.", [
            {"name": "convert_units", "description": "값을 다른 단위로 바꿉니다 (길이·무게·온도)",
             "parameters": {"value": "number", "from_unit": "string", "to_unit": "string"},
             "input_schema": None},
        ]),
    },
    {
        "key": "calc", "name": "계산기", "category": "생산성", "icon": "🧮", "color": "#f59e0b",
        "description": "사칙연산, 거듭제곱, 괄호가 있는 식을 계산합니다.",
        "manifest": _manifest("calc", "계산기", "사칙연산, 거듭제곱, 괄호가 있는 식을 계산합니다.", [
            {"name": "calculate", "description": "숫자 계산식의 결과를 구합니다",
             "parameters": {"expression": "string"},
             "input_schema": None},
        ]),
    },
    {
        "key": "dday", "name": "D-day 계산", "category": "생산성", "icon": "📅", "color": "#10b981",
        "description": "특정 날짜까지 남은 날 수를 계산합니다.",
        "manifest": _manifest("dday", "D-day 계산", "특정 날짜까지 남은 날 수를 계산합니다.", [
            {"name": "days_until", "description": "오늘부터 지정한 날짜(YYYY-MM-DD)까지 남은 날 수",
             "parameters": {"date": "string"},
             "input_schema": None},
        ]),
    },
]


def catalog() -> List[Dict[str, Any]]:
    out = []
    for app in CATALOG:
        item = {k: v for k, v in app.items() if k != "manifest"}
        m = dict(app["manifest"])
        m["tools"] = [{k: v for k, v in t.items() if k != "input_schema"} for t in m["tools"]]
        item["manifest"] = m
        out.append(item)
    return out


def run(key: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    handler = HANDLERS.get(key)
    if handler is None:
        raise KeyError(key)
    return handler(arguments or {})
