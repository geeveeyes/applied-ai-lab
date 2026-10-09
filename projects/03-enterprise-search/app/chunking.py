"""Three chunking strategies. Chunking is the first retrieval decision to measure."""
import hashlib
import re

STRATEGIES = ("fixed", "paragraph", "structure")
_MESSAGE = re.compile(r"^\[\d\d:\d\d\]")


def chunk_documents(docs, strategy):
    if strategy not in STRATEGIES:
        raise ValueError(f"Unknown chunking strategy: {strategy}")
    chunks = []
    for doc in docs:
        pieces = _split(doc, strategy)
        for order, piece in enumerate(pieces):
            index_text = f"{doc['title']}. {piece}" if strategy == "structure" else piece
            chunks.append({
                "id": f"{doc['id']}#{order}",
                "doc_id": doc["id"],
                "title": doc["title"],
                "source": doc["source"],
                "groups": doc["groups"],
                "text": piece,
                "index_text": index_text,
                "hash": hashlib.sha1(index_text.encode()).hexdigest()[:16],
            })
    return chunks


def _split(doc, strategy):
    text = doc["text"]
    if strategy == "fixed":
        return _window(text.split(), size=40, overlap=10)
    if strategy == "paragraph":
        return _paragraphs(text, minimum=20)
    if doc["source"] == "slack":
        return _messages(text, per_chunk=3, overlap=1)
    return _paragraphs(text, minimum=20)


def _window(words, size, overlap):
    if len(words) <= size:
        return [" ".join(words)]
    out, start = [], 0
    while start < len(words):
        out.append(" ".join(words[start:start + size]))
        if start + size >= len(words):
            break
        start += size - overlap
    return out


def _paragraphs(text, minimum):
    parts, buffer = [], ""
    for paragraph in re.split(r"\n\s*\n", text):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        buffer = f"{buffer}\n{paragraph}".strip()
        if len(buffer.split()) >= minimum:
            parts.append(buffer)
            buffer = ""
    if buffer:
        if parts and len(buffer.split()) < minimum:
            parts[-1] = f"{parts[-1]}\n{buffer}"
        else:
            parts.append(buffer)
    return parts or [text.strip()]


def _messages(text, per_chunk, overlap):
    lines = [line for line in text.splitlines() if line.strip()]
    if not all(_MESSAGE.match(line) for line in lines):
        return _paragraphs(text, minimum=20)
    step = max(1, per_chunk - overlap)
    out = []
    for start in range(0, len(lines), step):
        out.append("\n".join(lines[start:start + per_chunk]))
        if start + per_chunk >= len(lines):
            break
    return out

