from pydantic import BaseModel, EmailStr, Field

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class KnowledgeCreate(BaseModel):
    subject: str = Field(min_length=2, max_length=200)
    statement: str = Field(min_length=2, max_length=4000)

class ReviewRequest(BaseModel):
    decision: str = Field(pattern="^(approved|rejected)$")
    corrected_statement: str | None = Field(default=None, max_length=4000)
