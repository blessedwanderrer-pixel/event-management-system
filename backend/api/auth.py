import os

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from dotenv import load_dotenv
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_profile
from models import Profile
from schemas import (
    EmailChangeRequest,
    LoginRequest,
    PasswordChangeRequest,
    PasswordResetRequest,
    PasswordUpdateRequest,
    ProfileResponse,
    RefreshRequest,
    SignupRequest,
    VerifyTokenRequest,
)
from supabase_client import SUPABASE_KEY, SUPABASE_URL, create_auth_client

load_dotenv()
reset_bearer = HTTPBearer(auto_error=False)


def public_app_url() -> str:
    explicit = os.getenv("PUBLIC_APP_URL", "").strip().rstrip("/")
    if explicit:
        return explicit
    origins = [
        origin.strip().rstrip("/")
        for origin in os.getenv("FRONTEND_ORIGINS", "").split(",")
        if origin.strip()
    ]
    https_origins = [origin for origin in origins if origin.startswith("https://")]
    if https_origins:
        return https_origins[0]
    if origins:
        return origins[0]
    return "http://127.0.0.1:5173"


def configured_redirect(env_name: str, path: str) -> str:
    configured = os.getenv(env_name, "").strip()
    if configured:
        return configured
    return f"{public_app_url()}{path}"


PASSWORD_RESET_REDIRECT_URL = configured_redirect("PASSWORD_RESET_REDIRECT_URL", "/reset-password")
AUTH_CONFIRMATION_REDIRECT_URL = configured_redirect("AUTH_CONFIRMATION_REDIRECT_URL", "/auth/callback")
EMAIL_CHANGE_REDIRECT_URL = configured_redirect("EMAIL_CHANGE_REDIRECT_URL", "/auth/callback")


router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


def session_payload(session) -> dict | None:
    if session is None:
        return None
    access_token = getattr(session, "access_token", None)
    if not access_token:
        return None
    return {
        "access_token": access_token,
        "refresh_token": getattr(session, "refresh_token", None),
        "expires_in": getattr(session, "expires_in", None),
        "token_type": getattr(session, "token_type", None) or "bearer",
    }


def auth_error_detail(error: Exception, fallback: str) -> str:
    message = str(getattr(error, "message", "") or error).lower()
    code = str(getattr(error, "code", "") or "").lower()
    status = str(getattr(error, "status", "") or "")
    combined = f"{message} {code} {status}"
    if "already registered" in combined or "user already exists" in combined:
        return "An account with this email already exists. Try logging in, or reset your password."
    if "email not confirmed" in combined or "not confirmed" in combined:
        return "Please confirm your email before logging in. Check your inbox for the confirmation link."
    if "invalid login" in combined or "invalid credentials" in combined:
        return "Invalid email or password. If you do not have an account yet, create one."
    if "same password" in combined:
        return "Choose a password that is different from your current password."
    if "password" in combined and ("least" in combined or "weak" in combined or "characters" in combined):
        return "Password does not meet security requirements. Use at least 8 characters."
    # Email delivery limits are project-wide in Supabase Auth. Do not phrase them
    # as if this specific visitor personally submitted too many attempts.
    if "over_email_send_rate_limit" in combined or (
        "email" in combined and "rate limit" in combined
    ):
        return (
            "Email delivery is temporarily rate-limited. "
            "Please wait a minute and try again."
        )
    if (
        "rate limit" in combined
        or "over_request" in combined
        or status == "429"
    ):
        return "Too many attempts. Please wait a minute and try again."
    return fallback


def auth_error_status(error: Exception, default: int = 400) -> int:
    status = getattr(error, "status", None)
    code = str(getattr(error, "code", "") or "").lower()
    message = str(getattr(error, "message", "") or error).lower()
    status_code = None
    try:
        status_code = int(status) if status is not None else None
    except (TypeError, ValueError):
        status_code = None
    if status_code == 429 or "rate limit" in message or "over_email_send_rate_limit" in code or str(status) == "429":
        return 429
    if "already registered" in message or "user already exists" in message:
        return 409
    return default


def supabase_identities(user) -> list:
    identities = getattr(user, "identities", None) if user is not None else None
    if identities is None:
        return []
    return list(identities)


