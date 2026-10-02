"""Folder ingestion: .md/.txt/.pdf -> documents with per-file content hashes and per-file errors."""
import hashlib
from pathlib import Path

SUPPORTED = {".md", ".txt", ".pdf"}
MAX_FILES = 50
MAX_FILE_BYTES = 5_000_000
MAX_TOTAL_CHARS = 2_000_000


def read_pdf(path):
    try:
        from pypdf import PdfReader
    except ImportError as error:
        raise ValueError("PDF support needs `pip install pypdf`.") from error
    try:
        reader = PdfReader(str(path))
        if reader.is_encrypted:
            raise ValueError("PDF is encrypted.")
        pages = [(n + 1, (page.extract_text() or "")) for n, page in enumerate(reader.pages)]
    except ValueError:
        raise
    except Exception as error:
        raise ValueError(f"Could not read PDF: {error}") from error
    if not any(text.strip() for _, text in pages):
        raise ValueError("No extractable text (scanned PDFs are not supported).")
    return pages


def load_folder(folder):
    """Return (docs, errors). A bad file is reported, never fatal."""
    folder = Path(folder)
    if not folder.is_dir():
        raise ValueError("Documents folder does not exist.")
    paths = sorted(p for p in folder.rglob("*") if p.is_file() and p.suffix.lower() in SUPPORTED and not any(part.startswith(".") for part in p.relative_to(folder).parts))
    docs, errors, total = [], [], 0
    for path in paths[:MAX_FILES]:
        name = str(path.relative_to(folder))
        try:
            if path.stat().st_size > MAX_FILE_BYTES:
                raise ValueError("File is larger than 5 MB.")
            raw = path.read_bytes()
            pages = read_pdf(path) if path.suffix.lower() == ".pdf" else [(None, raw.decode("utf-8", errors="replace"))]
            total += sum(len(t) for _, t in pages)
            if total > MAX_TOTAL_CHARS:
                raise ValueError("Total document size limit reached.")
            docs.append({"source": name, "pages": pages, "hash": hashlib.sha256(raw).hexdigest()})
        except ValueError as error:
            errors.append({"source": name, "error": str(error)})
    if len(paths) > MAX_FILES:
        errors.append({"source": "*", "error": f"Only the first {MAX_FILES} files were read."})
    if not docs:
        raise ValueError("No readable .md, .txt or .pdf documents found.")
    return docs, errors
