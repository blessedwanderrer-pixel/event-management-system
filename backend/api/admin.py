from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from database import get_db
from dependencies import require_admin
from models import Event, Profile, Registration
from schemas import AttendeeResponse, DashboardSummary, EventCreate, EventResponse, EventUpdate

router = APIRouter(prefix="/admin", tags=["Admin"])


def serialize_event(event: Event, active_count: int = 0) -> EventResponse:
    return EventResponse(
        **{column.name: getattr(event, column.name) for column in Event.__table__.columns},
        active_registrations=active_count,
        available_spots=max(event.capacity - active_count, 0),
    )


def active_count(db: Session, event_id: UUID) -> int:
    return db.scalar(select(func.count(Registration.id)).where(
        Registration.event_id == event_id,
        Registration.status == "active",
    )) or 0


@router.get("/events", response_model=list[EventResponse])
def list_events(_: Profile = Depends(require_admin), db: Session = Depends(get_db)):
    events = db.scalars(select(Event).order_by(Event.event_date.desc(), Event.event_time.desc())).all()
    return [serialize_event(event, active_count(db, event.id)) for event in events]


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(data: EventCreate, _: Profile = Depends(require_admin), db: Session = Depends(get_db)):
    if data.status == "published" and datetime.combine(data.event_date, data.event_time) <= datetime.now():
        raise HTTPException(status_code=422, detail="Published events must be in the future")
    event = Event(**data.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return serialize_event(event)


@router.get("/events/{event_id}", response_model=EventResponse)
def get_event(event_id: UUID, _: Profile = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return serialize_event(event, active_count(db, event.id))


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(event_id: UUID, data: EventUpdate, _: Profile = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    registrations = active_count(db, event.id)
    if data.capacity < registrations:
        raise HTTPException(status_code=409, detail="Capacity cannot be reduced below the current number of active registrations.")
    if event.status in {"completed", "cancelled"} and data.status != event.status:
        raise HTTPException(status_code=409, detail="Completed or cancelled events cannot be reopened")
    if data.status == "published" and datetime.combine(data.event_date, data.event_time) <= datetime.now():
        raise HTTPException(status_code=422, detail="Published events must be in the future")
    for key, value in data.model_dump().items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return serialize_event(event, registrations)


@router.post("/events/{event_id}/{action}", response_model=EventResponse)
def change_event_status(event_id: UUID, action: str, _: Profile = Depends(require_admin), db: Session = Depends(get_db)):
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    transitions = {"publish": ("draft", "published"), "complete": ("published", "completed"), "cancel": ("draft", "cancelled"), "cancelled": ("published", "cancelled")}
    if action not in transitions or event.status != transitions[action][0]:
        raise HTTPException(status_code=409, detail="That event status transition is not allowed")
    if action == "publish" and datetime.combine(event.event_date, event.event_time) <= datetime.now():
        raise HTTPException(status_code=409, detail="Only future events can be published")
    event.status = transitions[action][1]
    db.commit()
    db.refresh(event)
    return serialize_event(event, active_count(db, event.id))


@router.get("/events/{event_id}/attendees", response_model=list[AttendeeResponse])
def attendees(event_id: UUID, _: Profile = Depends(require_admin), db: Session = Depends(get_db)):
    if db.get(Event, event_id) is None:
        raise HTTPException(status_code=404, detail="Event not found")
    registrations = db.scalars(select(Registration).options(joinedload(Registration.user)).where(
        Registration.event_id == event_id
    ).order_by(Registration.created_at.desc())).all()
    return [AttendeeResponse(
        id=item.user.id,
        full_name=item.user.full_name,
        email=item.user.email,
        registration_status=item.status,
        registered_at=item.created_at,
    ) for item in registrations]


@router.get("/reports/summary", response_model=DashboardSummary)
def report_summary(_: Profile = Depends(require_admin), db: Session = Depends(get_db)):
    now = datetime.now()
    total_events = db.scalar(select(func.count(Event.id))) or 0
    published = db.scalar(select(func.count(Event.id)).where(Event.status == "published")) or 0
    upcoming = db.scalar(select(func.count(Event.id)).where(
        Event.status == "published",
        (Event.event_date > now.date()) | ((Event.event_date == now.date()) & (Event.event_time >= now.time())),
    )) or 0
    total_registrations = db.scalar(select(func.count(Registration.id))) or 0
    active_registrations = db.scalar(select(func.count(Registration.id)).where(Registration.status == "active")) or 0
    completed = db.scalar(select(func.count(Event.id)).where(Event.status == "completed")) or 0
    cancelled = db.scalar(select(func.count(Event.id)).where(Event.status == "cancelled")) or 0
    return DashboardSummary(
        total_events=total_events,
        published_events=published,
        upcoming_events=upcoming,
        total_registrations=total_registrations,
        active_registrations=active_registrations,
        completed_events=completed,
        cancelled_events=cancelled,
    )
