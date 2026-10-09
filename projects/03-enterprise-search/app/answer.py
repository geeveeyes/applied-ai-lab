"""Grounded answers with enforced citations.

Contract: every claim cites retrieved chunk ids, and the claim text must be
supported by the cited chunk. Anything else is dropped; with nothing left the
system refuses instead of guessing.
"""
import json
import os
import re

from .embeddings import _post
from .text import concepts_of, tokens

MAX_CONTEXT_CHARS = 6000
SUPPORT_THRESHOLD = 0.6
ANSWER_THRESHOLD = 0.6
MIN_MATCHED_TERMS = 2
_STAMP = re.compile(r"^\[\d\d:\d\d\]\s*")
REFUSAL = "I couldn't find a supported answer in the documents you can access."

INSTRUCTIONS = (
    "You answer questions using only the numbered context chunks. "
    "Return JSON: {\"claims\": [{\"text\": string, \"citations\": [chunk ids]}], \"insufficient_context\": boolean}. "
    "Each claim must be directly supported by the chunks it cites. If the chunks do not answer the question, "
    "return no claims and set insufficient_context to true. Never use outside knowledge."
)


def prompt_for(question, hits):
    parts, used = [], 0
    for hit in hits:
        block = f"[{hit['chunk_id']}] ({hit['title']})\n{hit['text']}"
        if used + len(block) > MAX_CONTEXT_CHARS:
            break
        parts.append(block)
        used += len(block)
    return f"{INSTRUCTIONS}\n\nContext chunks:\n\n" + "\n\n".join(parts) + f"\n\nQuestion: {question}"


def _covers(query_tokens, sentence_tokens):
    present = set(sentence_tokens) | {c for t in sentence_tokens for c in concepts_of(t)}
    hits = sum(1 for t in query_tokens if t in present or any(c in present for c in concepts_of(t)))
    if hits < min(MIN_MATCHED_TERMS, len(query_tokens)):
        return 0.0
    return hits / len(query_tokens) if query_tokens else 0.0


def mock_answer(question, hits):
    """Extractive stand-in for a model: quote the best-matching sentences from retrieved chunks."""
    q = list(dict.fromkeys(tokens(question)))
    scored = []
    for hit in hits:
        for line in re.split(r"(?<=[.!?])\s+|\n", hit["text"]):
            sentence = _STAMP.sub("", line).strip()
            if len(sentence) < 12:
                continue
            scored.append((_covers(q, tokens(sentence)), -hit["rank"], sentence, hit["chunk_id"]))
    scored.sort(key=lambda row: (-row[0], -row[1]))
    claims = []
    seen = set()
    for score, _, sentence, chunk_id in scored:
        if score >= ANSWER_THRESHOLD and sentence not in seen and len(claims) < 3:
            seen.add(sentence)
            claims.append({"text": sentence, "citations": [chunk_id]})
    return {"claims": claims, "insufficient_context": not claims}


def support(claim_text, chunk_text):
    """Fraction of the claim's content words that appear in the cited chunk (deterministic faithfulness proxy)."""
    claim = set(tokens(claim_text))
    return len(claim & set(tokens(chunk_text))) / len(claim) if claim else 0.0


def enforce_citations(raw, hits):
    by_id = {h["chunk_id"]: h for h in hits}
    kept, dropped = [], []
    for claim in raw.get("claims") or []:
        text = str(claim.get("text", "")).strip()
        ids = [c for c in claim.get("citations") or [] if c in by_id]
        if not text:
            continue
        if not ids:
            dropped.append({"text": text, "reason": "no valid citation"})
        elif max(support(text, by_id[c]["text"]) for c in ids) < SUPPORT_THRESHOLD:
            dropped.append({"text": text, "reason": "not supported by cited chunk"})
        else:
            kept.append({"text": text, "citations": ids})
    refused = not kept
    return {
        "answer": REFUSAL if refused else " ".join(c["text"] for c in kept),
        "claims": kept,
        "refused": refused,
        "dropped": dropped,
        "sources": {cid: {"title": by_id[cid]["title"], "source": by_id[cid]["source"]} for c in kept for cid in c["citations"]},
    }


def answer(question, hits, provider="mock"):
    if not hits:
        return enforce_citations({"claims": []}, hits), None
    if provider == "mock":
        return enforce_citations(mock_answer(question, hits), hits), None
    prompt = prompt_for(question, hits)
    allowed = [h for h in hits if f"[{h['chunk_id']}]" in prompt]
    raw, usage = call_model(provider, prompt)
    return enforce_citations(raw, allowed), usage


def call_model(provider, prompt):
    limit = max(256, min(int(os.getenv("MAX_OUTPUT_TOKENS", "700") or 700), 1500))
    if provider == "openai":
        key = _need("OPENAI_API_KEY")
        body = {"model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"), "store": False, "max_output_tokens": limit,
                "prompt_cache_key": "applied-ai-lab:enterprise-search:v1",
                "input": [{"role": "user", "content": prompt}],
                "text": {"format": {"type": "json_schema", "name": "grounded_answer", "strict": True, "schema": _schema()}}}
        payload = _post("https://api.openai.com/v1/responses", body, {"Authorization": f"Bearer {key}"})
        text = "\n".join(b.get("text", "") for item in payload.get("output", []) for b in item.get("content", []) if b.get("type") == "output_text")
        usage = payload.get("usage") or {}
        details = usage.get("input_tokens_details") or {}
        return _parse(text), {"input_tokens": int(usage.get("input_tokens") or 0), "cached_input_tokens": int(details.get("cached_tokens") or 0), "cache_write_tokens": 0, "output_tokens": int(usage.get("output_tokens") or 0)}
    if provider == "anthropic":
        key = _need("ANTHROPIC_API_KEY")
        body = {"model": os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5"), "max_tokens": limit, "cache_control": {"type": "ephemeral"}, "messages": [{"role": "user", "content": prompt}]}
        payload = _post("https://api.anthropic.com/v1/messages", body, {"x-api-key": key, "anthropic-version": "2023-06-01"})
        text = "\n".join(b.get("text", "") for b in payload.get("content", []) if b.get("type") == "text")
        usage = payload.get("usage") or {}
        return _parse(text), {"input_tokens": int(usage.get("input_tokens") or 0), "cached_input_tokens": int(usage.get("cache_read_input_tokens") or 0), "cache_write_tokens": int(usage.get("cache_creation_input_tokens") or 0), "output_tokens": int(usage.get("output_tokens") or 0)}
    raise ValueError("Choose Mock, OpenAI, or Anthropic.")


def _need(name):
    value = os.getenv(name)
    if not value:
        raise ValueError(f"{name} is not set. Choose Mock or configure your key.")
    return value


def _parse(text):
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError("Provider returned invalid JSON. Try again or use Mock.") from error


def _schema():
    return {"type": "object", "additionalProperties": False, "required": ["claims", "insufficient_context"], "properties": {
        "claims": {"type": "array", "items": {"type": "object", "additionalProperties": False, "required": ["text", "citations"], "properties": {"text": {"type": "string"}, "citations": {"type": "array", "items": {"type": "string"}}}}},
        "insufficient_context": {"type": "boolean"}}}
