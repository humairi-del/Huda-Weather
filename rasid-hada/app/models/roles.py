from enum import Enum

class Role(str, Enum):
    owner = "owner"
    teacher = "teacher"
    visitor = "visitor"

TEACHER_LIMIT = 5
DEFAULT_VISITOR_DAILY_MESSAGES = 10