def gotrue_headers(access_token: str | None = None) -> dict[str, str]:
    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def parse_gotrue_error(response: httpx.Response, fallback: str) -> str:
    payload = {}
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    message = str(payload.get("msg") or payload.get("message") or payload.get("error_description") or "")
    if message:
        try:
            raise RuntimeError(message)
        except RuntimeError as error:
            return auth_error_detail(error, fallback)
    return fallback


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(data: SignupRequest):
    auth_client = create_auth_client()
    session = None
    try:
        response = auth_client.auth.sign_up(
            {
                "email": str(data.email),
                "password": data.password,
                "options": {
                    "data": {
                        "full_name": data.full_name.strip(),
                    },
                    "email_redirect_to": AUTH_CONFIRMATION_REDIRECT_URL,
                },
            }
        )
        user = getattr(response, "user", None)
        session = session_payload(getattr(response, "session", None))
        duplicate_identity = user is not None and session is None and not supabase_identities(user)
    except Exception as error:
        raise HTTPException(
            status_code=auth_error_status(error, 400),
            detail=auth_error_detail(
                error,
                "Unable to create account. Check the email and password, or try another email.",
            ),
        ) from error
    finally:
        # Never revoke a session we are returning to the browser.
        if session is None:
            try:
                auth_client.auth.sign_out()
            except Exception:
                pass

    if duplicate_identity:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Try logging in, or reset your password.",
        )

    return {
        "message": (
            "Account created. Please check your email to confirm your account before logging in."
            if session is None
            else "Signup successful"
        ),
        "session": session,
        "requires_confirmation": session is None,
    }


@router.post("/login")
def login(data: LoginRequest):
    auth_client = create_auth_client()
    session = None
    try:
        response = auth_client.auth.sign_in_with_password(
            {
                "email": str(data.email),
                "password": data.password,
            }
        )
        session = session_payload(getattr(response, "session", None))
    except Exception as error:
        raise HTTPException(
            status_code=401,
            detail=auth_error_detail(error, "Invalid email or password. If you do not have an account yet, create one."),
        ) from error
    finally:
        # sign_out() deletes the Auth session row. Calling it here made the
        # returned access token fail /auth/me with session_not_found.
        pass

    if session is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. If you do not have an account yet, create one.",
        )
    return {"message": "Login successful", "session": session}


@router.post("/forgot-password")
def forgot_password(data: PasswordResetRequest):
    auth_client = create_auth_client()
    try:
        auth_client.auth.reset_password_for_email(
            str(data.email),
            options={"redirect_to": PASSWORD_RESET_REDIRECT_URL},
        )
    except Exception:
        pass
    finally:
        try:
            auth_client.auth.sign_out()
        except Exception:
            pass
    return {"message": "If an account exists for that email, a password reset link has been sent."}


@router.post("/reset-password")
def reset_password(
    data: PasswordUpdateRequest,
    credentials: HTTPAuthorizationCredentials | None = Depends(reset_bearer),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="This reset link is missing or expired. Please request a new one.")
    try:
        response = httpx.put(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=gotrue_headers(credentials.credentials),
            json={"password": data.password},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Password reset service is unavailable") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=parse_gotrue_error(
            response,
            "Reset link is invalid or expired. Please request a new one.",
        ))
    return {"message": "Password updated. You can now log in."}


@router.post("/verify")
def verify_token(data: VerifyTokenRequest):
    try:
        response = httpx.post(
            f"{SUPABASE_URL}/auth/v1/verify",
            headers=gotrue_headers(),
            json={"type": data.type, "token_hash": data.token_hash},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Authentication service is unavailable") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=parse_gotrue_error(
            response,
            "This link is invalid or expired. Please request a new one.",
        ))
    payload = response.json()
    session = payload.get("session") if isinstance(payload, dict) else None
    if not isinstance(session, dict) or not session.get("access_token"):
        access_token = payload.get("access_token") if isinstance(payload, dict) else None
        refresh_token = payload.get("refresh_token") if isinstance(payload, dict) else None
        if access_token:
            session = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "expires_in": payload.get("expires_in"),
                "token_type": payload.get("token_type") or "bearer",
            }
        else:
            raise HTTPException(status_code=400, detail="This link is invalid or expired. Please request a new one.")
    return {
        "message": "Authentication confirmed.",
        "session": {
            "access_token": session.get("access_token"),
            "refresh_token": session.get("refresh_token"),
            "expires_in": session.get("expires_in"),
            "token_type": session.get("token_type") or "bearer",
        },
        "type": data.type,
    }


