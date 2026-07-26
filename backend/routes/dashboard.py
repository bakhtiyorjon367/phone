from fastapi import APIRouter

from services.dashboard_service import dashboard

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/")
async def get_dashboard():
    result = await dashboard()
    return result
