SIGNALS = {
    "urgent": 3,
    "this week": 3,
    "decision": 2,
    "career": 2,
    "interview": 2,
    "family": 2,
    "health": 2,
    "money": 2,
    "startup": 1,
    "learning": 1,
    "portfolio": 1,
}


def score_prompt(prompt):
    text = prompt.lower()
    matched = {word: weight for word, weight in SIGNALS.items() if word in text}
    raw_score = sum(matched.values())
    normalized = min(100, 35 + raw_score * 8)

    if normalized >= 75:
        band = "high"
    elif normalized >= 55:
        band = "medium"
    else:
        band = "low"

    return {
        "tool": "priority_scorer",
        "score": normalized,
        "band": band,
        "matched_signals": matched,
        "note": "Deterministic estimate based on urgency, life impact, and portfolio relevance keywords.",
    }
