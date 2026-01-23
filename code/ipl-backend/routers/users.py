from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from routers.auth import get_current_user
from models import User
from database import get_db

router = APIRouter(
    tags=["users"],
)


# Pydantic models
class UserCreate(BaseModel):
    username: str
    password: str
    role: str = "player"
    full_name: str
    mobile_number: str
    email: Optional[str] = None
    fav_team_intl: Optional[str] = None
    fav_team_ipl: Optional[str] = None
    fav_player: Optional[str] = None


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
        full_name=user.full_name,
        mobile_number=user.mobile_number,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)  # Get the auto-generated ID
    
    return new_user

@router.get("/me", response_model=UserPublic)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user