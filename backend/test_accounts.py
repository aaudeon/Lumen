"""Verification des comptes sans toucher aux donnees des joueurs."""
from concurrent.futures import ThreadPoolExecutor
import http.client
import json
from pathlib import Path
import tempfile
import threading
import time
import unittest
from unittest.mock import patch

from backend.accounts import AccountError, AccountStore, SESSION_SECONDS
from backend.packs import ECHO_PACK_ID, PACKS
from backend.server import GameServer

SAVE = {"version": 2, "progress": {"aube": {"completed": True, "score": 120}},
        "wardrobe": {}, "levelId": "aube"}


class AccountTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.path = Path(self.folder.name) / "accounts.json"
        self.store = AccountStore(self.path)

    def test_restart_password_hash_and_isolation(self):
        account, token = self.store.authenticate("Voyageur", "test-password", register=True, initial_save=SAVE)
        self.assertEqual(account["save"], SAVE)
        self.assertNotIn("password", account)
        raw = self.path.read_text()
        self.assertNotIn("test-password", raw)
        self.assertNotIn(token, raw)
        restarted = AccountStore(self.path)
        self.assertEqual(restarted.current(token), account)
        logged, _ = restarted.authenticate("voyageur", "test-password")
        self.assertEqual(logged, account)
        other, other_token = restarted.authenticate("Autre", "test-password", register=True)
        self.assertIsNone(other["save"])
        restarted.save(token, {**SAVE, "levelId": "relais"}, 0)
        self.assertIsNone(restarted.current(other_token)["save"])

    def test_invalid_credentials_duplicates_and_logout(self):
        _, token = self.store.authenticate("Voyageur", "test-password", register=True)
        for username, password, register, status in [
            ("../bad", "test-password", True, 400), ("New", "short", True, 400),
            ("VOYAGEUR", "test-password", True, 409), ("Voyageur", "wrong-password", False, 401),
            ("Unknown", "test-password", False, 401),
        ]:
            with self.subTest(username=username, register=register):
                with self.assertRaises(AccountError) as caught:
                    self.store.authenticate(username, password, register=register)
                self.assertEqual(caught.exception.status, status)
        self.store.logout(token)
        with self.assertRaises(AccountError):
            self.store.current(token)

    def test_expiry_and_invalid_saves(self):
        _, token = self.store.authenticate("Voyageur", "test-password", register=True)
        for value in [None, {}, {**SAVE, "version": 99}, {**SAVE, "progress": []},
                      {**SAVE, "progress": {"bad": float("nan")}}]:
            with self.assertRaises(AccountError):
                self.store.save(token, value, 0)
        with patch("backend.accounts.time.time", return_value=time.time() + SESSION_SECONDS + 1):
            with self.assertRaises(AccountError) as caught:
                self.store.current(token)
            self.assertEqual(caught.exception.status, 401)

    def test_concurrent_writes_reject_stale_revision(self):
        _, token = self.store.authenticate("Voyageur", "test-password", register=True)
        def write_save(_index):
            try:
                self.store.save(token, SAVE, 0)
                return 200
            except AccountError as error:
                return error.status
        with ThreadPoolExecutor(max_workers=2) as pool:
            self.assertEqual(sorted(pool.map(write_save, range(2))), [200, 409])
        self.assertEqual(json.loads(self.path.read_text())["users"]["voyageur"]["revision"], 1)

    def test_failed_write_preserves_previous_file(self):
        _, token = self.store.authenticate("Voyageur", "test-password", register=True, initial_save=SAVE)
        before = self.path.read_bytes()
        with patch("backend.accounts.os.replace", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                self.store.save(token, {**SAVE, "progress": {}}, 0)
        self.assertEqual(self.path.read_bytes(), before)
        self.assertEqual(list(self.path.parent.iterdir()), [self.path])

    def test_level_pack_purchase_debits_once_and_survives_login_and_reset(self):
        save = {**SAVE, "progress": {"aube": {"completed": True, "score": 60000}},
                "wardrobe": {"owned": ["paille"], "equipped": {"hat": "paille"}, "spent": 10000}}
        account, token = self.store.authenticate("PackUser", "test-password", register=True, initial_save=save)
        bought = self.store.purchase_pack(token, ECHO_PACK_ID, 0, account["user"]["id"])
        self.assertEqual(bought["packs"], [ECHO_PACK_ID])
        self.assertEqual(bought["save"]["wardrobe"]["spent"], 10000 + PACKS[ECHO_PACK_ID]["price"])
        self.assertEqual(bought["save"]["wardrobe"]["equipped"], {"hat": "paille"})
        self.assertEqual(bought["revision"], 1)
        self.assertEqual(self.store.purchase_pack(token, ECHO_PACK_ID, 0, account["user"]["id"]), bought)
        logged, _ = AccountStore(self.path).authenticate("PackUser", "test-password")
        self.assertEqual(logged["packs"], [ECHO_PACK_ID])
        reset = self.store.save(token, {**SAVE, "progress": {}, "wardrobe": {}, "levelId": None}, 1)
        self.assertEqual(reset["packs"], [ECHO_PACK_ID])

    def test_unaffordable_pack_cannot_use_spent_points_and_does_not_change_the_account(self):
        save = {**SAVE, "progress": {"aube": {"completed": True, "score": 50000}},
                "wardrobe": {"spent": 5001}}
        account, token = self.store.authenticate("PackUser", "test-password", register=True, initial_save=save)
        before = self.path.read_bytes()
        with self.assertRaises(AccountError) as caught:
            self.store.purchase_pack(token, ECHO_PACK_ID, 0, account["user"]["id"])
        self.assertEqual(caught.exception.status, 400)
        self.assertEqual(self.path.read_bytes(), before)

    def test_pack_is_atomic_under_duplicate_requests_and_failed_writes(self):
        save = {**SAVE, "progress": {"aube": {"score": 50000}}, "wardrobe": {"spent": 0}}
        account, token = self.store.authenticate("PackUser", "test-password", register=True, initial_save=save)
        before = self.path.read_bytes()
        with patch("backend.accounts.os.replace", side_effect=OSError("disk full")):
            with self.assertRaises(OSError):
                self.store.purchase_pack(token, ECHO_PACK_ID, 0, account["user"]["id"])
        self.assertEqual(self.path.read_bytes(), before)
        def purchase(_index):
            return self.store.purchase_pack(token, ECHO_PACK_ID, 0, account["user"]["id"])
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(purchase, range(2)))
        self.assertEqual(results[0], results[1])
        self.assertEqual(results[0]["save"]["wardrobe"]["spent"], 45000)


class AccountApiTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.server = GameServer(("127.0.0.1", 0), accounts_path=Path(self.folder.name) / "accounts.json")
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.cookie = ""

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.folder.cleanup()

    def request(self, method, path, body=None, origin=None, *, dev=False):
        connection = http.client.HTTPConnection(*self.server.server_address)
        headers = {"Content-Type": "application/json", "Cookie": self.cookie}
        if dev:
            headers["X-Lumen-Dev"] = "1"
        if origin:
            headers["Origin"] = origin
        connection.request(method, path, json.dumps(body) if body is not None else None, headers)
        response = connection.getresponse()
        cookie = response.getheader("Set-Cookie")
        if cookie:
            self.cookie = cookie.split(";", 1)[0]
        result = response.status, json.loads(response.read()), cookie
        connection.close()
        return result

    def test_register_save_login_logout_and_cookie(self):
        self.assertIsNone(self.request("GET", "/api/account")[1]["user"])
        status, account, cookie = self.request("POST", "/api/account/register", {"username": "ApiUser", "password": "test-password", "save": SAVE})
        self.assertEqual(status, 201)
        self.assertIn("HttpOnly", cookie)
        self.assertIn("SameSite=Strict", cookie)
        self.assertEqual(self.request("GET", "/api/account")[1], account)
        payload = {"save": SAVE, "revision": 0, "userId": account["user"]["id"]}
        self.assertEqual(self.request("POST", "/api/account/save", payload)[0], 200)
        self.assertEqual(self.request("POST", "/api/account/save", payload)[0], 409)
        self.assertEqual(self.request("POST", "/api/account/logout", {})[0], 200)
        self.assertEqual(self.request("POST", "/api/account/save", {**payload, "revision": 1})[0], 401)
        self.assertEqual(self.request("POST", "/api/account/login", {"username": "ApiUser", "password": "test-password"})[1]["save"], SAVE)
        self.request("POST", "/api/account/register", {"username": "OtherUser", "password": "test-password"})
        self.assertEqual(self.request("POST", "/api/account/save", payload)[0], 401)
        self.assertIsNone(self.request("GET", "/api/account")[1]["save"])

    def test_cross_origin_and_rate_limit(self):
        credentials = {"username": "ApiUser", "password": "test-password"}
        self.assertEqual(self.request("POST", "/api/account/register", credentials, "https://evil.example")[0], 403)
        for attempt in range(12):
            self.assertEqual(self.request("POST", "/api/account/login", {**credentials, "username": f"User{attempt}"})[0], 401)
        self.assertEqual(self.request("POST", "/api/account/login", credentials)[0], 429)

    def test_secure_cookie_and_corrupt_storage(self):
        with patch.dict("os.environ", {"LUMEN_SECURE_COOKIE": "1"}):
            result = self.request("POST", "/api/account/register", {"username": "ApiUser", "password": "test-password"})
        self.assertIn("; Secure", result[2])
        self.server.accounts.path.write_text("broken", encoding="utf-8")
        self.assertEqual(self.request("GET", "/api/account")[0], 503)
        self.assertEqual(self.server.accounts.path.read_text(), "broken")

    def test_game_requires_session_and_belongs_to_its_owner(self):
        for method, path, body in [("GET", "/api/levels", None), ("GET", "/api/game?id=unknown", None),
                                   ("POST", "/api/game", {}), ("POST", "/api/action", {})]:
            self.assertEqual(self.request(method, path, body)[0], 401)
        self.request("POST", "/api/account/register", {"username": "First", "password": "test-password"})
        owner_cookie = self.cookie
        status, game, _ = self.request("POST", "/api/game", {"levelId": "aube"})
        self.assertEqual(status, 200)
        self.assertEqual(self.request("GET", "/api/levels")[0], 200)
        self.request("POST", "/api/account/register", {"username": "Second", "password": "test-password"})
        self.assertEqual(self.request("GET", "/api/game?id=" + game["id"])[0], 404)
        self.assertEqual(self.request("POST", "/api/action", {"gameId": game["id"], "type": "reset"})[0], 404)
        self.cookie = owner_cookie
        self.assertEqual(self.request("GET", "/api/game?id=" + game["id"])[0], 200)
        self.assertEqual(self.request("POST", "/api/action", {"gameId": game["id"], "type": "reset"}, "https://evil.example")[0], 403)
        self.request("POST", "/api/account/logout", {})
        self.cookie = owner_cookie
        self.assertEqual(self.request("GET", "/api/game?id=" + game["id"])[0], 401)

    def test_honeypot_registration_and_username_limits(self):
        credentials = {"username": "BotUser", "password": "test-password"}
        self.assertEqual(self.request("POST", "/api/account/register", {**credentials, "website": "https://spam.example"})[0], 400)
        self.assertFalse(self.server.accounts.path.exists())
        for attempt in range(2):
            self.assertEqual(self.request("POST", "/api/account/register", {**credentials, "username": f"Real{attempt}"})[0], 201)
        self.assertEqual(self.request("POST", "/api/account/register", credentials)[0], 429)
        self.server.auth_attempts.clear()
        for _attempt in range(8):
            self.assertEqual(self.request("POST", "/api/account/login", credentials)[0], 401)
        connection = http.client.HTTPConnection(*self.server.server_address)
        connection.request("POST", "/api/account/login", json.dumps(credentials), {"Content-Type": "application/json"})
        response = connection.getresponse()
        self.assertEqual(response.status, 429)
        self.assertGreater(int(response.getheader("Retry-After")), 0)
        response.read()
        connection.close()

    def test_expired_session_cannot_play(self):
        self.request("POST", "/api/account/register", {"username": "Expired", "password": "test-password"})
        with patch("backend.accounts.time.time", return_value=time.time() + SESSION_SECONDS + 1):
            self.assertEqual(self.request("GET", "/api/levels")[0], 401)
            self.assertEqual(self.request("POST", "/api/game", {})[0], 401)

    def test_pack_purchase_requires_session_origin_identity_and_current_revision(self):
        payload = {"packId": ECHO_PACK_ID, "revision": 0, "userId": "unknown"}
        self.assertEqual(self.request("POST", "/api/account/pack", payload)[0], 401)
        funded = {**SAVE, "progress": {"aube": {"score": 50000}}, "wardrobe": {"spent": 0}}
        _, account, _ = self.request("POST", "/api/account/register", {"username": "PackApi", "password": "test-password", "save": funded})
        self.assertEqual(self.request("POST", "/api/account/pack", payload)[0], 401)
        payload["userId"] = account["user"]["id"]
        self.assertEqual(self.request("POST", "/api/account/pack", payload, "https://evil.example")[0], 403)
        self.assertEqual(self.request("POST", "/api/account/pack", {**payload, "revision": 9})[0], 409)
        self.assertEqual(self.request("POST", "/api/account/pack", {**payload, "price": 0})[0], 400)
        status, bought, _ = self.request("POST", "/api/account/pack", payload)
        self.assertEqual(status, 200)
        self.assertEqual(bought["packs"], [ECHO_PACK_ID])
        self.assertEqual(bought["save"]["wardrobe"]["spent"], 45000)

    def test_pack_levels_cannot_be_opened_without_purchase_or_by_forging_wardrobe(self):
        funded = {**SAVE, "progress": {"aube": {"score": 50000}}, "wardrobe": {"owned": [ECHO_PACK_ID], "spent": 0}}
        _, account, _ = self.request("POST", "/api/account/register", {"username": "PackGate", "password": "test-password", "save": funded})
        self.assertEqual(self.request("POST", "/api/game", {"levelId": "vestibule"})[0], 403)
        catalogue = self.request("GET", "/api/levels")[1]
        self.assertEqual(len([level for level in catalogue["levels"] if level.get("packId") == ECHO_PACK_ID]), 5)
        self.assertEqual(catalogue["packs"][0]["price"], 45000)
        payload = {"packId": ECHO_PACK_ID, "revision": 0, "userId": account["user"]["id"]}
        self.assertEqual(self.request("POST", "/api/account/pack", payload)[0], 200)
        status, game, _ = self.request("POST", "/api/game", {"levelId": "vestibule"})
        self.assertEqual(status, 200)
        self.assertEqual(game["packId"], ECHO_PACK_ID)
        self.assertEqual(self.request("GET", "/api/game?id=" + game["id"])[0], 200)

    def test_local_dev_can_preview_pack_without_spending_or_granting_ownership(self):
        _, account, _ = self.request("POST", "/api/account/register", {"username": "PackPreview", "password": "test-password", "save": SAVE})
        self.assertEqual(self.request("POST", "/api/game", {"levelId": "vestibule"})[0], 403)
        status, game, _ = self.request("POST", "/api/game", {"levelId": "vestibule"}, dev=True)
        self.assertEqual(status, 200)
        self.assertTrue(game["packPreview"])
        self.assertEqual(self.request("GET", "/api/game?id=" + game["id"], dev=True)[0], 200)
        self.assertEqual(self.request("GET", "/api/game?id=" + game["id"])[0], 403)
        status, hint, _ = self.request("POST", "/api/action", {"gameId": game["id"], "type": "hint"}, dev=True)
        self.assertEqual(status, 200)
        self.assertTrue(hint["packPreview"])
        self.assertEqual(self.request("GET", "/api/account")[1], account)
        self.server.allow_dev = False
        self.assertEqual(self.request("POST", "/api/game", {"levelId": "vestibule"}, dev=True)[0], 403)