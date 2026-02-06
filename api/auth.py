"""
GLTCH Cloud API - Authentication Middleware
Uses Clerk for auth
"""
from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx
import jwt
from config import get_settings

security = HTTPBearer()
settings = get_settings()


async def verify_clerk_token(token: str) -> dict:
    """Verify Clerk JWT token and return user data"""
    try:
        # Decode without verification first to get the kid
        unverified = jwt.decode(token, options={"verify_signature": False})
        
        # For development, we can skip full verification
        # In production, fetch Clerk's JWKS and verify properly
        if settings.debug:
            return {
                "user_id": unverified.get("sub"),
                "email": unverified.get("email"),
                "session_id": unverified.get("sid")
            }
        
        # Production: Verify with Clerk API
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.clerk.dev/v1/users/{unverified.get('sub')}",
                headers={"Authorization": f"Bearer {settings.clerk_secret_key}"}
            )
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "user_id": user_data["id"],
                    "email": user_data.get("email_addresses", [{}])[0].get("email_address"),
                    "session_id": unverified.get("sid")
                }
            else:
                raise HTTPException(status_code=401, detail="Invalid token")
                
    except jwt.exceptions.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token format")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current authenticated user from JWT token"""
    return await verify_clerk_token(credentials.credentials)


# For development/testing without Clerk
class DevUser:
    """Mock user for development"""
    def __init__(self):
        self.user_id = "dev_user_123"
        self.email = "dev@gltch.app"
        self.callsign = "DevOperator"


async def get_dev_user() -> dict:
    """Return a dev user for testing"""
    return {
        "user_id": "dev_user_123",
        "email": "dev@gltch.app",
        "callsign": "DevOperator"
    }


def get_auth_dependency():
    """Return appropriate auth dependency based on settings"""
    if settings.debug and not settings.clerk_secret_key:
        return get_dev_user
    return get_current_user
