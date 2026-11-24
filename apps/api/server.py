"""Loopback-only MVP HTTP service; no persistence or trading endpoints."""
import json
import sys
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "src"))
from riskmatch.prototype import ClientProfile, cards, score, candidates


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / "apps/web"), **kwargs)

    def respond(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/api/cards":
            return self.respond(cards())
        if self.path == "/api/health":
            return self.respond({"status": "ok", "mode": "simulation"})
        return super().do_GET()

    def do_POST(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length < 65536:
                raise ValueError("Invalid request size")
            data = json.loads(self.rfile.read(length))
            if self.path == "/api/score":
                return self.respond(score(data))
            if self.path == "/api/candidates":
                return self.respond(candidates(ClientProfile(**data)))
            return self.respond({"error": "Not found"}, 404)
        except (ValueError, TypeError, KeyError) as exc:
            return self.respond({"error": str(exc)}, 400)


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 3000), Handler).serve_forever()
