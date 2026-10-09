"""extract -> validate -> record, plus a cost estimate per extractor.

Prices are illustrative assumptions in USD per million tokens. Update them from
your provider's pricing page before relying on the cost numbers.
"""
from . import llm
from .rules import extract_v1, extract_v2
from .schema import validate

EXTRACTORS = ("rules_v1", "rules_v2", "openai", "anthropic")
PRICES = {"rules_v1": (0.0, 0.0), "rules_v2": (0.0, 0.0), "openai": (0.15, 0.60), "anthropic": (1.00, 5.00)}
EST_OUTPUT_TOKENS = 220
MAX_TEXT_CHARS = 60000


def estimate_cost(extractor, text):
    """Estimated dollars for one document (about 4 characters per token)."""
    price_in, price_out = PRICES[extractor]
    tokens_in = (len(llm.GLOSSARY) + min(len(text), llm.MAX_DOC_CHARS)) / 4 if extractor in {"openai", "anthropic"} else 0
    tokens_out = EST_OUTPUT_TOKENS if tokens_in else 0
    return (tokens_in * price_in + tokens_out * price_out) / 1e6


def process(text, extractor="rules_v2", post=None):
    if extractor not in EXTRACTORS:
        raise ValueError(f"Choose one of {', '.join(EXTRACTORS)}.")
    if not text or len(text.strip()) < 40:
        raise ValueError("Paste a contract with at least 40 characters.")
    if len(text) > MAX_TEXT_CHARS:
        raise ValueError(f"Document is limited to {MAX_TEXT_CHARS:,} characters.")
    usage = None
    if extractor == "rules_v1":
        raw = extract_v1(text)
    elif extractor == "rules_v2":
        raw = extract_v2(text)
    else:
        raw, usage = llm.extract(extractor, text, post)
    result = validate(raw, text)
    result.update({"extractor": extractor, "est_cost_usd": estimate_cost(extractor, text), "usage": usage})
    return result
