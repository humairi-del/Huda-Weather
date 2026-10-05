from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import current_user
from app.models.db_models import AuditLog, KnowledgeItem, ReviewStatus, User, UserRole
from app.schemas import KnowledgeCreate, ReviewRequest

router = APIRouter(prefix="/knowledge", tags=["knowledge"])

@router.post("")
def submit(data: KnowledgeCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    status = ReviewStatus.approved if user.role == UserRole.owner else ReviewStatus.pending
    item = KnowledgeItem(subject=data.subject, statement=data.statement, status=status, submitted_by=user.id)
    if status == ReviewStatus.approved:
        item.reviewed_by = user.id
        item.reviewed_at = datetime.now(timezone.utc)
    db.add(item); db.flush()
    db.add(AuditLog(actor_id=user.id, action="knowledge_submit", entity_type="knowledge", entity_id=item.id, details=f"status={status.value}"))
    db.commit()
    return {"id": item.id, "status": item.status.value}

@router.get("/pending")
def pending(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role not in (UserRole.owner, UserRole.teacher):
        raise HTTPException(status_code=403, detail="غير مصرح")
    items = db.scalars(select(KnowledgeItem).where(KnowledgeItem.status == ReviewStatus.pending).order_by(KnowledgeItem.created_at)).all()
    return [{"id": x.id, "subject": x.subject, "statement": x.statement, "submitted_by": x.submitted_by} for x in items]

@router.post("/{item_id}/review")
def review(item_id: str, data: ReviewRequest, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.owner:
        raise HTTPException(status_code=403, detail="المالك فقط يستطيع الاعتماد النهائي")
    item = db.get(KnowledgeItem, item_id)
    if not item or item.status != ReviewStatus.pending:
        raise HTTPException(status_code=404, detail="الاقتراح غير موجود أو تمت مراجعته")
    if data.corrected_statement:
        item.statement = data.corrected_statement
    item.status = ReviewStatus(data.decision)
    item.reviewed_by = user.id
    item.reviewed_at = datetime.now(timezone.utc)
    db.add(AuditLog(actor_id=user.id, action=f"knowledge_{data.decision}", entity_type="knowledge", entity_id=item.id, details="owner review"))
    db.commit()
    return {"id": item.id, "status": item.status.value}
