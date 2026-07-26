from fastapi import APIRouter
from datetime import datetime, timezone
from models.budget import Budget
from schemas.api_schemas import BudgetAdjustRequest

router = APIRouter(prefix="/api/budget", tags=["Budget"])


@router.post("/adjust")
async def adjust_budget(req: BudgetAdjustRequest):
    budget = await Budget.find_one()

    if req.adjustment_type.upper() == "ADD":
        budget.current_cash += req.amount
    elif req.adjustment_type.upper() == "WITHDRAW":
        budget.current_cash -= req.amount

    budget.updated_at = datetime.now(timezone.utc)
    await budget.save()
    return budget