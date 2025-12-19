from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel

from models import User, Prediction, Match
from database import get_db

router = APIRouter(
    prefix="/players",
    tags=["players"],
)


# Pydantic models for responses
class PlayerMatchPerformance(BaseModel):
    match_id: int
    match_label: str
    points: int

    class Config:
        from_attributes = True


class PlayerPerformance(BaseModel):
    user_id: int
    username: str
    total_points: int
    matches_played: int
    matches: List[PlayerMatchPerformance]

    class Config:
        from_attributes = True


def build_match_label(match_id: int, db: Session) -> str:
    """Helper to build match label from database."""
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        return f"Match {match_id}"
    return f"{match.home_team} vs {match.away_team}"


@router.get("/{user_id}/performance", response_model=PlayerPerformance)
def get_player_performance(user_id: int, db: Session = Depends(get_db)):
    # Find user
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # All predictions for this user that have been scored
    user_predictions = db.query(Prediction).filter(
        Prediction.user_id == user_id,
        Prediction.points_earned.isnot(None)
    ).all()

    total_points = sum(p.points_earned for p in user_predictions)
    matches_played = len(user_predictions)

    # Build per-match breakdown
    from collections import defaultdict
    match_points = defaultdict(int)
    for p in user_predictions:
        match_points[p.match_id] += p.points_earned

    matches_performance: List[PlayerMatchPerformance] = []
    for match_id, pts in match_points.items():
        matches_performance.append(
            PlayerMatchPerformance(
                match_id=match_id,
                match_label=build_match_label(match_id, db),
                points=pts,
            )
        )

    # Sort by match_id
    matches_performance.sort(key=lambda m: m.match_id)

    return PlayerPerformance(
        user_id=user.id,
        username=user.username,
        total_points=total_points,
        matches_played=matches_played,
        matches=matches_performance,
    )