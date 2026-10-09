"""Tokenization, stemming, and an offline concept lexicon.

The lexicon is a deliberate stand-in for what a trained embedding model learns:
words that mean nearly the same thing should land near each other. It is small
and hand-written, so semantic search here is weaker than a real embedding model.
Keyword search (BM25) never uses it.
"""
import re

STOPWORDS = frozenset(
    "a an and are as at be by can could do does for from had has have how i if in into is it its me my of on or our "
    "should so than that the their them then there these they this to us was we were what when where which who will with would you your "
    "up out about any all new now".split()
)

_PHRASES = {"sign-in": "signin", "sign in": "signin", "sign-off": "signoff", "log in": "login", "time off": "pto"}
_WORD = re.compile(r"[a-z0-9$%]+(?:\.[0-9]+)?")


def stem(word):
    for suffix in ("ing", "ed", "es", "s", "ly"):
        if word.endswith(suffix) and len(word) - len(suffix) >= 3:
            return word[: -len(suffix)]
    return word


def tokens(text, keep_stopwords=False):
    text = text.lower()
    for phrase, replacement in _PHRASES.items():
        text = text.replace(phrase, replacement)
    found = _WORD.findall(text)
    return [stem(w) for w in found if keep_stopwords or w not in STOPWORDS]


_GROUPS = [
    "vacation pto leave holiday",
    "stipend allowance reimburse reimbursed reimbursement",
    "slow slowdown slower latency regression",
    "duplicate second twice repeated",
    "invoice billing payment",
    "signin login sso okta redirected",
    "database postgres db",
    "page pager alert notify",
    "level threshold",
    "stolen lost theft",
    "laptop device computer",
    "caregiver parent parental newborn birth adoption",
    "signoff approval approve review authorize",
    "keep store stored host hosted retain",
    "pick choose chose decision decide picked",
    "cost price pricing fee",
    "within soon quick due deadline",
    "upgrade migration migrate",
    "why cause reason because root",
    "phishing suspicious scam malicious",
    "limit maximum cap",
    "discount rebate",
    "cold warmup warmed",
    "transparent blameless",
]
CONCEPTS = {}
for _index, _group in enumerate(_GROUPS):
    for _word in _group.split():
        CONCEPTS.setdefault(stem(_word), []).append(f"concept{_index}")


def concepts_of(token):
    return CONCEPTS.get(token, [])
