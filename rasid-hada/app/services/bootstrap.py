from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.security import hash_password
from app.models.db_models import User, UserRole

def ensure_owner(db:Session):
    if not settings.owner_email or not settings.owner_initial_password:
        return None
    owner=db.scalar(select(User).where(User.role==UserRole.owner))
    if owner:
        return owner
    owner=User(email=settings.owner_email,password_hash=hash_password(settings.owner_initial_password),role=UserRole.owner)
    db.add(owner); db.commit(); db.refresh(owner)
    return owner
