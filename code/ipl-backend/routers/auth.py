from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import User
from auth.jwt import create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    
    if user and user.password == data.password:
        access_token = create_access_token(user.id)
        return LoginResponse(access_token=access_token)
    
    raise HTTPException(status_code=401, detail="Invalid username or password")


@router.get("/ping")
def auth_ping():
    return {"message": "auth ok"}