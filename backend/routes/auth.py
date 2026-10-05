import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from db import query
from middleware import clear_auth_cookie, require_auth, set_auth_cookie, sign_user

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginBody(BaseModel):
    username: str = ""
    password: str = ""


@router.post("/login")
def login(body: LoginBody, response: Response):
    username = (body.username or "").strip()
    password = body.password or ""
    if not username or not password:
        raise HTTPException(status_code=400, detail="Username and password required")
    rows = query(
        """
        SELECT u.*, c.is_active AS clinic_active
        FROM users u
        JOIN clinics c ON c.id = u.clinic_id
        WHERE u.username = %s
        """,
        [username],
    )
    if len(rows) != 1:
        raise HTTPException(status_code=401, detail="Invalid login")
    user = rows[0]
    if not user["is_active"] or not user["clinic_active"]:
        raise HTTPException(status_code=401, detail="Account disabled")
    hashed = user["password_hash"]
    if isinstance(hashed, str):
        hashed = hashed.encode("utf-8")
    if not bcrypt.checkpw(password.encode("utf-8"), hashed):
        raise HTTPException(status_code=401, detail="Invalid login")
    set_auth_cookie(response, sign_user(user))
    return {
        "user": {
            "id": str(user["id"]),
            "clinicId": str(user["clinic_id"]),
            "role": user["role"],
            "name": user["name"],
            "username": user["username"],
        }
    }


@router.post("/logout")
def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(require_auth)):
    return {"user": user}
