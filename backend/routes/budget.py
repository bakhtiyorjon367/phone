from fastapi import APIRouter, Depends
from datetime import datetime, timezone
from core.telegram_auth import require_admin
from models.budget import Budget
from schemas.api_schemas import BudgetAdjustRequest

router = APIRouter(prefix="/api/budget", tags=["Budget"], dependencies=[Depends(require_admin)])


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