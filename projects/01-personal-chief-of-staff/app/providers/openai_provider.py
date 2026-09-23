import json
import os
import urllib.request

from .base import ProviderError, extract_json, openai_usage, read_error, token_limit
from ..schema import response_schema_text


class OpenAIProvider:
    name = "openai"

    def complete(self, prompt, context):
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise ProviderError("OPENAI_API_KEY is not set.")

        model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        body = {
            "model": model,
            "store": False,
            "max_output_tokens": token_limit(),
            "prompt_cache_key": "applied-ai-lab:chief-of-staff:v1",
            "input": [
                {
                    "role": "system",
                    "content": "You are a practical Personal Chief of Staff. Be decisive, specific, and concise.",
                },
                {
                    "role": "user",
                    "content": build_prompt(prompt, context),
                },
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "chief_of_staff_response",
                    "schema": json_schema(),
                    "strict": True,
                }
            },
        }

        request = urllib.request.Request(
            "https://api.openai.com/v1/responses",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception as error:
            raise ProviderError(read_error(error)) from error

        text = payload.get("output_text")
        if not text:
            text = extract_output_text(payload)
        result = extract_json(text)
        result["_provider_usage"] = openai_usage(payload)
        return result


def build_prompt(prompt, context):
    return f"""
{response_schema_text()}

User request:
{prompt}

Tool context:
{json.dumps(context, indent=2)}
"""


def extract_output_text(payload):
    chunks = []
    for item in payload.get("output", []):
        for content in item.get("content", []):
            if content.get("type") in {"output_text", "text"}:
                chunks.append(content.get("text", ""))
    if not chunks:
        raise ProviderError("OpenAI response did not include output text.")
    return "\n".join(chunks)


def json_schema():
    return {
        "type": "object",
        "additionalProperties": False,
        "required": ["summary", "priorities", "risks", "next_actions", "questions", "confidence", "tool_results"],
        "properties": {
            "summary": {"type": "string"},
            "priorities": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["title", "why", "score"],
                    "properties": {
                        "title": {"type": "string"},
                        "why": {"type": "string"},
                        "score": {"type": "number"},
                    },
                },
            },
            "risks": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["risk", "mitigation"],
                    "properties": {
                        "risk": {"type": "string"},
                        "mitigation": {"type": "string"},
                    },
                },
            },
            "next_actions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["action", "timebox"],
                    "properties": {
                        "action": {"type": "string"},
                        "timebox": {"type": "string"},
                    },
                },
            },
            "questions": {"type": "array", "items": {"type": "string"}},
            "confidence": {"type": "number"},
            "tool_results": {
                "type": "object",
                "additionalProperties": False,
                "properties": {},
                "required": [],
            },
        },
    }
