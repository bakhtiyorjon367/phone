from datetime import datetime, timezone
from typing import List

from beanie import Document, PydanticObjectId
from pydantic import Field


class Settlement(Document):
    """One record per 'Confirm Payment' action - the phones settled together
    and the total money received for them in that action."""

    phone_ids: List[PydanticObjectId]
    total_recovered: int
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "settlements"
