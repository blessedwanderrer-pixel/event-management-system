from datetime import date, time, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


ALLOWED_STATUSES = {"draft", "published", "completed", "cancelled"}


class EventResponse(BaseModel):
    id: UUID
    title: str
    description: str | None
    event_date: date
    event_time: time
    location: str
    capacity: int
    status: str
    created_at: datetime
    updated_at: datetime
    active_registrations: int = 0
    available_spots: int = 0

    model_config = ConfigDict(from_attributes=True)


class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: str
    password: str


class PasswordResetRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class PasswordUpdateRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    event_date: date
    event_time: time
    location: str = Field(min_length=1, max_length=250)
    capacity: int = Field(gt=0, le=1_000_000)
    status: str = "draft"

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in ALLOWED_STATUSES:
            raise ValueError("Invalid event status")
        return value


class EventUpdate(EventCreate):
    pass


class RegistrationResponse(BaseModel):
    id: UUID
    event_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime
    event: EventResponse

    model_config = ConfigDict(from_attributes=True)


class AttendeeResponse(BaseModel):
    id: UUID
    full_name: str
    email: str
    registration_status: str
    registered_at: datetime


class DashboardSummary(BaseModel):
    total_events: int
    published_events: int
    upcoming_events: int
    total_registrations: int
    active_registrations: int
    completed_events: int
    cancelled_events: int