#!/usr/bin/env python3
"""Build and launch LUMEN with Python's standard library only."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
import webbrowser


ROOT = Path(__file__).resolve().parent
WORK = ROOT / "work"
RUNTIME = Path.home() / ".cache" / "codex-runtimes" / "codex-primary-runtime" / "dependencies"


def find_node_and_npm() -> tuple[Path, list[str]]:
    """Prefer the user's Node installation, then the desktop's bundled runtime."""
    candidates = []
    installed = shutil.which("node")
    if installed:
        candidates.append(Path(installed))
    candidates.extend((RUNTIME / "node" / "bin" / "node.exe", RUNTIME / "node" / "bin" / "node"))
    npm_on_path = shutil.which("npm")
    for node in candidates:
        if not node.is_file():
            continue
        try:
            result = subprocess.run([str(node), "--version"], capture_output=True, text=True, check=True)
            version = tuple(int(part) for part in result.stdout.strip().lstrip("v").split(".")[:2])
            if version < (22, 12):
                continue
        except (OSError, ValueError, subprocess.CalledProcessError):
            continue
        cli_candidates = [
            node.parent / "node_modules" / "npm" / "bin" / "npm-cli.js",
            node.parent.parent / "node_modules" / "npm" / "bin" / "npm-cli.js",
            node.parent.parent / "lib" / "node_modules" / "npm" / "bin" / "npm-cli.js",
        ]
        if npm_on_path:
            npm_path = Path(npm_on_path)
            cli_candidates.extend((
                npm_path.resolve(),
                npm_path.parent / "node_modules" / "npm" / "bin" / "npm-cli.js",
            ))
        for cli in cli_candidates:
            if cli.is_file() and cli.suffix == ".js":
                return node, [str(node), str(cli)]
        if npm_on_path and os.name != "nt":
            return node, [npm_on_path]
    raise RuntimeError("Node.js 22.12 ou plus recent, avec npm, est necessaire. Installez Node.js puis relancez le jeu.")


def dependency_signature() -> str:
    digest = hashlib.sha256()
    for name in ("package.json", "package-lock.json"):
        path = ROOT / name
        if path.is_file():
            digest.update(name.encode())
            digest.update(path.read_bytes())
    return digest.hexdigest()


def ensure_dependencies(npm: list[str], env: dict[str, str]) -> None:
    package = json.loads((ROOT / "package.json").read_text(encoding="utf-8-sig"))
    names = set(package.get("dependencies", {})) | set(package.get("devDependencies", {}))
    missing = any(not (ROOT / "node_modules" / name / "package.json").is_file() for name in names)
    stamp = WORK / "dependencies.sha256"
    changed = stamp.is_file() and stamp.read_text(encoding="ascii") != dependency_signature()
    if missing or changed:
        print("Preparation des dependances (Internet requis la premiere fois)...", flush=True)
        install = "ci" if (ROOT / "package-lock.json").is_file() else "install"
        subprocess.run(npm + [install, "--no-audit", "--no-fund"], cwd=ROOT, env=env, check=True)
    stamp.write_text(dependency_signature(), encoding="ascii")


def needs_build() -> bool:
    index = ROOT / "dist" / "index.html"
    if not index.is_file():
        return True
    built_at = index.stat().st_mtime
    sources = [ROOT / "index.html", ROOT / "package.json", ROOT / "package-lock.json"]
    for pattern in ("vite.config.*", "tsconfig*.json"):
        sources.extend(ROOT.glob(pattern))
    for name in ("src", "public"):
        folder = ROOT / name
        if folder.is_dir():
            sources.extend(path for path in folder.rglob("*") if path.is_file())
    return any(path.is_file() and path.stat().st_mtime > built_at for path in sources)


def health_ok(url: str) -> bool:
    try:
        with urllib.request.urlopen(url + "/api/health", timeout=0.8) as response:
            health = json.load(response)
        return health.get("ok") is True and str(health.get("name", "")).lower().startswith("lumen")
    except (OSError, ValueError, urllib.error.URLError):
        return False


def port_in_use(port: int) -> bool:
    with socket.socket() as connection:
        connection.settimeout(0.3)
        return connection.connect_ex(("127.0.0.1", port)) == 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Lancer LUMEN, le prototype de taquin d'aventure.")
    parser.add_argument("--no-browser", action="store_true", help="Ne pas ouvrir automatiquement le navigateur.")
    parser.add_argument("--build", action="store_true", help="Reconstruire le frontend avant le lancement.")
    parser.add_argument("--port", type=int, default=8765, help="Port local (par defaut : 8765).")
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("Le port doit etre compris entre 1 et 65535.")
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(errors="replace")
    url = f"http://127.0.0.1:{args.port}"
    process = None
    try:
        already_running = port_in_use(args.port)
        if already_running and not health_ok(url):
            raise RuntimeError(f"Le port {args.port} est deja utilise. Relancez avec --port 8766.")
        if args.build or needs_build():
            WORK.mkdir(exist_ok=True)
            node, npm = find_node_and_npm()
            env = os.environ.copy()
            env["PATH"] = str(node.parent) + os.pathsep + env.get("PATH", "")
            env["npm_config_cache"] = str(WORK / ".npm-cache")
            ensure_dependencies(npm, env)
            print("Construction du jeu...", flush=True)
            subprocess.run(npm + ["run", "build"], cwd=ROOT, env=env, check=True)
        if already_running:
            print(f"LUMEN est deja ouvert : {url}")
            if not args.no_browser:
                webbrowser.open(url)
            return 0
        print("Demarrage du serveur Python...", flush=True)
        process = subprocess.Popen(
            [sys.executable, str(ROOT / "backend" / "server.py"), "--host", "127.0.0.1", "--port", str(args.port)],
            cwd=ROOT,
        )
        deadline = time.monotonic() + 15
        while time.monotonic() < deadline:
            if process.poll() is not None:
                raise RuntimeError("Le serveur s'est arrete pendant son demarrage. Consultez le message ci-dessus.")
            if health_ok(url):
                break
            time.sleep(0.2)
        else:
            raise RuntimeError("Le serveur local ne repond pas apres 15 secondes.")
        print(f"\nLUMEN est pret : {url}\nGardez cette fenetre ouverte. Ctrl+C arrete le serveur.\n", flush=True)
        if not args.no_browser:
            webbrowser.open(url)
        return process.wait()
    except KeyboardInterrupt:
        print("\nArret de LUMEN.")
        return 0
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as exc:
        print(f"\nImpossible de lancer LUMEN : {exc}", file=sys.stderr)
        return 1
    finally:
        if process is not None and process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == "__main__":
    raise SystemExit(main())
