from fastapi import APIRouter, Depends

from core.telegram_auth import require_admin
from models.settlement import Settlement

router = APIRouter(prefix="/api/settlements", tags=["Settlements"], dependencies=[Depends(require_admin)])


@router.get("/all")
async def get_all_settlements():
    # Oldest first, so the frontend can render them top (old) -> bottom (new).
    return await Settlement.find_all().sort("+created_at").to_list()