@router.post("/refresh")
def refresh_session(data: RefreshRequest):
    try:
        response = httpx.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
            headers=gotrue_headers(),
            json={"refresh_token": data.refresh_token},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Authentication service is unavailable") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    payload = response.json()
    access_token = payload.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    return {
        "message": "Session refreshed",
        "session": {
            "access_token": access_token,
            "refresh_token": payload.get("refresh_token") or data.refresh_token,
            "expires_in": payload.get("expires_in"),
            "token_type": payload.get("token_type") or "bearer",
        },
    }


@router.post("/change-password")
def change_password(
    data: PasswordChangeRequest,
    profile: Profile = Depends(get_current_profile),
    credentials: HTTPAuthorizationCredentials | None = Depends(reset_bearer),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        verify_response = httpx.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers=gotrue_headers(),
            json={"email": profile.email, "password": data.current_password},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Authentication service is unavailable") from error
    if verify_response.status_code >= 400:
        raise HTTPException(status_code=401, detail="Current password is incorrect.")
    try:
        response = httpx.put(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=gotrue_headers(credentials.credentials),
            json={"password": data.new_password},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Authentication service is unavailable") from error
    if response.status_code >= 400:
        raise HTTPException(status_code=400, detail=parse_gotrue_error(
            response,
            "Unable to update password. Please try again.",
        ))
    return {"message": "Password updated. Use your new password the next time you log in."}


@router.post("/change-email")
def change_email(
    data: EmailChangeRequest,
    profile: Profile = Depends(get_current_profile),
    credentials: HTTPAuthorizationCredentials | None = Depends(reset_bearer),
    db: Session = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    new_email = str(data.email).strip().lower()
    if new_email == profile.email.lower():
        raise HTTPException(status_code=400, detail="That is already your current email address.")
    try:
        response = httpx.put(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=gotrue_headers(credentials.credentials),
            params={"redirect_to": EMAIL_CHANGE_REDIRECT_URL},
            json={"email": new_email},
            timeout=10,
        )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Authentication service is unavailable") from error
    if response.status_code >= 400:
        detail = parse_gotrue_error(
            response,
            "Unable to start the email change. That address may already be in use.",
        )
        raise HTTPException(
            status_code=429 if response.status_code == 429 or "too many" in detail.lower() or "rate limit" in detail.lower() else 400,
            detail=detail,
        )

    payload = {}
    try:
        payload = response.json()
    except ValueError:
        payload = {}
    user = payload.get("user") if isinstance(payload, dict) else None
    current_email = ""
    email_change = ""
    if isinstance(user, dict):
        current_email = str(user.get("email") or "")
        email_change = str(user.get("new_email") or user.get("email_change") or "")
    confirmation_required = bool(email_change) or (current_email.lower() != new_email)

    if not confirmation_required and current_email.lower() == new_email:
        profile.email = new_email
        db.commit()
        db.refresh(profile)
        return {
            "message": "Email updated.",
            "requires_confirmation": False,
            "profile": ProfileResponse.model_validate(profile),
        }

    return {
        "message": (
            f"Check {new_email} to confirm the change. "
            "Your current email stays active until you confirm the new one."
        ),
        "requires_confirmation": True,
        "pending_email": new_email,
    }


@router.post("/logout")
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(reset_bearer)):
    if credentials is not None:
        try:
            httpx.post(
                f"{SUPABASE_URL}/auth/v1/logout",
                headers=gotrue_headers(credentials.credentials),
                timeout=10,
            )
        except httpx.HTTPError:
            pass
    return {"message": "Logged out"}


@router.get("/me", response_model=ProfileResponse)
def me(profile=Depends(get_current_profile)):
    return profile
