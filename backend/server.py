"""Local JSON API and built React client, using the Python standard library."""
from __future__ import annotations

import argparse
from collections import deque
from http import HTTPStatus
from http.cookies import SimpleCookie, CookieError
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import ipaddress
import mimetypes
import os
from pathlib import Path
import threading
import time
from urllib.parse import parse_qs, unquote, urlsplit

try:
    from .accounts import AccountStore, AccountError, SESSION_SECONDS
    from .engine import Game, GameError, LEVELS, SECRET_LEVELS
    from .space import SpaceGame, SPACE_LEVELS, SPACE_LEVEL_BY_ID
    from .lunar import LunarGame, LUNAR_LEVELS, LUNAR_LEVEL_BY_ID
    from .packs import PACKS
    from .echoes import EchoGame, ECHO_LEVELS, ECHO_LEVEL_BY_ID
except ImportError:
    from accounts import AccountStore, AccountError, SESSION_SECONDS
    from engine import Game, GameError, LEVELS, SECRET_LEVELS
    from space import SpaceGame, SPACE_LEVELS, SPACE_LEVEL_BY_ID
    from lunar import LunarGame, LUNAR_LEVELS, LUNAR_LEVEL_BY_ID
    from packs import PACKS
    from echoes import EchoGame, ECHO_LEVELS, ECHO_LEVEL_BY_ID

DIST = Path(__file__).resolve().parent.parent / "dist"
MAX_BODY = 64 * 1024
CAMPAIGN_LEVELS = LEVELS + SPACE_LEVELS + LUNAR_LEVELS + ECHO_LEVELS


class GameServer(ThreadingHTTPServer):
    daemon_threads = True

    def __init__(self, address, handler=None, dist=None, accounts_path=None):
        super().__init__(address, handler or Handler)
        self.allow_dev = address[0] in {"127.0.0.1", "::1", "localhost"}
        self.games = {}
        self.game_owners = {}
        self.game_lock = threading.RLock()
        self.dist = Path(dist or DIST).resolve()
        self.accounts = AccountStore(accounts_path) if accounts_path else AccountStore()
        self.auth_attempts = {}
        self.auth_lock = threading.Lock()


