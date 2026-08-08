from fastapi import APIRouter, Depends

from core.telegram_auth import get_current_user
from models.user import User
from schemas.api_schemas import UserUpdateRequest

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get("/me")
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me")
async def update_me(req: UserUpdateRequest, user: User = Depends(get_current_user)):
    if req.display_name is not None:
        user.display_name = req.display_name
    if req.bio is not None:
        user.bio = req.bio
    await user.save()
    return user
