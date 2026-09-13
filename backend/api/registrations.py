from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import get_current_profile
from models import Event, Profile, Registration
from schemas import EventResponse, RegistrationResponse


router = APIRouter(prefix="/registrations", tags=["Registrations"])


def event_response(event: Event, active_count: int) -> EventResponse:
    return EventResponse(
        **{column.name: getattr(event, column.name) for column in Event.__table__.columns},
        active_registrations=active_count,
        available_spots=max(event.capacity - active_count, 0),
    )


def registration_response(registration: Registration, db: Session) -> RegistrationResponse:
    count = db.scalar(select(func.count(Registration.id)).where(
        Registration.event_id == registration.event.id,
        Registration.status == "active",
    )) or 0
    return RegistrationResponse(
        id=registration.id,
        event_id=registration.event_id,
        status=registration.status,
        created_at=registration.created_at,
        updated_at=registration.updated_at,
        event=event_response(registration.event, count),
    )


@router.post("", response_model=RegistrationResponse, status_code=status.HTTP_201_CREATED)
def register(event_id: UUID, profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    event = db.scalar(select(Event).where(Event.id == event_id).with_for_update())
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    if event.status != "published":
        raise HTTPException(status_code=409, detail="This event is not open for registration")
    if datetime.combine(event.event_date, event.event_time) <= datetime.now():
        raise HTTPException(status_code=409, detail="Registration is closed for this event")

    active_count = db.scalar(
        select(func.count(Registration.id)).where(
            Registration.event_id == event.id,
            Registration.status == "active",
        )
    ) or 0
    existing = db.scalar(select(Registration).where(
        Registration.event_id == event.id,
        Registration.user_id == profile.id,
        Registration.status == "active",
    ))
    if existing is not None:
        raise HTTPException(status_code=409, detail="You are already registered for this event")
    if active_count >= event.capacity:
        raise HTTPException(status_code=409, detail="This event is full")

    registration = Registration(user_id=profile.id, event_id=event.id, status="active")
    db.add(registration)
    try:
        db.commit()
        db.refresh(registration)
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(status_code=409, detail="You are already registered for this event") from error
    registration.event = event
    return registration_response(registration, db)


@router.get("/me", response_model=list[RegistrationResponse])
def my_registrations(profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    registrations = db.scalars(
        select(Registration).options(joinedload(Registration.event)).where(
            Registration.user_id == profile.id
        ).order_by(Registration.created_at.desc())
    ).all()
    return [registration_response(registration, db) for registration in registrations]


@router.post("/{registration_id}/cancel", response_model=RegistrationResponse)
def cancel_registration(registration_id: UUID, profile: Profile = Depends(get_current_profile), db: Session = Depends(get_db)):
    registration = db.scalar(select(Registration).options(joinedload(Registration.event)).where(
        Registration.id == registration_id,
        Registration.user_id == profile.id,
    ))
    if registration is None:
        raise HTTPException(status_code=404, detail="Registration not found")
    if registration.status == "cancelled":
        return registration
    registration.status = "cancelled"
    db.commit()
    db.refresh(registration)
    return registration_response(registration, db)