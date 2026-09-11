"""Local JSON API and built React client, using the Python standard library."""
from __future__ import annotations

import argparse
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import threading
from urllib.parse import parse_qs, unquote, urlsplit

try:
    from .engine import Game, GameError, LEVELS, SECRET_LEVELS
except ImportError:
    from engine import Game, GameError, LEVELS, SECRET_LEVELS

DIST = Path(__file__).resolve().parent.parent / "dist"
MAX_BODY = 16 * 1024


class GameServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, handler=None, dist=None):
        super().__init__(address, handler or Handler)
        self.games = {}
        self.game_lock = threading.RLock()
        self.dist = Path(dist or DIST).resolve()


class Handler(BaseHTTPRequestHandler):
    server_version = "LumenTaquin/1.0"

    def log_message(self, fmt, *args):
        # Keep gameplay requests quiet; launchers still show server errors.
        if args and str(args[1] if len(args) > 1 else "") not in {"200", "204"}:
            super().log_message(fmt, *args)

    def _headers(self, status, content_type, length):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        origin = self.headers.get("Origin")
        if origin:
            parsed = urlsplit(origin)
            if parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
        self.end_headers()

    def _json(self, status, value):
        data = json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
        self._headers(status, "application/json; charset=utf-8", len(data))
        self.wfile.write(data)

    def _error(self, status, message):
        self._json(status, {"error": message})

    def _body(self):
        if self.headers.get("Transfer-Encoding"):
            raise GameError("Encodage de requête non pris en charge.")
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise GameError("Taille de requête invalide.") from None
        if length <= 0 or length > MAX_BODY:
            raise GameError("La requête JSON est vide ou trop volumineuse.")
        if self.headers.get_content_type() != "application/json":
            raise GameError("Une requête JSON est attendue.")
        try:
            value = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise GameError("Le JSON envoyé est invalide.") from None
        if not isinstance(value, dict):
            raise GameError("Un objet JSON est attendu.")
        return value

    def _get_game(self, game_id):
        if not isinstance(game_id, str) or game_id not in self.server.games:
            raise LookupError("Cette partie n’existe plus. Relancez le niveau.")
        return self.server.games[game_id]

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        origin = self.headers.get("Origin", "")
        parsed = urlsplit(origin)
        if parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == "/api/health":
            return self._json(200, {"ok": True, "name": "Lumen Taquin"})
        if parsed.path == "/api/levels":
            return self._json(200, {"levels": [level.public() for level in LEVELS],
                                    "secrets": [level.public() for level in SECRET_LEVELS]})
        if parsed.path == "/api/game":
            try:
                params = parse_qs(parsed.query)
                values = params.get("id", [])
                if len(values) != 1:
                    raise GameError("Identifiant de partie attendu.")
                with self.server.game_lock:
                    state = self._get_game(values[0]).state()
                return self._json(200, state)
            except GameError as exc:
                return self._error(400, str(exc))
            except LookupError as exc:
                return self._error(404, str(exc))
        if parsed.path.startswith("/api/"):
            return self._error(404, "Cette route n’existe pas.")
        return self._static(parsed.path)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path not in {"/api/game", "/api/action"}:
            return self._error(404, "Cette route n’existe pas.")
        try:
            body = self._body()
            with self.server.game_lock:
                if path == "/api/game":
                    if set(body) - {"levelId"}:
                        raise GameError("Paramètre de création inconnu.")
                    game = Game(body.get("levelId", "aube"))
                    if len(self.server.games) >= 256:
                        del self.server.games[next(iter(self.server.games))]
                    self.server.games[game.id] = game
                    state = game.state()
                else:
                    if set(body) - {"gameId", "type", "index", "to"}:
                        raise GameError("Paramètre d’action inconnu.")
                    game = self._get_game(body.get("gameId"))
                    if "index" in body and type(body["index"]) is not int:
                        raise GameError("Le numéro de case doit être un entier.")
                    if "to" in body and type(body["to"]) is not int:
                        raise GameError("Le numéro du vide doit être un entier.")
                    state = game.act(body.get("type"), body.get("index"), body.get("to"))
            return self._json(200, state)
        except GameError as exc:
            return self._error(400, str(exc))
        except LookupError as exc:
            return self._error(404, str(exc))

    def _static(self, request_path):
        try:
            decoded = unquote(request_path)
            if "\x00" in decoded or "\\" in decoded:
                return self._error(400, "Chemin invalide.")
            candidate = (self.server.dist / decoded.lstrip("/")).resolve()
            if not candidate.is_relative_to(self.server.dist):
                return self._error(403, "Accès refusé.")
            if candidate.is_dir():
                candidate = candidate / "index.html"
            if not candidate.is_file() and not Path(decoded).suffix:
                candidate = self.server.dist / "index.html"
            candidate = candidate.resolve()
            if not candidate.is_relative_to(self.server.dist):
                return self._error(403, "Accès refusé.")
            if not candidate.is_file():
                return self._error(404, "Fichier introuvable. Lancez le projet avec start.py.")
            data = candidate.read_bytes()
            mime = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
            if candidate.suffix in {".js", ".mjs"}:
                mime = "text/javascript"
            if mime.startswith("text/"):
                mime += "; charset=utf-8"
            self._headers(200, mime, len(data))
            self.wfile.write(data)
        except (OSError, ValueError):
            self._error(404, "Fichier introuvable.")


def main():
    parser = argparse.ArgumentParser(description="Lumen Taquin local game server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    args = parser.parse_args()
    server = GameServer((args.host, args.port))
    print(f"Lumen Taquin : http://{args.host}:{server.server_port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
