from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from beanie import Document, Indexed
from pydantic import Field


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class User(Document):
    telegram_id: Indexed(int, unique=True)
    telegram_username: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    role: UserRole = UserRole.USER
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
