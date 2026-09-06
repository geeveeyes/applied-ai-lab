DEFAULT_RESPONSE = {
    "summary": "",
    "priorities": [],
    "risks": [],
    "next_actions": [],
    "questions": [],
    "confidence": 0.0,
    "tool_results": {},
}


def normalize_response(data):
    result = dict(DEFAULT_RESPONSE)
    if isinstance(data, dict):
        result.update({key: data.get(key, result[key]) for key in result})

    result["summary"] = str(result["summary"] or "No summary returned.")
    result["priorities"] = _list_of_dicts(result["priorities"], ["title", "why", "score"])
    result["risks"] = _list_of_dicts(result["risks"], ["risk", "mitigation"])
    result["next_actions"] = _list_of_dicts(result["next_actions"], ["action", "timebox"])
    result["questions"] = [str(item) for item in _as_list(result["questions"])]

    try:
        result["confidence"] = max(0.0, min(1.0, float(result["confidence"])))
    except (TypeError, ValueError):
        result["confidence"] = 0.5

    if not isinstance(result["tool_results"], dict):
        result["tool_results"] = {}

    return result


def response_schema_text():
    return """
Return exactly one JSON object with this shape:
{
  "summary": "short executive summary",
  "priorities": [
    {"title": "priority title", "why": "why this matters", "score": 1}
  ],
  "risks": [
    {"risk": "risk description", "mitigation": "mitigation"}
  ],
  "next_actions": [
    {"action": "specific next action", "timebox": "time estimate"}
  ],
  "questions": ["important question to answer"],
  "confidence": 0.0,
  "tool_results": {}
}
Do not include markdown fences or commentary outside the JSON.
"""


def _as_list(value):
    if isinstance(value, list):
        return value
    if value in (None, ""):
        return []
    return [value]


def _list_of_dicts(value, keys):
    rows = []
    for item in _as_list(value):
        if isinstance(item, dict):
            rows.append({key: item.get(key, "") for key in keys})
        else:
            rows.append({key: str(item) if index == 0 else "" for index, key in enumerate(keys)})
    return rows
