"""Embedders return sparse vectors as {index: weight}, L2-normalized.

HashingEmbedder runs offline: hashed word, bigram, character-trigram, and concept
features with IDF weighting. OpenAIEmbedder calls a real embedding model.
"""
import json
import math
import os
import urllib.error
import urllib.request
import zlib
from collections import Counter

from .text import concepts_of, tokens


def cosine(a, b):
    if len(a) > len(b):
        a, b = b, a
    return sum(value * b.get(key, 0.0) for key, value in a.items())


def _normalize(vector):
    norm = math.sqrt(sum(v * v for v in vector.values()))
    return {k: v / norm for k, v in vector.items()} if norm else {}


class HashingEmbedder:
    name = "hashing-offline"
    DIM = 2048

    def __init__(self):
        self.idf = {}
        self.docs = 0

    def _features(self, text):
        toks = tokens(text)
        feats = Counter()
        for tok in toks:
            feats[f"w:{tok}"] += 1.0
            for concept in concepts_of(tok):
                feats[concept] += 1.5
            if len(tok) > 4:
                for i in range(len(tok) - 2):
                    feats[f"c3:{tok[i:i + 3]}"] += 0.15
        for a, b in zip(toks, toks[1:]):
            feats[f"b:{a}_{b}"] += 0.6
        return feats

    def fit(self, texts):
        df = Counter()
        for text in texts:
            df.update(self._features(text).keys())
        self.docs = len(texts)
        self.idf = {k: math.log(1 + self.docs / (1 + n)) for k, n in df.items()}

    def embed(self, text):
        vector = {}
        for key, weight in self._features(text).items():
            idf = self.idf.get(key, math.log(1 + self.docs))
            h = zlib.crc32(key.encode())
            slot, sign = h % self.DIM, 1.0 if (h >> 31) & 1 else -1.0
            vector[slot] = vector.get(slot, 0.0) + sign * weight * idf
        return _normalize(vector)

    def embed_many(self, texts):
        return [self.embed(t) for t in texts]


class OpenAIEmbedder:
    """Dense embeddings from the OpenAI API. Needs OPENAI_API_KEY; not used by evals."""

    def __init__(self, model=None):
        self.model = model or os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")
        self.name = f"openai:{self.model}"
        self.key = os.getenv("OPENAI_API_KEY")
        if not self.key:
            raise ValueError("OPENAI_API_KEY is not set. Use the offline embedder or configure your key.")

    def fit(self, texts):
        pass

    def embed_many(self, texts, post=None):
        post = post or _post
        out = []
        for start in range(0, len(texts), 64):
            batch = texts[start:start + 64]
            payload = post("https://api.openai.com/v1/embeddings", {"model": self.model, "input": batch}, {"Authorization": f"Bearer {self.key}"})
            rows = sorted(payload["data"], key=lambda row: row["index"])
            out.extend(_normalize(dict(enumerate(row["embedding"]))) for row in rows)
        return out

    def embed(self, text):
        return self.embed_many([text])[0]


def _post(url, body, headers):
    request = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **headers}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=60) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        raise ValueError(f"Embedding provider error ({error.code}): {error.read().decode(errors='replace')[:300]}") from error
    except urllib.error.URLError as error:
        raise ValueError(f"Embedding provider connection failed: {error.reason}") from error
