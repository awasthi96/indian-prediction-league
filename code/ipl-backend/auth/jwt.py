# auth/jwt.py
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

# Configuration
SECRET_KEY = os.getenv("JWT_SECRET")
if not SECRET_KEY:
    raise ValueError("JWT_SECRET environment variable is not set")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 0.5

# Security scheme for dependency injection
security = HTTPBearer()


def create_access_token(user_id: int) -> str:
    """
    Create a JWT access token for the given user ID.
    
    Args:
        user_id: The user's ID to encode in the token
        
    Returns:
        Encoded JWT token string
    """
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(user_id),
        "exp": expire
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token


def verify_access_token(token: str) -> int:
    """
    Verify and decode a JWT access token.
    
    Args:
        token: The JWT token to verify
        
    Returns:
        The user ID extracted from the token
        
    Raises:
        HTTPException: If token is invalid or expired (401)
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str: Optional[str] = payload.get("sub")
        
        if user_id_str is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: missing subject",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = int(user_id_str)
        return user_id
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: malformed user ID",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> int:
    """
    FastAPI dependency to extract and verify the current user's ID from the JWT token.
    
    Args:
        credentials: HTTP authorization credentials from the request header
        
    Returns:
        The authenticated user's ID
        
    Raises:
        HTTPException: If token is missing, invalid, or expired (401)
    """
    token = credentials.credentials
    user_id = verify_access_token(token)
    return user_id
