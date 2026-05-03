"""Activity / audit-log helper.

Designed to be called from anywhere — routers, lifespan, scheduled jobs — and
to *never* break the calling flow. If the DB write fails (e.g. transient lock
or a column drift mid-migration) we log to stderr and return None instead of
raising; observability matters less than the user's transaction succeeding.
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from typing import Any, Iterable, Optional

from sqlalchemy import desc
from sqlalchemy.orm import Session

from database import SessionLocal
from models import ActivityLog


# ─────────────────────────────────────────────────────────────────────────────
# Severity & retention constants
# ─────────────────────────────────────────────────────────────────────────────

SEVERITY_INFO = "info"
SEVERITY_SUCCESS = "success"
SEVERITY_WARNING = "warning"
SEVERITY_CRITICAL = "critical"

VALID_SEVERITIES = {
    SEVERITY_INFO,
    SEVERITY_SUCCESS,
    SEVERITY_WARNING,
    SEVERITY_CRITICAL,
}

# Retention: prune rows older than this many days when ``prune_old`` runs.
DEFAULT_RETENTION_DAYS = 365


# ─────────────────────────────────────────────────────────────────────────────
# Write
# ─────────────────────────────────────────────────────────────────────────────

def log(
    db: Optional[Session],
    *,
    action: str,
    summary: str = "",
    entity_type: Optional[str] = None,
    entity_id: Optional[int] = None,
    actor: str = "system",
    severity: str = SEVERITY_INFO,
    meta: Optional[dict[str, Any]] = None,
) -> Optional[int]:
    """Insert one activity row. Returns the new id on success, ``None`` on
    failure. ``db`` may be ``None`` — we then open and close our own session
    so background loops (which don't have a request-scoped DB) can call us.

    If ``db`` is provided we still flush+commit our row immediately, in its
    own savepoint when possible, so a later rollback in the caller does not
    discard the audit entry. SQLite doesn't support nested transactions
    universally, so we fall back to a sibling session in that case.
    """
    if severity not in VALID_SEVERITIES:
        severity = SEVERITY_INFO

    payload = json.dumps(meta, ensure_ascii=False) if meta else None
    row = ActivityLog(
        action=action,
        summary=summary or "",
        entity_type=entity_type,
        entity_id=entity_id,
        actor=actor or "system",
        severity=severity,
        meta_json=payload,
    )

    own_session = db is None
    session: Session = SessionLocal() if own_session else db  # type: ignore[assignment]
    try:
        # Use a sibling session so caller rollbacks don't discard the audit row.
        if not own_session:
            sibling = SessionLocal()
            try:
                sibling.add(row)
                sibling.commit()
                sibling.refresh(row)
                return row.id
            finally:
                sibling.close()
        # own_session path
        session.add(row)
        session.commit()
        session.refresh(row)
        return row.id
    except Exception as e:  # pragma: no cover — never block the caller
        print(f"[activity] log failed action={action} err={e}", file=sys.stderr)
        try:
            if own_session:
                session.rollback()
        except Exception:
            pass
        return None
    finally:
        if own_session:
            try:
                session.close()
            except Exception:
                pass


# ─────────────────────────────────────────────────────────────────────────────
# Query
# ─────────────────────────────────────────────────────────────────────────────

def list_recent(
    db: Session,
    *,
    limit: int = 50,
    offset: int = 0,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    severity: Optional[str] = None,
    since: Optional[datetime] = None,
) -> list[ActivityLog]:
    limit = max(1, min(int(limit or 50), 500))
    offset = max(0, int(offset or 0))
    q = db.query(ActivityLog)
    if action:
        q = q.filter(ActivityLog.action == action)
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    if severity:
        q = q.filter(ActivityLog.severity == severity)
    if since:
        q = q.filter(ActivityLog.created_at >= since)
    q = q.order_by(desc(ActivityLog.created_at), desc(ActivityLog.id))
    return q.offset(offset).limit(limit).all()


def count(
    db: Session,
    *,
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    severity: Optional[str] = None,
    since: Optional[datetime] = None,
) -> int:
    q = db.query(ActivityLog)
    if action:
        q = q.filter(ActivityLog.action == action)
    if entity_type:
        q = q.filter(ActivityLog.entity_type == entity_type)
    if severity:
        q = q.filter(ActivityLog.severity == severity)
    if since:
        q = q.filter(ActivityLog.created_at >= since)
    return q.count()


def to_dict(row: ActivityLog) -> dict[str, Any]:
    meta: Optional[dict[str, Any]] = None
    if row.meta_json:
        try:
            meta = json.loads(row.meta_json)
        except json.JSONDecodeError:
            meta = None
    return {
        "id": row.id,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "actor": row.actor,
        "action": row.action,
        "entity_type": row.entity_type,
        "entity_id": row.entity_id,
        "summary": row.summary,
        "severity": row.severity,
        "meta": meta,
    }


def list_actions(db: Session) -> list[str]:
    rows = (
        db.query(ActivityLog.action)
        .distinct()
        .order_by(ActivityLog.action)
        .all()
    )
    return [r[0] for r in rows if r[0]]


# ─────────────────────────────────────────────────────────────────────────────
# Maintenance
# ─────────────────────────────────────────────────────────────────────────────

def prune_old(db: Session, *, days: int = DEFAULT_RETENTION_DAYS) -> int:
    cutoff = datetime.utcnow() - timedelta(days=max(7, int(days)))
    deleted = (
        db.query(ActivityLog)
        .filter(ActivityLog.created_at < cutoff)
        .delete(synchronize_session=False)
    )
    db.commit()
    return int(deleted or 0)


def clear_all(db: Session) -> int:
    deleted = db.query(ActivityLog).delete(synchronize_session=False)
    db.commit()
    return int(deleted or 0)
