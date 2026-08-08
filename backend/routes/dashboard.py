from fastapi import APIRouter, Depends

from core.telegram_auth import require_admin
from services.dashboard_service import dashboard

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"], dependencies=[Depends(require_admin)])


@router.get("")
async def get_dashboard():
    result = await dashboard()
    return result
