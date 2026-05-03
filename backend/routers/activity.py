"""Activity log API.

Exposes a paginated, filterable read-only view over the audit trail recorded
by ``services.activity_service``. Also includes a destructive ``DELETE /clear``
that is itself audit-logged so a malicious clear is at least visible afterwards
(the row that records the clear cannot be deleted by the same call).
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from services import activity_service

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get("/list")
def list_activity(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    severity: Optional[str] = None,
    since_minutes: Optional[int] = Query(None, ge=1),
    db: Session = Depends(get_db),
):
    since: Optional[datetime] = None
    if since_minutes:
        since = datetime.utcnow() - timedelta(minutes=int(since_minutes))

    rows = activity_service.list_recent(
        db,
        limit=limit,
        offset=offset,
        action=action,
        entity_type=entity_type,
        severity=severity,
        since=since,
    )
    total = activity_service.count(
        db,
        action=action,
        entity_type=entity_type,
        severity=severity,
        since=since,
    )
    return {
        "items": [activity_service.to_dict(r) for r in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/actions")
def distinct_actions(db: Session = Depends(get_db)):
    return {"actions": activity_service.list_actions(db)}


@router.delete("/clear")
def clear_activity(db: Session = Depends(get_db)):
    deleted = activity_service.clear_all(db)
    activity_service.log(
        None,
        action="activity.cleared",
        summary=f"تم مسح سجل النشاطات ({deleted} عنصر)",
        severity=activity_service.SEVERITY_WARNING,
        meta={"deleted_rows": deleted},
    )
    return {"success": True, "deleted": deleted}
