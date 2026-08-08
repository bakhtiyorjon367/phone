from typing import List, Optional

from beanie import PydanticObjectId
from pydantic import BaseModel, conlist


class BuyPhoneRequest(BaseModel):
    label: str
    purchase_cost: int


class CreateBatchRequest(BaseModel):
    phone_ids: conlist(PydanticObjectId, min_length=1, max_length=3)  # Strict Max 3 constraint
    total_delivery_fee: int
    courier_name: str
    courier_phone: Optional[str] = None
    telegram_handle: Optional[str] = None
    flight_date: str
    courier_details: str


class SettlePhonesRequest(BaseModel):
    phone_ids: List[PydanticObjectId]


class BudgetAdjustRequest(BaseModel):
    amount: int
    adjustment_type: str  # "ADD" or "WITHDRAW"


class UserUpdateRequest(BaseModel):
    # Deliberately excludes telegram_username/telegram_id/role - those are
    # not user-editable.
    display_name: Optional[str] = None
    bio: Optional[str] = None
