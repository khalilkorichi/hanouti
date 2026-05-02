"""
Build a single-file backend.exe with PyInstaller.

Usage (Windows, after installing requirements + pyinstaller):
    python backend/build_exe.py

Output:
    backend-dist/backend.exe   (next to this script's parent)

The Electron build pipeline (see electron-builder.yml + .github/workflows/
build-windows.yml) places `backend-dist/` under `app-files/backend-dist/`
inside the installed Hanouti.exe directory.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
OUT = ROOT / "backend-dist"
WORK = ROOT / "build" / "pyinstaller"
SPEC = ROOT / "build" / "pyinstaller-spec"


def main() -> int:
    if shutil.which("pyinstaller") is None:
        print("[build_exe] pyinstaller not on PATH; trying `python -m PyInstaller`", flush=True)

    OUT.mkdir(parents=True, exist_ok=True)
    WORK.mkdir(parents=True, exist_ok=True)
    SPEC.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--name", "backend",
        "--paths", str(BACKEND),
        "--distpath", str(OUT),
        "--workpath", str(WORK),
        "--specpath", str(SPEC),
        "--hidden-import", "uvicorn.logging",
        "--hidden-import", "uvicorn.loops",
        "--hidden-import", "uvicorn.loops.auto",
        "--hidden-import", "uvicorn.protocols",
        "--hidden-import", "uvicorn.protocols.http",
        "--hidden-import", "uvicorn.protocols.http.auto",
        "--hidden-import", "uvicorn.protocols.websockets",
        "--hidden-import", "uvicorn.protocols.websockets.auto",
        "--hidden-import", "uvicorn.lifespan",
        "--hidden-import", "uvicorn.lifespan.on",
        "--hidden-import", "jose",
        "--hidden-import", "jose.backends",
        "--hidden-import", "jose.backends.cryptography_backend",
        "--hidden-import", "passlib.handlers.argon2",
        "--collect-submodules", "sqlalchemy",
        "--collect-submodules", "passlib",
        "--collect-submodules", "argon2",
        "--collect-submodules", "jose",
        str(BACKEND / "run_exe.py"),
    ]
    print("[build_exe] running:", " ".join(cmd), flush=True)
    return subprocess.call(cmd, cwd=str(ROOT))


if __name__ == "__main__":
    raise SystemExit(main())
