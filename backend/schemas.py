from datetime import date, time, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


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
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return cleaned


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordUpdateRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class EmailChangeRequest(BaseModel):
    email: EmailStr


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=4096)


class VerifyTokenRequest(BaseModel):
    token_hash: str = Field(min_length=10, max_length=2048)
    type: str = Field(min_length=3, max_length=32)

    @field_validator("type")
    @classmethod
    def validate_type(cls, value: str) -> str:
        allowed = {"signup", "invite", "magiclink", "recovery", "email_change", "email"}
        cleaned = value.strip().lower()
        if cleaned not in allowed:
            raise ValueError("Unsupported verification type")
        return cleaned


class ProfileResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class ProfileUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        cleaned = value.strip()
        if len(cleaned) < 2:
            raise ValueError("Full name must be at least 2 characters")
        return cleaned


class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    event_date: date
    event_time: time
    location: str = Field(min_length=1, max_length=250)
    capacity: int = Field(gt=0, le=1_000_000)
    status: str = "draft"

    @field_validator("capacity", mode="before")
    @classmethod
    def validate_capacity(cls, value):
        if isinstance(value, bool):
            raise ValueError("Capacity must be a whole number greater than 0")
        if isinstance(value, float) and not value.is_integer():
            raise ValueError("Capacity must be a whole number greater than 0")
        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned or "." in cleaned or not cleaned.lstrip("-").isdigit():
                raise ValueError("Capacity must be a whole number greater than 0")
            value = int(cleaned)
        if isinstance(value, int) and value <= 0:
            raise ValueError("Capacity must be greater than 0")
        return value

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
    available_places: int
    completed_events: int
    cancelled_events: int