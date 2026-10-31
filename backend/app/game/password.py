"""Forgotten password: nickname and email in, a working new password out to the admin.

No email is sent (Gmail needs two-step verification; Hootan's choice, 2026-11-01).
When both match, a new password is set at once and logged with the old one in
password_resets; Hootan reads it in the admin panel and emails it by hand. The
answer is the same whether or not they match, and the admin account is skipped.
"""

import secrets
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import PasswordReset, Player
from app.db.session import get_session
from app.game.accounts import Nickname
from app.game.api import check_limit
from app.game.players import is_admin
from app.security.rate_limit import RateLimiter

router = APIRouter(prefix="/api/game/password")

FORGOT_LIMITER = RateLimiter(5, timedelta(hours=1))
# No 0/O or 1/l/I, so the password reads safely in an email.
ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"


class Forgot(BaseModel):
    nickname: Nickname
    email: EmailStr


def new_password() -> str:
    """Ten random characters from ALPHABET."""
    return "".join(secrets.choice(ALPHABET) for _ in range(10))


@router.post("/forgot", status_code=204)
async def forgot(
    body: Forgot,
    request: Request,
    session: Annotated[AsyncSession, Depends(get_session)],
) -> None:
    """Replace the password of the matching player and log both for the admin."""
    check_limit(FORGOT_LIMITER, request)
    player = await session.scalar(
        select(Player).where(
            func.lower(Player.nickname) == body.nickname.lower(),
            func.lower(Player.email) == body.email.lower(),
        )
    )
    if player is None or is_admin(player):
        return
    password = new_password()
    session.add(
        PasswordReset(
            player_id=player.id, old_password=player.password, new_password=password
        )
    )
    player.password = password
    await session.commit()
