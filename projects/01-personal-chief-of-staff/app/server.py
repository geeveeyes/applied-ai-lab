import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from .env_loader import load_dotenv
from .providers import get_provider
from .providers.base import ProviderError
from .schema import normalize_response
from .tools import score_prompt

ROOT = Path(__file__).resolve().parent
STATIC_ROOT = ROOT / "static"
PROJECT_ROOT = ROOT.parent


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_ROOT), **kwargs)

    def do_GET(self):
        if urlparse(self.path).path == "/health":
            self.send_json({"ok": True})
            return
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/run":
            self.send_error(404)
            return

        try:
            payload = self.read_json()
            prompt = str(payload.get("prompt", "")).strip()
            provider_name = str(payload.get("provider", "mock")).strip()

            if not prompt:
                self.send_json({"error": "Please enter a goal or decision."}, status=400)
                return

            tool_results = {"priority_scorer": score_prompt(prompt)}
            context = {"tools": tool_results}

            provider = get_provider(provider_name)
            try:
                result = provider.complete(prompt, context)
            except ProviderError as error:
                fallback = get_provider("mock").complete(prompt, context)
                fallback["summary"] = f"Using mock mode because {provider_name} was unavailable. {fallback['summary']}"
                fallback["tool_results"] = tool_results
                self.send_json({"provider": "mock", "requested_provider": provider_name, "result": normalize_response(fallback), "warning": str(error)})
                return

            result = normalize_response(result)
            result["tool_results"] = result.get("tool_results") or tool_results
            self.send_json({"provider": provider.name, "result": result})
        except Exception as error:
            self.send_json({"error": str(error)}, status=500)

    def read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def send_json(self, payload, status=200):
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        if os.getenv("APP_DEBUG"):
            super().log_message(format, *args)


def main():
    load_dotenv(PROJECT_ROOT / ".env")
    port = int(os.getenv("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Personal Chief of Staff running at http://127.0.0.1:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
