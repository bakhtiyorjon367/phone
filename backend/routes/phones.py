from fastapi import APIRouter

from models.phone import Phone, PhoneStatus
from schemas.api_schemas import BuyPhoneRequest, SettlePhonesRequest
from services import phones_service

router = APIRouter(prefix="/api/phones", tags=["Phones"])


@router.post("/buy")
async def buy_phone(req: BuyPhoneRequest):
    cost = req.purchase_cost
    label = req.label
    phone = await phones_service.create(cost, label)
    return phone


@router.get("/in-korea")
async def get_korea_stock():
    return await Phone.find(Phone.status == PhoneStatus.IN_KOREA).to_list()


@router.get("/unsettled")
async def get_unsettled_phones():
    return await Phone.find(Phone.status == PhoneStatus.IN_TRANSIT).to_list()


@router.post("/settle")
async def settle_phones(req: SettlePhonesRequest):
    result = await phones_service.settle(req.phone_ids)
    return {"status": "success", "recovered_amount": result.total_recovered, "new_liquid_cash": result.current_cash}


@router.get("/all")
async def get_all_phones():
    return await Phone.find_all().sort("-created_at").to_list()
