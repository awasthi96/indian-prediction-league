from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from models import Match, Prediction, ActualXFactor
from database import get_db
from scoring import apply_scoring_for_match
from data_loader import get_match_players_grouped

router = APIRouter(
    tags=["matches"],
)


# Pydantic models for requests
class MatchCreate(BaseModel):
    home_team: str
    away_team: str
    venue: str
    start_time: datetime


class XFactorHit(BaseModel):
    xf_id: str
    player_name: str


class ActualXFactorResponse(BaseModel):
    xf_id: str
    player_name: str

    class Config:
        from_attributes = True


class MatchResultUpdate(BaseModel):
    toss_winner: str
    match_winner: str
    top_wicket_taker: str  # Can be comma-separated for ties: "Player1, Player2"
    top_run_scorer: str     # Can be comma-separated for ties: "Player1, Player2"
    highest_run_scored: int
    powerplay_runs: int
    total_wickets: int
    x_factor_hits: List[XFactorHit]


# Pydantic model for response
class MatchResponse(BaseModel):
    id: int
    home_team: str
    away_team: str
    venue: str
    start_time: datetime
    status: str
    actual_toss_winner: Optional[str] = None
    actual_match_winner: Optional[str] = None
    actual_top_wicket_taker: Optional[str] = None
    actual_top_run_scorer: Optional[str] = None
    actual_highest_run_scored: Optional[int] = None
    actual_powerplay_runs: Optional[int] = None
    actual_total_wickets: Optional[int] = None
    actual_x_factors: List[ActualXFactorResponse] = []

    class Config:
        from_attributes = True


# -------- Admin endpoints --------

@router.get("/admin/matches", response_model=List[MatchResponse])
def admin_list_matches(db: Session = Depends(get_db)):
    matches = db.query(Match).all()
    return matches


@router.post("/admin/matches", response_model=MatchResponse)
def admin_create_match(data: MatchCreate, db: Session = Depends(get_db)):
    # Create new match
    new_match = Match(
        home_team=data.home_team,
        away_team=data.away_team,
        venue=data.venue,
        start_time=data.start_time,
        status="upcoming",
    )

    db.add(new_match)
    db.commit()
    db.refresh(new_match)  # Get the auto-generated ID
    
    return new_match


@router.post("/admin/matches/{match_id}/result", response_model=MatchResponse)
def admin_set_match_result(
    match_id: int, 
    data: MatchResultUpdate,
    db: Session = Depends(get_db)
):
    # 1. Find the match
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # 2. Update result fields
    match.actual_toss_winner = data.toss_winner
    match.actual_match_winner = data.match_winner
    match.actual_top_wicket_taker = data.top_wicket_taker
    match.actual_top_run_scorer = data.top_run_scorer
    match.actual_highest_run_scored = data.highest_run_scored
    match.actual_powerplay_runs = data.powerplay_runs
    match.actual_total_wickets = data.total_wickets

    # 3. Delete old X-factors (if re-submitting results)
    db.query(ActualXFactor).filter(ActualXFactor.match_id == match_id).delete()

    # 4. Store all actual X-factor hits
    for xf_hit in data.x_factor_hits:
        actual_xf = ActualXFactor(
            match_id=match_id,
            xf_id=xf_hit.xf_id,
            player_name=xf_hit.player_name
        )
        db.add(actual_xf)

    # 5. Mark match as completed
    match.status = "completed"

    # 6. Commit all changes to database
    db.commit()
    db.refresh(match)  # Reload match with updated data

    # 7. Score all predictions for this match
    predictions_for_match = db.query(Prediction).filter(
        Prediction.match_id == match_id
    ).all()
    
    apply_scoring_for_match(match, predictions_for_match, db)

    return match


# -------- User endpoints --------

@router.get("/matches", response_model=List[MatchResponse])
def list_matches(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Match)
    
    if status:
        query = query.filter(Match.status == status)
    
    matches = query.all()

    match_ids = [m.id for m in matches]

    actual_xfs =(
        db.query(ActualXFactor)
        .filter(ActualXFactor.match_id.in_(match_ids))
        .all()
    )

    xfs_by_match = {}

    for xf in actual_xfs:
        xfs_by_match.setdefault(xf.match_id,[]).append(xf)

    for m in matches:
        m.actual_x_factors = xfs_by_match.get(m.id, [])
    
    return matches


@router.get("/matches/{match_id}", response_model=MatchResponse)
def get_match(match_id: int, db: Session = Depends(get_db)):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    actual_xfs =(
        db.query(ActualXFactor)
        .filter(ActualXFactor.match_id == match_id)
        .all()
    )
    match.actual_x_factors = actual_xfs
    return match


@router.get("/{match_id}/players", response_model=List[dict]) 
def get_match_players(match_id: int, db: Session = Depends(get_db)):
    # We pass the DB session directly to the loader now
    players_sections = get_match_players_grouped(db, match_id)
    
    if not players_sections:
        # Fallback for old V1 matches or errors (return empty list)
        return []
        
    return players_sections


@router.get("/", response_model=List[dict])
def list_matches_with_players(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Match)
    
    if status:
        query = query.filter(Match.status == status)
    
    matches = query.all()
    
    # Convert matches to dicts and add players
    out = []
    for m in matches:
        m_dict = {
            "id": m.id,
            "home_team": m.home_team,
            "away_team": m.away_team,
            "venue": m.venue,
            "start_time": m.start_time,
            "status": m.status,
        }
        # Attach players
        m_dict["players"] = get_players_for_match(m.home_team, m.away_team)
        out.append(m_dict)
    
    return out