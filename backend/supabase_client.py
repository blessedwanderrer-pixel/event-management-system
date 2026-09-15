import os

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL:
    raise RuntimeError("SUPABASE_URL is not set in the .env file")

if not SUPABASE_KEY:
    raise RuntimeError("SUPABASE_KEY is not set in the .env file")

supabase: Client = create_client(
    SUPABASE_URL,
    SUPABASE_KEY,
)


def create_auth_client() -> Client:
    """Fresh Auth client per mutating auth request.

    The shared `supabase` singleton keeps GoTrue session state. Reusing it for
    signup/login across concurrent users can contaminate requests. Callers that
    only verify a JWT may still use `supabase`.
    """
    return create_client(SUPABASE_URL, SUPABASE_KEY)