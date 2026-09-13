import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from dotenv import load_dotenv
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from dependencies import get_current_profile
from schemas import LoginRequest, PasswordResetRequest, PasswordUpdateRequest, ProfileResponse, SignupRequest
from supabase_client import SUPABASE_KEY, SUPABASE_URL, supabase

load_dotenv()
PASSWORD_RESET_REDIRECT_URL = os.getenv("PASSWORD_RESET_REDIRECT_URL", "http://127.0.0.1:5173/reset-password")
AUTH_CONFIRMATION_REDIRECT_URL = os.getenv("AUTH_CONFIRMATION_REDIRECT_URL", "http://127.0.0.1:5173/login")
reset_bearer = HTTPBearer(auto_error=False)


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest):
    try:
        response = supabase.auth.sign_up(
            {
                "email": data.email,
                "password": data.password,
                "options": {
                    "data": {
                        "full_name": data.full_name
                    },
                    "email_redirect_to": AUTH_CONFIRMATION_REDIRECT_URL,
                }
            }
        )

        return {
            "message": "Account created. Please check your email to confirm your account." if response.session is None else "Signup successful",
            "user": response.user,
            "session": response.session,
        }

    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Unable to create account. Check the email and password, or try another email.",
        )


@router.post("/login")
def login(data: LoginRequest):
    try:
        response = supabase.auth.sign_in_with_password(
            {
                "email": data.email,
                "password": data.password,
            }
        )

        return {
            "message": "Login successful",
            "user": response.user,
            "session": response.session,
        }

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password",
        )


@router.post("/forgot-password")
def forgot_password(data: PasswordResetRequest):
    try:
        supabase.auth.reset_password_for_email(
            data.email,
            options={"redirect_to": PASSWORD_RESET_REDIRECT_URL},
        )
    except Exception:
        pass
    return {"message": "If an account exists for that email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(
    data: PasswordUpdateRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(reset_bearer),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Reset session is missing or expired")
    try:
        response = httpx.put(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {credentials.credentials}",
                "Content-Type": "application/json",
            },
            json={"password": data.password},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Password reset service is unavailable") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail="Reset link is invalid or expired")
    return {"message": "Password updated. You can now log in."}


@router.get("/me", response_model=ProfileResponse)
def me(profile=Depends(get_current_profile)):
    return profile