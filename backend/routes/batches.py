from fastapi import APIRouter, Depends

from core.telegram_auth import require_admin
from models.batch import Batch
from schemas.api_schemas import CreateBatchRequest

router = APIRouter(prefix="/api/batches", tags=["Batches"], dependencies=[Depends(require_admin)])
from services.batches_service import create


@router.post("/create")
async def create_batch(req: CreateBatchRequest):
    result = await create(req)
    return result


@router.get("/all")
async def get_all_batches():
    return await Batch.find_all().sort("-created_at").to_list()
