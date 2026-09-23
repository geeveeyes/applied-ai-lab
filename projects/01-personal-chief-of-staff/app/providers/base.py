import json
import os
import re
import urllib.error


class ProviderError(RuntimeError):
    pass


def token_limit(default=1200, maximum=2000):
    try:
        return max(256, min(int(os.getenv("MAX_OUTPUT_TOKENS", str(default))), maximum))
    except ValueError:
        return default


def extract_json(text):
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            raise ProviderError("Model response did not contain JSON.")
        return json.loads(match.group(0))


def read_error(error):
    if isinstance(error, urllib.error.HTTPError):
        try:
            return error.read().decode("utf-8")
        except Exception:
            return str(error)
    return str(error)


def openai_usage(payload):
    usage = payload.get("usage") or {}
    details = usage.get("input_tokens_details") or {}
    return {
        "input_tokens": int(usage.get("input_tokens") or 0),
        "cached_input_tokens": int(details.get("cached_tokens") or 0),
        "cache_write_tokens": int(details.get("cache_write_tokens") or 0),
        "output_tokens": int(usage.get("output_tokens") or 0),
    }


def anthropic_usage(payload):
    usage = payload.get("usage") or {}
    return {
        "input_tokens": int(usage.get("input_tokens") or 0),
        "cached_input_tokens": int(usage.get("cache_read_input_tokens") or 0),
        "cache_write_tokens": int(usage.get("cache_creation_input_tokens") or 0),
        "output_tokens": int(usage.get("output_tokens") or 0),
    }
