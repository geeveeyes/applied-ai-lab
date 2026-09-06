import json
import re
import urllib.error


class ProviderError(RuntimeError):
    pass


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
