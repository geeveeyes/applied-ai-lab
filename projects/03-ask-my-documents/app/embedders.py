"""Embedding backends. Each exposes `id` (cache key) and `embed(texts) -> (vectors, tokens_used)`."""
import hashlib
import json
import math
import os
import re
import urllib.error
import urllib.request

STOP = set("a an and are as at be by for from how in is it of on or that the to was what when where which who will with do does can i my".split())
HASH_DIM = 512
OPENAI_BATCH = 96
OPENAI_DIMS = 1536


def stem(tok):
    for suffix in ("ing", "ed", "es", "s"):
        if tok.endswith(suffix) and len(tok) - len(suffix) >= 4:
            return tok[: -len(suffix)]
    return tok


def tokens(text):
    text = re.sub(r"(?<=\d)\((\w)\)", r"\1", text.lower())  # 401(k) -> 401k
    return [stem(t) for t in re.findall(r"[a-z0-9$]+", text) if t not in STOP]


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


def normalize(vec):
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


class HashEmbedder:
    """Deterministic offline stand-in: hashed bag-of-words. Tests plumbing, has no semantic power."""
    id = f"hash-{HASH_DIM}"

    def embed(self, texts):
        out = []
        for text in texts:
            vec = [0.0] * HASH_DIM
            for tok in tokens(text):
                h = int(hashlib.md5(tok.encode()).hexdigest(), 16)
                vec[h % HASH_DIM] += 1.0 if (h >> 64) & 1 else -1.0
            out.append(normalize(vec))
        return out, 0


class OpenAIEmbedder:
    def __init__(self):
        self.key = os.getenv("OPENAI_API_KEY")
        if not self.key:
            raise ValueError("OPENAI_API_KEY is not set. Choose Mock or configure your key.")
        self.model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        self.id = f"openai-{self.model}"

    def embed(self, texts):
        out, used = [], 0
        for start in range(0, len(texts), OPENAI_BATCH):
            batch = texts[start:start + OPENAI_BATCH]
            payload = post("https://api.openai.com/v1/embeddings", {"model": self.model, "input": batch}, {"Authorization": f"Bearer {self.key}"})
            rows = sorted(payload.get("data", []), key=lambda r: r.get("index", 0))
            if len(rows) != len(batch):
                raise ValueError("Embedding provider returned an unexpected number of vectors.")
            out.extend(normalize(r["embedding"]) for r in rows)
            used += int((payload.get("usage") or {}).get("total_tokens") or 0)
        return out, used


def get_embedder(provider):
    if provider == "mock":
        return HashEmbedder()
    if provider == "openai":
        return OpenAIEmbedder()
    raise ValueError("Choose Mock or OpenAI.")
