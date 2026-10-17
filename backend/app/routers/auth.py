"""
FitX Pro - Authentication & Authorization Router
================================================
This module handles all security, password hashing, JWT token lifecycle, 
and FastAPI dependency injection guards used across the entire application.

Key Components:
1. Password Security: Passlib with Bcrypt for hashing and verifying passwords.
2. Token Lifecycle: python-jose for encoding and decoding HS256 signed JSON Web Tokens (JWT).
3. Rate Limiting: SlowAPI limiters to protect the login endpoint against brute-force attacks.
4. Route Dependencies:
   - get_current_user: Validates the JWT and ensures the account exists and is active.
   - require_admin: Enforces Role-Based Access Control (RBAC) ensuring only admins can proceed.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.database import get_db
from app.models import User
from app.config import settings
from app.limiter import limiter

# Create the APIRouter. In main.py, this is registered with prefix="/api/v1",
# which makes the full path for routes here: /api/v1/auth/...
router = APIRouter(prefix="/auth", tags=["auth"])

# ── 1. Security & Password Configuration ──────────────────────────────────────
# CryptContext manages password hashing algorithms.
# - schemes=["bcrypt"]: Uses the industry-standard bcrypt algorithm (automatically handles salting).
# - deprecated="auto": Allows future graceful upgrades if older hash algorithms become outdated.
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2PasswordBearer is a FastAPI security utility that:
# 1. Tells FastAPI that requests should have an 'Authorization: Bearer <token>' header.
# 2. Configures the interactive Swagger UI (/docs) so developers can log in using the "Authorize" button.
# 3. tokenUrl points to the exact endpoint where clients send credentials to obtain a token.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── 2. Pydantic Schemas ───────────────────────────────────────────────────────
class Token(BaseModel):
    """
    Response schema returned to the client upon successful authentication.
    - access_token: The signed JWT string containing encoded user claims (e.g. username, role).
    - token_type: Standard OAuth2 token type, almost always "bearer".
    """
    access_token: str
    token_type: str


# ── 3. Password Hashing Utilities ────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain text password against a stored bcrypt hash.
    Bcrypt uses a constant-time comparison under the hood to prevent timing attacks.
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Generates a secure, salted bcrypt hash of a plain text password.
    Used when creating new users or resetting passwords.
    """
    return pwd_context.hash(password)


# ── 4. JWT Token Generation ──────────────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Encodes claims (payload) into a signed JSON Web Token (JWT).
    
    Parameters:
    - data: Dictionary containing user claims (e.g., {"sub": username, "role": role}).
    - expires_delta: Optional timedelta for custom expiration; defaults to 15 minutes.
    
    Returns:
    - Encoded JWT string signed with the HMAC-SHA256 (HS256) algorithm using SECRET_KEY.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
        
    # 'exp' is a standard JWT claim: any token evaluated after this UTC timestamp is invalid
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


# ── 5. Authentication & Authorization Dependencies ────────────────────────────
async def get_current_user(
    token: str = Depends(oauth2_scheme), 
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    FastAPI dependency that validates the Bearer token on incoming protected requests.
    
    Flow:
    1. Extracts 'Bearer <token>' from the Authorization header via oauth2_scheme.
    2. Decodes and cryptographically verifies the token using SECRET_KEY and HS256.
    3. Retrieves the 'sub' claim (which stores the username).
    4. Queries the database to verify the user actually exists and is active.
    5. Returns the SQLAlchemy User model instance to the calling route handler.
    
    If anything is invalid or expired, raises HTTP 401 Unauthorized.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Verify cryptographic signature and expiration ('exp')
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        # Catches expired tokens, tampered signatures, or malformed JWTs
        raise credentials_exception
    
    # Verify the user actually exists in the database
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    
    # Reject if user doesn't exist or if account has been deactivated
    if user is None or not user.is_active:
        raise credentials_exception
        
    return user


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Role-Based Access Control (RBAC) dependency for admin-only endpoints.
    
    It chains on top of 'get_current_user'. If the user's role is not 'admin',
    it raises HTTP 403 Forbidden, preventing regular gym members from modifying
    finances, equipment, membership plans, or other members' accounts.
    """
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Not enough permissions"
        )
    return current_user


# ── 6. Login Route ────────────────────────────────────────────────────────────
@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
async def login_for_access_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    User login endpoint to exchange credentials for a Bearer JWT.
    
    Key Features:
    - Rate Limited: @limiter.limit("5/minute") restricts attempts to 5 requests per minute
      per client IP address to prevent brute-force credential stuffing.
    - request: Request parameter: Required by SlowAPI so it can extract the remote IP address.
    - OAuth2PasswordRequestForm: Expects standard URL-encoded form data (username & password).
    - Returns: JSON object containing access_token and token_type.
    """
    # 1. Fetch user by username from the database
    result = await db.execute(select(User).where(User.username == form_data.username))
    user = result.scalars().first()
    
    # 2. Verify existence and check bcrypt password hash
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # 3. Compute expiration time from application settings
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    # 4. Generate signed JWT containing both the username ('sub') and role ('role')
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role}, 
        expires_delta=access_token_expires
    )
    
    # 5. Return token payload matching the Token schema
    return {"access_token": access_token, "token_type": "bearer"}
