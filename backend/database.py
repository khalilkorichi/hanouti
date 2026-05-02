from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

def _resolve_db_url() -> str:
    """
    Resolve DB URL with the following priority:
      1. DATABASE_URL env var (full SQLAlchemy URL)
      2. HANOUTI_DB_PATH env var (raw path; we wrap it as sqlite:///<path>)
      3. Default: ./hanouti.db beside the backend code
    The HANOUTI_DB_PATH variant is used by the Electron desktop launcher to
    point the bundled backend at the user-data directory on Windows.
    """
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    raw_path = os.getenv("HANOUTI_DB_PATH")
    if raw_path:
        normalized = raw_path.replace("\\", "/")
        return f"sqlite:///{normalized}"
    return "sqlite:///./hanouti.db"


DATABASE_URL = _resolve_db_url()
IS_SQLITE = "sqlite" in DATABASE_URL

if IS_SQLITE:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 30},
        pool_pre_ping=True,
        poolclass=StaticPool if ":memory:" in DATABASE_URL else None,
    )

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragmas(dbapi_conn, _):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA cache_size=-64000")
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA mmap_size=268435456")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        pool_recycle=3600,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
