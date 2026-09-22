import json
import os
import urllib.error
import urllib.request

from .research import mock_brief, prompt_for


def complete(provider, context):
    if provider == "mock":
        return mock_brief(context)
    if provider == "openai":
        key = os.getenv("OPENAI_API_KEY")
        if not key:
            raise ValueError("OPENAI_API_KEY is not set. Choose Mock or configure your key.")
        body = {
            "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            "input": [{"role": "system", "content": "You are a careful research analyst. Follow the requested JSON contract."}, {"role": "user", "content": prompt_for(context)}],
            "text": {"format": {"type": "json_schema", "name": "research_brief", "strict": True, "schema": brief_schema()}},
        }
        payload = post("https://api.openai.com/v1/responses", body, {"Authorization": f"Bearer {key}"})
        chunks = [block.get("text", "") for item in payload.get("output", []) for block in item.get("content", []) if block.get("type") == "output_text"]
        return parse("\n".join(chunks) or payload.get("output_text", ""))
    if provider == "anthropic":
        key = os.getenv("ANTHROPIC_API_KEY")
        if not key:
            raise ValueError("ANTHROPIC_API_KEY is not set. Choose Mock or configure your key.")
        body = {
            "model": os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5"),
            "max_tokens": 1800,
            "system": "You are a careful research analyst. Return only the requested JSON object.",
            "messages": [{"role": "user", "content": prompt_for(context)}],
        }
        payload = post("https://api.anthropic.com/v1/messages", body, {"x-api-key": key, "anthropic-version": "2023-06-01"})
        return parse("\n".join(block.get("text", "") for block in payload.get("content", []) if block.get("type") == "text"))
    raise ValueError("Choose Mock, OpenAI, or Anthropic.")


def post(url, body, headers):
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:500]
        raise ValueError(f"Provider error ({error.code}): {detail}") from error
    except urllib.error.URLError as error:
        raise ValueError(f"Provider connection failed: {error.reason}") from error


def parse(text):
    text = text.strip()
    if text.startswith("```"):
        text = text.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    if not text:
        raise ValueError("Provider returned no text.")
    try:
        return json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError("Provider returned invalid JSON. Try again or use Mock.") from error


def brief_schema():
    string_array = {"type": "array", "items": {"type": "string"}}
    return {
        "type": "object", "additionalProperties": False,
        "required": ["answer", "findings", "counterpoints", "next_steps", "critique"],
        "properties": {
            "answer": {"type": "string"},
            "findings": {"type": "array", "items": {
                "type": "object", "additionalProperties": False,
                "required": ["claim", "source_ids"],
                "properties": {"claim": {"type": "string"}, "source_ids": string_array},
            }},
            "counterpoints": string_array,
            "next_steps": string_array,
            "critique": {
                "type": "object", "additionalProperties": False,
                "required": ["confidence", "limitations", "follow_up_questions"],
                "properties": {
                    "confidence": {"type": "string", "enum": ["low", "medium", "high"]},
                    "limitations": string_array,
                    "follow_up_questions": string_array,
                },
            },
        },
    }
