import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, Request, Response

from db import query

COOKIE = "clinic_token"

class AppError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status


def sign_user(user: dict) -> str:
    secret = os.getenv("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET is not set")
    payload = {
        "id": str(user["id"]),
        "clinicId": str(user.get("clinic_id") or user.get("clinicId")),
        "role": user["role"],
        "name": user["name"],
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=os.getenv("NODE_ENV") == "production",
        max_age=12 * 60 * 60,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(COOKIE, path="/")


def require_auth(request: Request) -> dict:
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in")
    secret = os.getenv("JWT_SECRET")
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Not logged in") from None

    rows = query(
        """
        SELECT u.id, u.clinic_id, u.role, u.name, u.username, u.is_active,
               c.is_active AS clinic_active
        FROM users u
        JOIN clinics c ON c.id = u.clinic_id
        WHERE u.id = %s
        """,
        [payload["id"]],
    )
    user = rows[0] if rows else None
    if not user or not user["is_active"] or not user["clinic_active"]:
        raise HTTPException(status_code=401, detail="Account disabled")

    current = {
        "id": str(user["id"]),
        "clinicId": str(user["clinic_id"]),
        "role": user["role"],
        "name": user["name"],
        "username": user["username"],
    }
    request.state.user = current
    return current


def require_role(*roles: str):
    def dependency(user: dict = Depends(require_auth)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Not allowed")
        return user

    return dependency
