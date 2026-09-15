"""
Member 2 — AI Engine HTTP Server
=================================
Exposes the prediction engine over HTTP so the Node.js backend can call it
via REST without needing Python embedded in Node.

Endpoints:
  POST /predict          — run prediction for one equipment_id
  POST /predict/fleet    — run predictions for all equipment
  GET  /health           — liveness check

Start with:
  python ai/server.py

Runs on port 5001 by default (configurable via AI_ENGINE_PORT env var).
"""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

# Make sure the parent directory (src/backend-node/) is on sys.path
# so that `import ai.engine` works regardless of where Python is invoked from.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2

from ai.engine import run_fleet_predictions, run_prediction_engine

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/defend_ai",
)
PORT = int(os.environ.get("AI_ENGINE_PORT", 5001))


def _get_conn():
    return psycopg2.connect(DATABASE_URL)


def _json_response(handler, status: int, body: dict):
    payload = json.dumps(body).encode()
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json")
    handler.send_header("Content-Length", str(len(payload)))
    handler.end_headers()
    handler.wfile.write(payload)


class AIHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[AI Engine] {fmt % args}")

    def do_GET(self):
        if self.path == "/health":
            _json_response(self, 200, {"status": "ok", "service": "ai-engine"})
        else:
            _json_response(self, 404, {"error": "Not found"})

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            _json_response(self, 400, {"error": "Invalid JSON"})
            return

        if self.path == "/predict":
            equipment_id = body.get("equipment_id")
            if not equipment_id:
                _json_response(self, 400, {"error": "equipment_id is required"})
                return
            try:
                conn = _get_conn()
                result = run_prediction_engine(conn, equipment_id)
                conn.close()
                _json_response(self, 200, result)
            except ValueError as exc:
                _json_response(self, 404, {"error": str(exc)})
            except Exception as exc:
                _json_response(self, 500, {"error": str(exc)})

        elif self.path == "/predict/fleet":
            try:
                conn = _get_conn()
                results = run_fleet_predictions(conn)
                conn.close()
                _json_response(self, 200, {"predictions": results, "count": len(results)})
            except Exception as exc:
                _json_response(self, 500, {"error": str(exc)})

        else:
            _json_response(self, 404, {"error": "Not found"})


if __name__ == "__main__":
    print(f"AI Engine starting on http://localhost:{PORT}")
    server = HTTPServer(("0.0.0.0", PORT), AIHandler)
    server.serve_forever()
