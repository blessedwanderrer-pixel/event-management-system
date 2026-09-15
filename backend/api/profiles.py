from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_profile
from models import Profile
from schemas import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=ProfileResponse)
def get_profile(profile: Profile = Depends(get_current_profile)):
    return profile


@router.patch("/me", response_model=ProfileResponse)
def update_profile(data: ProfileUpdate, profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    profile.full_name = data.full_name.strip()
    profile.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(profile)
    return profile
