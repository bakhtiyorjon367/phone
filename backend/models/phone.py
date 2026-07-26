from enum import Enum
from datetime import datetime, timezone
from beanie import Document, PydanticObjectId
from pydantic import Field
from typing import Optional

class PhoneStatus(str, Enum):
    IN_KOREA = "IN_KOREA"
    IN_TRANSIT = "IN_TRANSIT"
    SETTLED = "SETTLED"

class Phone(Document):
    label: str
    purchase_cost: int
    delivery_share: int = 0
    profit: int = 50000
    status: PhoneStatus = PhoneStatus.IN_KOREA
    batch_id: Optional[PydanticObjectId] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @property
    def target_receivable(self) -> int:
        return self.purchase_cost + self.delivery_share + self.profit

    class Settings:
        name = "phones"