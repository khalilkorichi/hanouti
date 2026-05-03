"""Tiny key/value settings store backed by the ``app_settings`` table.

All values are JSON-serialized so callers can store dicts/numbers/bools safely
without worrying about coercion. Errors are swallowed by ``get`` so a missing
or corrupted row falls back to the caller-provided default — never raises.
"""
from __future__ import annotations

import json
from typing import Any, Optional

from sqlalchemy.orm import Session

from models import AppSetting


def get(db: Session, key: str, default: Any = None) -> Any:
    row = db.query(AppSetting).filter(AppSetting.key == key).one_or_none()
    if row is None:
        return default
    try:
        return json.loads(row.value)
    except (json.JSONDecodeError, TypeError, ValueError):
        return default


def set_value(db: Session, key: str, value: Any) -> None:
    encoded = json.dumps(value, ensure_ascii=False)
    row = db.query(AppSetting).filter(AppSetting.key == key).one_or_none()
    if row is None:
        row = AppSetting(key=key, value=encoded)
        db.add(row)
    else:
        row.value = encoded
    db.commit()


def get_int(db: Session, key: str, default: int) -> int:
    v = get(db, key, default)
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def get_bool(db: Session, key: str, default: bool) -> bool:
    v = get(db, key, default)
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return bool(v)
    if isinstance(v, str):
        return v.strip().lower() in {"1", "true", "yes", "on"}
    return default


# Well-known keys — keep them centralized so a typo in one router doesn't
# silently create a different row from another router.
KEY_AUTO_BACKUP_INTERVAL_MIN = "auto_backup.interval_minutes"
KEY_AUTO_BACKUP_ENABLED = "auto_backup.enabled"

DEFAULT_AUTO_BACKUP_INTERVAL_MIN = 7 * 24 * 60  # one week
MIN_AUTO_BACKUP_INTERVAL_MIN = 5
MAX_AUTO_BACKUP_INTERVAL_MIN = 7 * 24 * 60