class Handler(BaseHTTPRequestHandler):
    server_version = "LumenTaquin/1.0"

    def setup(self):
        super().setup()
        self.connection.settimeout(15)

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
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "same-origin")
        if getattr(self, "retry_after", None):
            self.send_header("Retry-After", str(self.retry_after))
        if getattr(self, "session_cookie", None):
            self.send_header("Set-Cookie", self.session_cookie)
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
        if (not isinstance(game_id, str) or game_id not in self.server.games
                or self.server.game_owners.get(game_id) != self.account["user"]["id"]):
            raise LookupError("Cette partie n’existe plus. Relancez le niveau.")
        game = self.server.games[game_id]
        self._check_pack_access(game)
        return game

    def _check_pack_access(self, game):
        pack_id = game.level.public().get("packId")
        if pack_id and pack_id not in self.account.get("packs", []) and not self._local_dev_request():
            raise AccountError(403, "Cette expedition necessite son pack de niveaux dans la boutique.")

    def _local_dev_request(self):
        return (self.server.allow_dev and self.headers.get("X-Lumen-Dev") == "1"
                and ipaddress.ip_address(self.client_address[0]).is_loopback)

    def _game_state(self, game, state=None):
        state = game.state() if state is None else state
        pack_id = game.level.public().get("packId")
        if pack_id:
            state["packPreview"] = pack_id not in self.account.get("packs", [])
        return state

    def _limit(self, bucket, limit, seconds, key=None):
        with self.server.auth_lock:
            now = time.monotonic()
            attempts = self.server.auth_attempts
            for stored in list(attempts):
                if attempts[stored][-1] <= now - 3600:
                    del attempts[stored]
            identity = (bucket, key if key is not None else self.client_address[0])
            if identity not in attempts and len(attempts) >= 4096:
                self.retry_after = 60
                raise AccountError(429, "Serveur occupe. Reessayez dans une minute.")
            recent = attempts.setdefault(identity, deque())
            while recent and recent[0] <= now - seconds:
                recent.popleft()
            if len(recent) >= limit:
                self.retry_after = max(1, int(seconds - (now - recent[0])) + 1)
                raise AccountError(429, f"Trop de tentatives. Reessayez dans {self.retry_after} secondes.")
            recent.append(now)

    def _check_origin(self):
        origin = self.headers.get("Origin")
        if origin:
            parsed = urlsplit(origin)
            if parsed.scheme not in {"http", "https"} or parsed.netloc != self.headers.get("Host"):
                raise AccountError(403, "Origine de requete refusee.")
        if self.headers.get("Sec-Fetch-Site") == "cross-site":
            raise AccountError(403, "Origine de requete refusee.")

    def _authorize_game(self):
        try:
            self._limit("api", 600, 60)
            self.account = self.server.accounts.current(self._token())
            expected_user = self.headers.get("X-Lumen-Account")
            if expected_user and expected_user != self.account["user"]["id"]:
                raise AccountError(401, "Le compte actif a change. Reconnectez-vous.")
            self._limit("player", 240, 60, self.account["user"]["id"])
            return True
        except AccountError as exc:
            self._error(exc.status, str(exc))
        except (OSError, ValueError):
            self._error(503, "Le fichier de comptes est indisponible.")
        return False

    def do_OPTIONS(self):
        self.send_response(HTTPStatus.NO_CONTENT)
        origin = self.headers.get("Origin", "")
        parsed = urlsplit(origin)
        if parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1", "::1"}:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Lumen-Account, X-Lumen-Dev")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlsplit(self.path)
        if parsed.path == "/api/account":
            try:
                self._limit("api", 600, 60)
                return self._json(200, self.server.accounts.current(self._token()))
            except AccountError as exc:
                if exc.status == 401:
                    return self._json(200, {"user": None, "save": None, "revision": 0})
                return self._error(exc.status, str(exc))
            except (OSError, ValueError):
                return self._error(503, "Le fichier de comptes est indisponible. Reessayez plus tard.")
        if parsed.path == "/api/health":
            return self._json(200, {"ok": True, "name": "Lumen Taquin"})
        if parsed.path.startswith("/api/") and not self._authorize_game():
            return
        if parsed.path == "/api/levels":
            return self._json(200, {"levels": [level.public() for level in CAMPAIGN_LEVELS],
                                    "secrets": [level.public() for level in SECRET_LEVELS],
                                    "packs": list(PACKS.values())})
        if parsed.path == "/api/game":
            try:
                params = parse_qs(parsed.query)
                values = params.get("id", [])
                if len(values) != 1:
                    raise GameError("Identifiant de partie attendu.")
                with self.server.game_lock:
                    state = self._game_state(self._get_game(values[0]))
                return self._json(200, state)
            except AccountError as exc:
                return self._error(exc.status, str(exc))
            except GameError as exc:
                return self._error(400, str(exc))
            except LookupError as exc:
                return self._error(404, str(exc))
        if parsed.path.startswith("/api/"):
            return self._error(404, "Cette route n’existe pas.")
        return self._static(parsed.path)

    def do_POST(self):
        path = urlsplit(self.path).path
        if path in {"/api/account/register", "/api/account/login", "/api/account/logout", "/api/account/save", "/api/account/pack"}:
            return self._account_post(path)
        if path not in {"/api/game", "/api/action"}:
            return self._error(404, "Cette route n’existe pas.")
        if not self._authorize_game():
            return
        try:
            self._check_origin()
            body = self._body()
            with self.server.game_lock:
                if path == "/api/game":
                    self._limit("new-game", 20, 60, self.account["user"]["id"])
                    if set(body) - {"levelId"}:
                        raise GameError("Paramètre de création inconnu.")
                    level_id = body.get("levelId", "aube")
                    factory = SpaceGame if isinstance(level_id, str) and level_id in SPACE_LEVEL_BY_ID else Game
                    if isinstance(level_id, str) and level_id in LUNAR_LEVEL_BY_ID:
                        factory = LunarGame
                    if isinstance(level_id, str) and level_id in ECHO_LEVEL_BY_ID:
                        factory = EchoGame
                    game = factory(level_id)
                    self._check_pack_access(game)
                    if len(self.server.games) >= 256:
                        oldest = next(iter(self.server.games))
                        del self.server.games[oldest]
                        self.server.game_owners.pop(oldest, None)
                    self.server.games[game.id] = game
                    self.server.game_owners[game.id] = self.account["user"]["id"]
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
            return self._json(200, self._game_state(game, state))
        except AccountError as exc:
            return self._error(exc.status, str(exc))
        except GameError as exc:
            return self._error(400, str(exc))
        except LookupError as exc:
            return self._error(404, str(exc))

    def _token(self):
        try:
            cookies = SimpleCookie(self.headers.get("Cookie", ""))
            return cookies["lumen_session"].value if "lumen_session" in cookies else ""
        except CookieError:
            return ""

    def _set_session(self, token):
        secure = "; Secure" if os.environ.get("LUMEN_SECURE_COOKIE") == "1" else ""
        self.session_cookie = (f"lumen_session={token}; Path=/; HttpOnly; SameSite=Strict; "
                               f"Max-Age={SESSION_SECONDS if token else 0}{secure}")

    def _account_post(self, path):
        try:
            self._limit("api", 600, 60)
            self._check_origin()
            if path.endswith(("/register", "/login")):
                self._limit("auth-ip", 12, 60)
                self._limit("auth-global", 60, 60, "all")
                if path.endswith("/register"):
                    self._limit("registration-ip", 3, 3600)
                    self._limit("registration-global", 30, 3600, "all")
            body = self._body()
            if path.endswith(("/register", "/login")):
                register = path.endswith("/register")
                if set(body) - ({"username", "password", "save", "website"} if register else {"username", "password", "website"}):
                    raise AccountError(400, "Parametre de compte inconnu.")
                if body.get("website"):
                    raise AccountError(400, "Formulaire invalide.")
                username = body.get("username")
                if not register and isinstance(username, str):
                    self._limit("auth-user", 8, 900, username.strip().casefold()[:24])
                result, token = self.server.accounts.authenticate(body.get("username"), body.get("password"),
                    register=register, initial_save=body.get("save"))
                self._set_session(token)
                return self._json(201 if register else 200, result)
            if path.endswith("/logout"):
                self.server.accounts.current(self._token())
                self.server.accounts.logout(self._token())
                self._set_session("")
                return self._json(200, {"ok": True})
            if path.endswith("/pack"):
                if set(body) != {"packId", "revision", "userId"}:
                    raise AccountError(400, "Parametres d'achat invalides.")
                self._limit("pack", 15, 60)
                return self._json(200, self.server.accounts.purchase_pack(
                    self._token(), body["packId"], body["revision"], body["userId"]))
            if set(body) != {"save", "revision", "userId"} or not isinstance(body["userId"], str):
                raise AccountError(400, "Parametres de sauvegarde invalides.")
            self._limit("save", 120, 60)
            return self._json(200, self.server.accounts.save(self._token(), body["save"], body["revision"], body["userId"]))
        except AccountError as exc:
            return self._error(exc.status, str(exc))
        except GameError as exc:
            return self._error(400, str(exc))
        except (OSError, ValueError):
            return self._error(503, "Sauvegarde indisponible. Vos donnees precedentes sont conservees.")

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
