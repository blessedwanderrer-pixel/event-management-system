from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import Profile
from supabase_client import supabase


bearer_scheme = HTTPBearer(auto_error=False)


def get_current_profile(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Profile:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    try:
        response = supabase.auth.get_user(credentials.credentials)
        user = response.user
        user_id = UUID(str(user.id)) if user else None
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired access token") from error

    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")

    profile = db.scalar(select(Profile).where(Profile.id == user_id))
    if profile is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profile is not available")
    return profile


def require_admin(profile: Profile = Depends(get_current_profile)) -> Profile:
    if profile.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return profile