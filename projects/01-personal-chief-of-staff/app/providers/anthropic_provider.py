import json
import os
import urllib.request

from .base import ProviderError, anthropic_usage, extract_json, read_error, token_limit
from ..schema import response_schema_text


class AnthropicProvider:
    name = "anthropic"

    def complete(self, prompt, context):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ProviderError("ANTHROPIC_API_KEY is not set.")

        model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-5")
        body = {
            "model": model,
            "max_tokens": token_limit(),
            "cache_control": {"type": "ephemeral"},
            "system": "You are a practical Personal Chief of Staff. Be decisive, specific, and concise.",
            "messages": [
                {
                    "role": "user",
                    "content": build_prompt(prompt, context),
                }
            ],
        }

        request = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps(body).encode("utf-8"),
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception as error:
            raise ProviderError(read_error(error)) from error

        text = "\n".join(
            block.get("text", "")
            for block in payload.get("content", [])
            if block.get("type") == "text"
        )
        if not text:
            raise ProviderError("Anthropic response did not include text content.")
        result = extract_json(text)
        result["_provider_usage"] = anthropic_usage(payload)
        return result


def build_prompt(prompt, context):
    return f"""
{response_schema_text()}

User request:
{prompt}

Tool context:
{json.dumps(context, indent=2)}
"""
