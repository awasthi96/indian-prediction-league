from fastapi import FastAPI
from database import init_db
from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.matches import router as matches_router
from routers.predictions import router as predictions_router
from routers.leaderboard import router as leaderboard_router
from routers.players import router as players_router
from fastapi.middleware.cors import CORSMiddleware
from routers.xfactors import router as xfactors_router
from routers.meta import router as meta_router
from pydantic import BaseModel
from typing import Optional
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from fastapi import Depends, HTTPException
from models import User
from database import get_db


app = FastAPI(title="Indian Prediction League API")

init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from xfactor_master import load_default_xfactors

load_default_xfactors()


@app.get("/health")
def health_check():
    return {"status": "ok"}


# In backend/main.py

class UserRegister(BaseModel):
    username: str
    password: str
    full_name: str
    mobile_number: str
    email: Optional[str] = None
    fav_team_intl: Optional[str] = None
    fav_team_ipl: Optional[str] = None
    fav_player: Optional[str] = None

@app.post("/auth/register")
def register(user: UserRegister, db: Session = Depends(get_db)):
    # 1. Check if username exists
    db_user = db.query(User).filter(User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # 2. Hash Password
    # Ensure you have: from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed_pw = pwd_context.hash(user.password)
    
    # 3. Create User
    new_user = User(
        username=user.username,
        password=hashed_pw,
        full_name=user.full_name,
        mobile_number=user.mobile_number,
        email=user.email,
        fav_team_intl=user.fav_team_intl,
        fav_team_ipl=user.fav_team_ipl,
        fav_player=user.fav_player,
        role="player" # Default role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

# Attach routers
app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/users")
app.include_router(matches_router, prefix="/matches")
app.include_router(predictions_router, prefix="/predictions")
app.include_router(leaderboard_router, prefix="/leaderboard")
app.include_router(players_router, prefix="/players")
app.include_router(xfactors_router, prefix="/xfactors")
app.include_router(meta_router, prefix="/meta")


