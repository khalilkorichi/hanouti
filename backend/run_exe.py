"""
Entry point used by PyInstaller to build the standalone backend.exe.

Reads HANOUTI_HOST / HANOUTI_PORT (defaults: 127.0.0.1:51730) and starts uvicorn
without --reload (production mode). The Electron launcher passes these env vars
plus HANOUTI_DB_PATH so the bundled backend writes the SQLite DB inside
the per-user app-data directory instead of next to the .exe.
"""

from __future__ import annotations

import os
import sys


def main() -> None:
    # Ensure the bundled `backend` package directory is on sys.path so that
    # `import models, database, crud, ...` keeps working inside the frozen exe.
    here = os.path.dirname(os.path.abspath(__file__))
    if here not in sys.path:
        sys.path.insert(0, here)

    host = os.getenv("HANOUTI_HOST", "127.0.0.1")
    port = int(os.getenv("HANOUTI_PORT", "51730"))

    import uvicorn
    from main import app

    uvicorn.run(app, host=host, port=port, log_level="info", access_log=False)


if __name__ == "__main__":
    main()
