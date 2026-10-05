from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import current_user
from app.models.db_models import User, UserRole
from app.services.user_admin import create_teacher

router=APIRouter(prefix="/admin",tags=["admin"])

class TeacherCreate(BaseModel):
    email: EmailStr
    password: str=Field(min_length=12,max_length=128)

def owner_only(user: User):
    if user.role != UserRole.owner:
        raise HTTPException(status_code=403,detail="المالك فقط يستطيع تنفيذ هذا الإجراء")

@router.get("/teachers")
def list_teachers(user:User=Depends(current_user),db:Session=Depends(get_db)):
    owner_only(user)
    rows=db.scalars(select(User).where(User.role==UserRole.teacher).order_by(User.created_at)).all()
    return [{"id":x.id,"email":x.email,"active":x.active,"created_at":x.created_at} for x in rows]

@router.post("/teachers")
def add_teacher(data:TeacherCreate,user:User=Depends(current_user),db:Session=Depends(get_db)):
    owner_only(user)
    created=create_teacher(db,data.email,data.password)
    return {"id":created.id,"email":created.email,"role":created.role.value}

@router.patch("/teachers/{teacher_id}/active")
def set_teacher_active(teacher_id:str,active:bool,user:User=Depends(current_user),db:Session=Depends(get_db)):
    owner_only(user)
    teacher=db.get(User,teacher_id)
    if not teacher or teacher.role != UserRole.teacher:
        raise HTTPException(status_code=404,detail="المعلّم غير موجود")
    teacher.active=active
    db.commit()
    return {"id":teacher.id,"active":teacher.active}
