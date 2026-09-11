"""Comptes locaux et sauvegardes JSON, pour une seule instance du serveur."""
from __future__ import annotations

from copy import deepcopy
import hashlib
import hmac
import json
import os
from pathlib import Path
import re
import secrets
import tempfile
import threading
import time

SESSION_SECONDS = 30 * 24 * 60 * 60
DATA_FILE = Path(__file__).resolve().parent / "data" / "accounts.json"


class AccountError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status


def validate_save(value: object) -> dict:
    if not isinstance(value, dict) or set(value) != {"version", "progress", "wardrobe", "levelId"}:
        raise AccountError(400, "Sauvegarde invalide.")
    if type(value["version"]) is not int or value["version"] != 2:
        raise AccountError(400, "Version de sauvegarde incompatible.")
    if not isinstance(value["progress"], dict) or not isinstance(value["wardrobe"], dict):
        raise AccountError(400, "Sauvegarde invalide.")
    identifier = re.compile(r"[a-z0-9_-]{1,80}")
    for level, record in value["progress"].items():
        if not identifier.fullmatch(level) or not isinstance(record, dict) or set(record) - {"moves", "score", "completed", "relic", "secretFound"}:
            raise AccountError(400, "Progression invalide.")
        for field, item in record.items():
            valid = (type(item) is int and 0 <= item <= 10**9) if field in {"moves", "score"} else type(item) is bool
            if not valid:
                raise AccountError(400, "Record invalide.")
    wardrobe = value["wardrobe"]
    if set(wardrobe) - {"owned", "equipped", "spent"}:
        raise AccountError(400, "Garde-robe invalide.")
    owned, equipped, spent = wardrobe.get("owned", []), wardrobe.get("equipped", {}), wardrobe.get("spent", 0)
    if not isinstance(owned, list) or len(owned) > 1000 or not all(isinstance(item, str) and identifier.fullmatch(item) for item in owned):
        raise AccountError(400, "Inventaire invalide.")
    if not isinstance(equipped, dict) or len(equipped) > 20 or not all(identifier.fullmatch(slot) and isinstance(item, str) and identifier.fullmatch(item) for slot, item in equipped.items()):
        raise AccountError(400, "Equipement invalide.")
    if type(spent) is not int or not 0 <= spent <= 10**9:
        raise AccountError(400, "Depenses invalides.")
    if value["levelId"] is not None and (not isinstance(value["levelId"], str) or len(value["levelId"]) > 80):
        raise AccountError(400, "Passage invalide.")
    try:
        encoded = json.dumps(value, allow_nan=False)
    except (ValueError, TypeError, RecursionError):
        raise AccountError(400, "Sauvegarde invalide.") from None
    if len(encoded.encode("utf-8")) > 48 * 1024:
        raise AccountError(400, "Sauvegarde trop volumineuse.")
    return deepcopy(value)


class AccountStore:
    def __init__(self, path: Path | str = DATA_FILE):
        self.path = Path(path)
        self.lock = threading.RLock()

    def _read(self) -> dict:
        if not self.path.exists():
            return {"version": 1, "users": {}, "sessions": {}}
        data = json.loads(self.path.read_text(encoding="utf-8"))
        if data.get("version") != 1 or not isinstance(data.get("users"), dict) or not isinstance(data.get("sessions"), dict):
            raise OSError("Format du fichier de comptes invalide")
        return data

    def _write(self, data: dict) -> None:
        # Le fichier precedent reste intact si l'ecriture temporaire echoue.
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=self.path.parent, delete=False) as stream:
                temporary = Path(stream.name)
                json.dump(data, stream, ensure_ascii=True, allow_nan=False, indent=2)
                stream.flush()
                os.fsync(stream.fileno())
            os.replace(temporary, self.path)
        finally:
            if temporary is not None:
                temporary.unlink(missing_ok=True)

    @staticmethod
    def _password(password: str, salt: str) -> str:
        return hashlib.scrypt(password.encode("utf-8"), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()

    @staticmethod
    def _credentials(username: object, password: object) -> tuple[str, str]:
        if not isinstance(username, str) or not re.fullmatch(r"[A-Za-z0-9_-]{3,24}", username.strip()):
            raise AccountError(400, "Pseudo : 3 a 24 lettres, chiffres, tirets ou underscores.")
        if not isinstance(password, str) or not 8 <= len(password) <= 128:
            raise AccountError(400, "Le mot de passe doit contenir entre 8 et 128 caracteres.")
        return username.strip(), password

    @staticmethod
    def _session(data: dict, token: str) -> dict:
        digest = hashlib.sha256(token.encode()).hexdigest()
        session = data["sessions"].get(digest)
        if not session or session["expires"] <= time.time():
            raise AccountError(401, "Session expiree. Reconnectez-vous pour sauvegarder.")
        return data["users"][session["user"]]

    @staticmethod
    def _public(user: dict) -> dict:
        return {"user": {"id": user["id"], "username": user["username"]},
                "save": deepcopy(user["save"]), "revision": user["revision"]}

    def authenticate(self, username: object, password: object, *, register: bool = False, initial_save: object = None) -> tuple[dict, str]:
        username, password = self._credentials(username, password)
        initial = validate_save(initial_save) if register and initial_save is not None else None
        with self.lock:
            data = self._read()
            key = username.casefold()
            user = data["users"].get(key)
            if register:
                if user:
                    raise AccountError(409, "Ce pseudo est deja utilise.")
                salt = secrets.token_hex(16)
                user = {"id": secrets.token_hex(16), "username": username, "salt": salt,
                        "password": self._password(password, salt), "save": initial, "revision": 0}
                data["users"][key] = user
            else:
                salt = user["salt"] if user else "0" * 32
                hashed = self._password(password, salt)
                if not user or not hmac.compare_digest(user["password"], hashed):
                    raise AccountError(401, "Pseudo ou mot de passe incorrect.")
            data["sessions"] = {digest: session for digest, session in data["sessions"].items()
                                if session["expires"] > time.time()}
            owned = [digest for digest, session in data["sessions"].items() if session["user"] == key]
            for digest in owned[:-7]:
                del data["sessions"][digest]
            token = secrets.token_urlsafe(32)
            data["sessions"][hashlib.sha256(token.encode()).hexdigest()] = {"user": key, "expires": time.time() + SESSION_SECONDS}
            self._write(data)
            return self._public(user), token

    def current(self, token: str) -> dict:
        with self.lock:
            return self._public(self._session(self._read(), token))

    def save(self, token: str, value: object, revision: object, user_id: object = None) -> dict:
        validated = validate_save(value)
        with self.lock:
            data = self._read()
            user = self._session(data, token)
            if user_id is not None and user_id != user["id"]:
                raise AccountError(401, "Le compte actif a change dans un autre onglet. Reconnectez-vous.")
            if type(revision) is not int or revision != user["revision"]:
                raise AccountError(409, "Une autre session a modifie la progression. Rechargez la sauvegarde du compte.")
            user["save"] = validated
            user["revision"] += 1
            self._write(data)
            return self._public(user)

    def logout(self, token: str) -> None:
        with self.lock:
            data = self._read()
            data["sessions"].pop(hashlib.sha256(token.encode()).hexdigest(), None)
            self._write(data)