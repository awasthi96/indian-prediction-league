from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from models import User
from database import get_db

router = APIRouter(
    prefix="/admin/users",
    tags=["users"],
)


# Pydantic models
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "player"


class UserPublic(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


@router.get("", response_model=List[UserPublic])
def list_users(db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users


@router.post("", response_model=UserPublic)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    # Check if username already exists
    existing = db.query(User).filter(User.username == user.username).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )
    
    # Create new user
    new_user = User(
        username=user.username,
        password=user.password,  # plain text for now (should be hashed in production!)
        role=user.role,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # Get the auto-generated ID
    
    return new_user