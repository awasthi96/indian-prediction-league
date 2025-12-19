from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Dict

from models import User, Prediction, Match
from database import get_db
from pydantic import BaseModel

router = APIRouter(
    tags=["leaderboard"],
)


# Pydantic models for responses
class LeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    total_points: int
    matches_played: int

    class Config:
        from_attributes = True


class MatchLeaderboardEntry(BaseModel):
    rank: int
    user_id: int
    username: str
    match_id: int
    points_in_match: int

    class Config:
        from_attributes = True


def build_user_index(db: Session) -> Dict[int, str]:
    """Helper: map user_id -> username."""
    users = db.query(User).all()
    return {u.id: u.username for u in users}


# ---------- Overall leaderboard ----------

@router.get("/overall", response_model=List[LeaderboardEntry])
def get_overall_leaderboard(db: Session = Depends(get_db)):
    user_index = build_user_index(db)

    # Get all predictions that have been scored
    predictions = db.query(Prediction).filter(
        Prediction.points_earned.isnot(None)
    ).all()

    # Sum points per user across all predictions
    points_per_user: Dict[int, int] = {}
    matches_played: Dict[int, int] = {}

    for p in predictions:
        points_per_user[p.user_id] = points_per_user.get(p.user_id, 0) + p.points_earned
        matches_played[p.user_id] = matches_played.get(p.user_id, 0) + 1

    # Convert to list of entries
    entries: List[LeaderboardEntry] = []
    for user_id, total_points in points_per_user.items():
        entries.append(
            LeaderboardEntry(
                rank=0,  # temporary, set later
                user_id=user_id,
                username=user_index.get(user_id, f"user_{user_id}"),
                total_points=total_points,
                matches_played=matches_played.get(user_id, 0),
            )
        )

    # Sort by total_points desc, then by username
    entries.sort(key=lambda e: (-e.total_points, e.username.lower()))

    # Assign ranks (1-based)
    current_rank = 1
    for e in entries:
        e.rank = current_rank
        current_rank += 1

    return entries


# ---------- Match-wise leaderboard ----------

@router.get("/match/{match_id}", response_model=List[MatchLeaderboardEntry])
def get_match_leaderboard(match_id: int, db: Session = Depends(get_db)):
    user_index = build_user_index(db)

    # Check match exists
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # Filter predictions for this match
    relevant = db.query(Prediction).filter(
        Prediction.match_id == match_id,
        Prediction.points_earned.isnot(None)
    ).all()

    entries: List[MatchLeaderboardEntry] = []
    for p in relevant:
        entries.append(
            MatchLeaderboardEntry(
                rank=0,  # set later
                user_id=p.user_id,
                username=user_index.get(p.user_id, f"user_{p.user_id}"),
                match_id=match_id,
                points_in_match=p.points_earned,
            )
        )

    # Sort by points desc, then username
    entries.sort(key=lambda e: (-e.points_in_match, e.username.lower()))

    # Assign ranks
    current_rank = 1
    for e in entries:
        e.rank = current_rank
        current_rank += 1

    return entries