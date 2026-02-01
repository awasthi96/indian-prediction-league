from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from auth.jwt import create_access_token, get_current_user_id
from passlib.context import CryptContext

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    # 1. Get the user by username
    user = db.query(User).filter(User.username == data.username).first()
    
    # 2. Verify the password (Hash vs Plain text)
    # pwd_context.verify(plain_text, hashed_text)
    if not user or not pwd_context.verify(data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # 3. Generate Token
    access_token = create_access_token(user.id)
    return LoginResponse(access_token=access_token)


@router.get("/ping")
def auth_ping():
    return {"message": "auth ok"}


def get_current_user(
    user_id: int = Depends(get_current_user_id), 
    db: Session = Depends(get_db)
):
    """
    Uses the ID from the token to find the actual User in the database.
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user