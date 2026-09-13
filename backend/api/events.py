from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from database import get_db
from models import Event, Registration
from schemas import EventResponse


router = APIRouter(
    prefix="/events",
    tags=["Events"],
)


@router.get("/", response_model=list[EventResponse])
def get_upcoming_events(
    db: Session = Depends(get_db),
):
    now = datetime.now()

    statement = (
        select(Event)
        .where(
            Event.status == "published",
            or_(
                Event.event_date > now.date(),
                and_(
                    Event.event_date == now.date(),
                    Event.event_time >= now.time(),
                ),
            ),
        )
        .order_by(Event.event_date, Event.event_time)
    )

    events = db.scalars(statement).all()
    counts = dict(db.execute(
        select(Registration.event_id, func.count(Registration.id))
        .where(Registration.status == "active", Registration.event_id.in_([event.id for event in events]))
        .group_by(Registration.event_id)
    ).all()) if events else {}
    return [EventResponse(
        **{column.name: getattr(event, column.name) for column in Event.__table__.columns},
        active_registrations=counts.get(event.id, 0),
        available_spots=max(event.capacity - counts.get(event.id, 0), 0),
    ) for event in events]


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: UUID,
    db: Session = Depends(get_db),
):
    statement = select(Event).where(
        Event.id == event_id,
        Event.status == "published",
    )

    event = db.scalar(statement)

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found",
        )

    active_count = db.scalar(select(func.count(Registration.id)).where(
        Registration.event_id == event.id,
        Registration.status == "active",
    )) or 0
    return EventResponse(
        **{column.name: getattr(event, column.name) for column in Event.__table__.columns},
        active_registrations=active_count,
        available_spots=max(event.capacity - active_count, 0),
    )