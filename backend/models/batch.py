from datetime import datetime, timezone
from typing import List, Optional
from beanie import Document, PydanticObjectId
from pydantic import Field

class Batch(Document):
    courier_name: str
    courier_phone: Optional[str] = None
    telegram_handle: Optional[str] = None
    flight_date: str
    courier_details: str
    total_delivery_fee: int
    phone_ids: List[PydanticObjectId]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "batches"