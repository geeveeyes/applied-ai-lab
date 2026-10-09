"""Two rule-based extractors.

rules_v1 is a deliberately naive baseline: first regex hit on the raw text.
rules_v2 normalizes the text, reads sentence by sentence using anchor words,
and parses number words, several date formats, and negated renewal clauses.
It is the offline stand-in for a model-based extractor; see README for limits.
"""
import re

from .schema import normalize

MONTHS = {m: i for i, m in enumerate("January February March April May June July August September October November December".split(), 1)}
_UNITS = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12,
          "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19}
_TENS = {"twenty": 20, "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90}
_NUM = r"(?:\d+|[a-z]+(?:-[a-z]+)?)"


def parse_number(token):
    token = token.lower().strip()
    if token.isdigit():
        return int(token)
    if token in _UNITS:
        return _UNITS[token]
    if token in _TENS:
        return _TENS[token]
    if "-" in token:
        tens, _, unit = token.partition("-")
        if tens in _TENS and unit in _UNITS:
            return _TENS[tens] + _UNITS[unit]
    return None


def _item(value, evidence):
    return {"value": value, "evidence": evidence.strip()}


def extract_v1(text):
    out = {}

    def grab(field, pattern, convert=lambda m: m.group(1)):
        match = re.search(pattern, text)
        if match:
            out[field] = _item(convert(match), match.group(0))

    grab("effective_date", r"effective as of ([A-Z][a-z]+ \d{1,2}, \d{4})",
         lambda m: _iso_long(m.group(1)))
    grab("term_months", r"(\d+) months", lambda m: int(m.group(1)))
    grab("payment_terms_days", r"[Nn]et (\d+)", lambda m: int(m.group(1)))
    grab("termination_notice_days", r"(\d+) days'? (?:prior )?written notice", lambda m: int(m.group(1)))
    grab("governing_law", r"laws of the State of ([A-Z][a-z]+(?: [A-Z][a-z]+)?)")
    grab("liability_cap_usd", r"\$([\d,]+)", lambda m: int(m.group(1).replace(",", "")))
    match = re.search(r"automatically renew", text)
    out["auto_renewal"] = _item(bool(match), match.group(0)) if match else {"value": False, "evidence": None}
    return out


def _iso_long(value):
    month, day, year = re.match(r"([A-Z][a-z]+) (\d{1,2}), (\d{4})", value).groups()
    return f"{int(year):04d}-{MONTHS[month]:02d}-{int(day):02d}"


def _sentences(text):
    body = re.sub(r"(?:(?<=\s)|^)\d{1,2}\.\s+(?=[A-Z])", "", text)
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+(?=[A-Z])", body) if s.strip()]


def _date_in(sentence):
    match = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", sentence)
    if match:
        return match.group(0), match.group(0)
    match = re.search(r"\b(" + "|".join(MONTHS) + r") (\d{1,2}), (\d{4})", sentence)
    if match:
        return f"{int(match.group(3)):04d}-{MONTHS[match.group(1)]:02d}-{int(match.group(2)):02d}", match.group(0)
    match = re.search(r"\b(\d{2})/(\d{2})/(\d{4})\b", sentence)
    if match:
        return f"{match.group(3)}-{match.group(1)}-{match.group(2)}", match.group(0)
    match = re.search(r"\b(\d{1,2})(?:st|nd|rd|th) day of (" + "|".join(MONTHS) + r"), (\d{4})", sentence)
    if match:
        return f"{int(match.group(3)):04d}-{MONTHS[match.group(2)]:02d}-{int(match.group(1)):02d}", match.group(0)
    return None


def extract_v2(text):
    out = {}
    for sentence in _sentences(normalize(text)):
        low = sentence.lower()
        if "effective_date" not in out and re.search(r"effective|dated|commences", low) and (found := _date_in(sentence)):
            out["effective_date"] = _item(found[0], found[1])
        if "term_months" not in out and re.search(r"initial term|shall continue|term of this agreement", low):
            m = re.search(rf"({_NUM})(?: \((\d+)\))? (months?|years?)", sentence, re.I)
            if m:
                n = int(m.group(2)) if m.group(2) else parse_number(m.group(1))
                if n is not None:
                    out["term_months"] = _item(n * (12 if m.group(3).lower().startswith("year") else 1), m.group(0))
        if "auto_renewal" not in out and "renew" in low:
            if re.search(r"not renew|only by mutual|expires at the end", low):
                out["auto_renewal"] = _item(False, sentence)
            elif re.search(r"automatically renews?|renews automatically|evergreen", low):
                out["auto_renewal"] = _item(True, sentence)
        if "payment_terms_days" not in out and "invoice" in low and "grace" not in low:
            m = (re.search(r"\bnet (\d+)", sentence, re.I) or re.search(rf"within ({_NUM})(?: \((\d+)\))? days", sentence, re.I)
                 or re.search(r"due (\d+) days after", sentence, re.I))
            if m:
                n = int(m.group(2)) if m.lastindex and m.lastindex >= 2 and m.group(2) else parse_number(m.group(1))
                if n is not None:
                    out["payment_terms_days"] = _item(n, m.group(0))
        if "termination_notice_days" not in out and "terminat" in low and "notice" in low:
            m = re.search(rf"({_NUM})(?: \((\d+)\))? days'? (?:prior )?(?:written )?notice", sentence, re.I)
            if m:
                n = int(m.group(2)) if m.group(2) else parse_number(m.group(1))
                if n is not None:
                    out["termination_notice_days"] = _item(n, m.group(0))
        if "governing_law" not in out:
            m = (re.search(r"laws of the State of ([A-Z][a-z]+(?: [A-Z][a-z]+)?)", sentence) or re.search(r"laws of (England and Wales)", sentence)
                 or re.search(r"in accordance with ([A-Z][a-z]+(?: [A-Z][a-z]+)*) law", sentence))
            if m:
                out["governing_law"] = _item(m.group(1), m.group(0))
        if "liability_cap_usd" not in out and "liability" in low:
            m = re.search(r"(?:\$|USD )([\d,]+)", sentence)
            if m:
                out["liability_cap_usd"] = _item(int(m.group(1).replace(",", "")), m.group(0))
    return out
