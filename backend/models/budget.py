from datetime import datetime, timezone
from beanie import Document
from pydantic import Field

class Budget(Document):
    current_cash: int
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "budget"