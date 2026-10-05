from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.core.security import hash_password
from app.models.db_models import User, UserRole

MAX_TEACHERS = 5

def create_teacher(db: Session, email: str, password: str) -> User:
    count = db.scalar(select(func.count()).select_from(User).where(User.role == UserRole.teacher)) or 0
    if count >= MAX_TEACHERS:
        raise HTTPException(status_code=409, detail="تم الوصول إلى الحد الأقصى: خمسة معلّمين")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status_code=409, detail="الحساب موجود")
    user = User(email=email, password_hash=hash_password(password), role=UserRole.teacher)
    db.add(user); db.commit(); db.refresh(user)
    return user
