from decimal import Decimal

import httpx2
import pytest
from sqlalchemy import select

from app.config import get_settings
from app.db.models import PasswordReset
from app.db.session import get_session
from app.game import password
from app.game.accounts import LOGIN_LIMITER, SIGNUP_LIMITER
from app.game.api import shown_price
from app.main import app


@pytest.fixture
async def api(session):
    """HTTPS client with the test session."""
    for limiter in (SIGNUP_LIMITER, LOGIN_LIMITER, password.FORGOT_LIMITER):
        limiter.hits.clear()
    app.dependency_overrides[get_session] = lambda: session
    app.dependency_overrides[shown_price] = lambda: Decimal(80_000)
    transport = httpx2.ASGITransport(app=app)
    async with httpx2.AsyncClient(transport=transport, base_url="https://test") as c:
        yield c
    app.dependency_overrides.clear()


async def join(api, nickname="satoshi", email="Satoshi@Example.com"):
    body = {"nickname": nickname, "password": "old", "email": email}
    return await api.post("/api/game/players", json=body)


async def forgot(api, nickname="Satoshi", email="satoshi@example.COM"):
    body = {"nickname": nickname, "email": email}
    return await api.post("/api/game/password/forgot", json=body)


async def login(api, pw):
    body = {"nickname": "satoshi", "password": pw}
    return (await api.post("/api/game/login", json=body)).status_code


async def test_a_second_account_with_the_same_email_is_refused(api):
    assert (await join(api)).status_code == 201

    response = await join(api, nickname="other", email="satoshi@example.COM")

    assert response.status_code == 409
    assert response.json()["detail"] == "Email taken"


async def test_forgot_sets_a_new_working_password_and_logs_both(api, session):
    await join(api)

    assert (await forgot(api)).status_code == 204

    reset = await session.scalar(select(PasswordReset))
    assert reset.old_password == "old"
    assert len(reset.new_password) == 10
    assert await login(api, "old") == 401
    assert await login(api, reset.new_password) == 200


@pytest.mark.parametrize(
    ("nickname", "email"),
    [("satoshi", "other@example.com"), ("other", "satoshi@example.com")],
)
async def test_forgot_changes_nothing_unless_both_match(api, session, nickname, email):
    await join(api)
    await join(api, nickname="other", email="other@example.com")

    assert (await forgot(api, nickname, email)).status_code == 204

    assert await session.scalar(select(PasswordReset)) is None
    assert await login(api, "old") == 200


async def test_forgot_skips_the_admin_account(api, session, monkeypatch):
    await join(api)
    monkeypatch.setattr(get_settings(), "admin_nickname", "satoshi")

    assert (await forgot(api)).status_code == 204

    assert await session.scalar(select(PasswordReset)) is None
    assert await login(api, "old") == 200


async def test_the_admin_sees_the_resets(api, monkeypatch):
    await join(api)
    await forgot(api)
    monkeypatch.setattr(get_settings(), "admin_token", "secret")

    response = await api.get("/api/admin/resets", headers={"X-Admin-Token": "secret"})

    [row] = response.json()
    assert row["nickname"] == "satoshi" and row["old_password"] == "old"


async def test_forgot_is_limited_per_ip(api):
    for _ in range(5):
        await forgot(api)

    assert (await forgot(api)).status_code == 429
