"""Field schema, text normalization, and validation (including a grounding check).

Every extracted value must come with an `evidence` quote that appears verbatim in
the document. A value whose evidence is missing from the text is treated as a
hallucination and removed.
"""
import re
from datetime import date

FIELDS = {
    "effective_date": {"type": "date"},
    "term_months": {"type": "int", "min": 1, "max": 120},
    "auto_renewal": {"type": "bool"},
    "payment_terms_days": {"type": "int", "min": 0, "max": 180},
    "termination_notice_days": {"type": "int", "min": 0, "max": 365},
    "governing_law": {"type": "str"},
    "liability_cap_usd": {"type": "int", "min": 1, "max": 10**12},
}

_FOOTER = re.compile(r"^\s*page \d+ of \d+.*$", re.I | re.M)


def normalize(text):
    """Drop page footers, join wrapped lines, collapse whitespace."""
    text = _FOOTER.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def _fold(text):
    return re.sub(r"\s+", " ", text).strip().lower()


def _check_type(name, spec, value):
    kind = spec["type"]
    if kind == "bool":
        return isinstance(value, bool), "expected true or false"
    if kind == "int":
        if isinstance(value, bool) or not isinstance(value, int):
            return False, "expected an integer"
        if not spec["min"] <= value <= spec["max"]:
            return False, f"out of range {spec['min']}..{spec['max']}"
        return True, ""
    if kind == "date":
        try:
            date.fromisoformat(str(value))
            return isinstance(value, str), "expected an ISO date string"
        except ValueError:
            return False, "expected an ISO date (YYYY-MM-DD)"
    if kind == "str":
        return isinstance(value, str) and 0 < len(value.strip()) <= 80, "expected a short non-empty string"
    return False, "unknown type"


def validate(raw, text):
    """Returns {'record': {field: value|None}, 'fields': {field: detail}, 'issues': [str]}."""
    haystack = _fold(normalize(text))
    record, fields, issues = {}, {}, []
    for name in raw:
        if name not in FIELDS:
            issues.append(f"{name}: unknown field dropped")
    for name, spec in FIELDS.items():
        item = raw.get(name)
        value = item.get("value") if isinstance(item, dict) else None
        evidence = item.get("evidence") if isinstance(item, dict) else None
        status, problem = "ok", ""
        if value is None:
            status = "missing"
        else:
            valid, problem = _check_type(name, spec, value)
            problem = "" if valid else problem
            if not valid:
                status, value = "invalid", None
            elif not evidence or _fold(str(evidence)) not in haystack:
                status, problem, value = "ungrounded", "evidence quote not found in document", None
        if status in {"invalid", "ungrounded"}:
            issues.append(f"{name}: {problem}")
        record[name] = value
        fields[name] = {"value": value, "evidence": evidence if value is not None else None, "status": status, "problem": problem}
    return {"record": record, "fields": fields, "issues": issues}
