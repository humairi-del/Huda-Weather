from enum import Enum
from datetime import datetime
from pydantic import BaseModel, Field

class KnowledgeStatus(str, Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"

class KnowledgeProposal(BaseModel):
    subject: str = Field(min_length=2, max_length=200)
    statement: str = Field(min_length=2, max_length=4000)
    source_note: str | None = Field(default=None, max_length=1000)

class KnowledgeRecord(KnowledgeProposal):
    id: str
    status: KnowledgeStatus
    submitted_by: str
    reviewed_by: str | None = None
    created_at: datetime
    reviewed_at: datetime | None = None
