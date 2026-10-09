"""Model-backed extraction (OpenAI or Anthropic) with a stable, cacheable prefix.

The glossary is the context-engineering part: it pins down what each field means
so phrasing variation and look-alike clauses (decoys) don't change the answer.
"""
import json
import os
import urllib.error
import urllib.request

from .schema import FIELDS, normalize

MAX_DOC_CHARS = 30000

GLOSSARY = """You extract structured fields from commercial contracts. Return JSON only.
For every field return {"value": ..., "evidence": "<exact quote copied from the document>"}.
Use {"value": null, "evidence": null} when the document does not state the field. Never guess.

Field definitions:
- effective_date: the date the agreement takes effect, as ISO YYYY-MM-DD. Ignore dates of superseded documents, signatures, or amendments.
- term_months: length of the INITIAL term in months (convert years to months).
- auto_renewal: true only if the agreement renews without a new signed agreement (automatic or evergreen). false if renewal needs mutual written agreement or the agreement simply expires.
- payment_terms_days: days allowed to pay an invoice (Net N, within N days, due N days after). Ignore late-fee grace periods.
- termination_notice_days: days of notice required to terminate for convenience / without cause. Ignore notice periods for other purposes such as renewal or billing contact changes.
- governing_law: the jurisdiction whose law governs, without the words "State of" or "law" (for example "Delaware", "England and Wales").
- liability_cap_usd: a fixed liability cap as an integer number of US dollars. null if the cap is relative (for example "fees paid in the preceding 12 months") or absent. Ignore caps on support credits or other non-liability amounts.
"""


def prompt_for(text):
    return f"{GLOSSARY}\nDocument:\n{normalize(text)[:MAX_DOC_CHARS]}"


def schema():
    value = {"type": ["string", "integer", "boolean", "null"]}
    item = {"type": "object", "additionalProperties": False, "required": ["value", "evidence"],
            "properties": {"value": value, "evidence": {"type": ["string", "null"]}}}
    return {"type": "object", "additionalProperties": False, "required": list(FIELDS), "properties": {f: item for f in FIELDS}}


def extract(provider, text, post=None):
    post = post or _post
    prompt = prompt_for(text)
    if provider == "openai":
        key = _need("OPENAI_API_KEY")
        body = {"model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"), "store": False, "max_output_tokens": 600,
                "prompt_cache_key": "applied-ai-lab:document-intelligence:v1", "input": [{"role": "user", "content": prompt}],
                "text": {"format": {"type": "json_schema", "name": "contract_fields", "strict": True, "schema": schema()}}}
        payload = post("https://api.openai.com/v1/responses", body, {"Authorization": f"Bearer {key}"})
        out = "\n".join(b.get("text", "") for i in payload.get("output", []) for b in i.get("content", []) if b.get("type") == "output_text")
        usage = payload.get("usage") or {}
        used = {"input_tokens": int(usage.get("input_tokens") or 0), "cached_input_tokens": int((usage.get("input_tokens_details") or {}).get("cached_tokens") or 0), "output_tokens": int(usage.get("output_tokens") or 0)}
        return _parse(out), used
    if provider == "anthropic":
        key = _need("ANTHROPIC_API_KEY")
        body = {"model": os.getenv("ANTHROPIC_MODEL", "claude-haiku-4-5"), "max_tokens": 600, "cache_control": {"type": "ephemeral"}, "messages": [{"role": "user", "content": prompt}]}
        payload = post("https://api.anthropic.com/v1/messages", body, {"x-api-key": key, "anthropic-version": "2023-06-01"})
        out = "\n".join(b.get("text", "") for b in payload.get("content", []) if b.get("type") == "text")
        usage = payload.get("usage") or {}
        used = {"input_tokens": int(usage.get("input_tokens") or 0), "cached_input_tokens": int(usage.get("cache_read_input_tokens") or 0), "output_tokens": int(usage.get("output_tokens") or 0)}
        return _parse(out), used
    raise ValueError("Unknown provider.")


def _need(name):
    if not os.getenv(name):
        raise ValueError(f"{name} is not set. Choose a rules extractor or configure your key.")
    return os.environ[name]


def _parse(text):
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError("Provider returned invalid JSON.") from error
    if not isinstance(data, dict):
        raise ValueError("Provider returned JSON that is not an object.")
    return data


def _post(url, body, headers):
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError(f"Provider error ({error.code}): {error.read().decode(errors='replace')[:300]}") from error
    except urllib.error.URLError as error:
        raise ValueError(f"Provider connection failed: {error.reason}") from error
