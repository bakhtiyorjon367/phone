from fastapi import HTTPException

from models.batch import Batch
from models.budget import Budget
from models.phone import Phone, PhoneStatus
from schemas.api_schemas import CreateBatchRequest


async def create(req: CreateBatchRequest):
    # Verify phones exist and are in Korea
    phones = []
    for pid in req.phone_ids:
        phone = await Phone.get(pid)
        if not phone or phone.status != PhoneStatus.IN_KOREA:
            raise HTTPException(status_code=400, detail=f"Phone {pid} is not available in Korea stock.")
        phones.append(phone)
    # Deduct total delivery fee from budget
    budget = await Budget.find_one()
    budget.current_cash -= req.total_delivery_fee
    await budget.save()

    # Calculate fee per phone
    per_phone_fee = req.total_delivery_fee // len(phones)

    # Create Batch
    batch = Batch(**req.model_dump())
    await batch.insert()

    # Update phone status & assign delivery share
    for phone in phones:
        phone.delivery_share = per_phone_fee
        phone.status = PhoneStatus.IN_TRANSIT
        phone.batch_id = batch.id
        await phone.save()

    return batch
