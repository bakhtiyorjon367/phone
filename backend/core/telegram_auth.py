"""Telegram Mini App authentication.

The frontend runs inside Telegram's WebView and sends Telegram's signed
`initData` string (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
on every request as `Authorization: tma <initData>`. We verify its HMAC
signature with the bot token, auto-provision a `User` document the first
time we see a given telegram_id, and expose FastAPI dependencies that
routes use to require a logged-in user (`get_current_user`) or an admin
(`require_admin`).
"""
import hashlib
import hmac
import json
import os
import time
from typing import Optional
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException

from models.user import User, UserRole

# Telegram recommends rejecting stale initData; a Mini App session shouldn't
# realistically be replayed a day later.
MAX_INIT_DATA_AGE_SECONDS = 24 * 60 * 60


def _parse_and_verify_init_data(init_data: str, bot_token: str) -> dict:
    parsed = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = parsed.pop("hash", None)
    if not received_hash:
        raise ValueError("initData is missing its hash")

    data_check_string = "\n".join(f"{key}={value}" for key, value in sorted(parsed.items()))
    secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, received_hash):
        raise ValueError("initData signature is invalid")

    auth_date = int(parsed.get("auth_date", 0))
    if time.time() - auth_date > MAX_INIT_DATA_AGE_SECONDS:
        raise ValueError("initData has expired")

    return parsed


async def get_current_user(authorization: Optional[str] = Header(None)) -> User:
    if not authorization or not authorization.startswith("tma "):
        raise HTTPException(status_code=401, detail="Expected 'Authorization: tma <initData>' header")

    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=500, detail="TELEGRAM_BOT_TOKEN is not configured on the server")

    init_data = authorization.removeprefix("tma ").strip()
    try:
        parsed = _parse_and_verify_init_data(init_data, bot_token)
        tg_user = json.loads(parsed["user"])
        telegram_id = int(tg_user["id"])
    except (ValueError, KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=401, detail=f"Invalid Telegram auth: {exc}")

    telegram_username = tg_user.get("username")

    user = await User.find_one(User.telegram_id == telegram_id)
    if not user:
        # The very first person to ever open the app becomes admin, so
        # there's always at least one admin able to promote others later.
        is_first_user = await User.find_one() is None
        user = User(
            telegram_id=telegram_id,
            telegram_username=telegram_username,
            display_name=tg_user.get("first_name"),
            role=UserRole.ADMIN if is_first_user else UserRole.USER,
        )
        await user.insert()
    elif user.telegram_username != telegram_username:
        # telegram_username is locked from user edits, but keep it in sync
        # with whatever Telegram itself reports.
        user.telegram_username = telegram_username
        await user.save()

    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin role required")
    return user
