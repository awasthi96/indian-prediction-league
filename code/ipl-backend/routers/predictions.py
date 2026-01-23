from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from auth.jwt import get_current_user_id

from models import Prediction, PredictedXFactor, Match
from database import get_db

router = APIRouter(
    tags=["predictions"],
)


# Pydantic models
class XFactorPrediction(BaseModel):
    xf_id: str
    player_name: str

class PredictedXFactorResponse(BaseModel):
    xf_id: str
    player_name: str
    correct: bool | None = None

    model_config = ConfigDict(from_attributes=True)

class PredictionCreate(BaseModel):
    toss_winner: str
    match_winner: str
    top_wicket_taker: Optional[str] = None
    top_run_scorer: Optional[str] = None
    highest_run_scored: Optional[int] = None
    powerplay_runs: Optional[int] = None
    total_wickets: Optional[int] = None
    x_factors: List[XFactorPrediction]


class PredictionResponse(BaseModel):
    id: int
    match_id: int
    user_id: int
    toss_winner: str
    match_winner: str
    top_wicket_taker: Optional[str] = None
    top_run_scorer: Optional[str] = None
    highest_run_scored: Optional[int] = None
    powerplay_runs: Optional[int] = None
    total_wickets: Optional[int] = None
    points_earned: Optional[int] = None
    x_factors: List[PredictedXFactorResponse]

    model_config = ConfigDict(from_attributes=True)

    #PredictionResponse.model_rebuild()


@router.post("/{match_id}", response_model=PredictionResponse)
def create_prediction(
    match_id: int, 
    data: PredictionCreate,
    user_id_local: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # 1. Check match exists
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # 2. Check match not started (make both datetimes naive)
    now = datetime.now()
    match_start = match.start_time

    # Strip timezone info if present (offset-aware → naive)
    if match_start.tzinfo is not None:
        match_start = match_start.replace(tzinfo=None)

    if now >= match_start:
        raise HTTPException(
            status_code=400,
            detail="Predictions closed for this match"
        )

    # 3. Prevent duplicate prediction by same user
    existing = db.query(Prediction).filter(
        Prediction.match_id == match_id,
        Prediction.user_id == user_id_local
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Prediction already submitted for this match"
        )

    # 4. Create prediction
    prediction = Prediction(
        match_id=match_id,
        user_id=user_id_local,
        toss_winner=data.toss_winner,
        match_winner=data.match_winner,
        top_wicket_taker=data.top_wicket_taker,
        top_run_scorer=data.top_run_scorer,
        highest_run_scored=data.highest_run_scored,
        powerplay_runs=data.powerplay_runs,
        total_wickets=data.total_wickets,
        points_earned=None,
    )

    db.add(prediction)
    db.commit()
    db.refresh(prediction)  # Get the auto-generated ID

    # 5. Create X-factor predictions
    for xf in data.x_factors:
        predicted_xf = PredictedXFactor(
            prediction_id=prediction.id,
            xf_id=xf.xf_id,
            player_name=xf.player_name,
            correct=None
        )
        db.add(predicted_xf)
    
    db.commit()
    db.refresh(prediction)  # Refresh to load x_factors relationship

    return prediction


@router.get("/{match_id}/me", response_model=PredictionResponse)
def get_my_prediction(
    match_id: int,
    user_id: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):

    prediction = db.query(Prediction).filter(
        Prediction.match_id == match_id,
        Prediction.user_id == user_id
    ).first()
    
    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="Prediction not found for this user"
        )

    return prediction


@router.put("/{match_id}", response_model=PredictionResponse)
def update_prediction(
    match_id: int,
    data: PredictionCreate,
    user_id_local: int = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    # 1. Check match exists
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    # 2. Check match not started (same logic as POST)
    now = datetime.now()
    match_start = match.start_time

    if match_start.tzinfo is not None:
        match_start = match_start.replace(tzinfo=None)

    if now >= match_start:
        raise HTTPException(
            status_code=400,
            detail="Predictions closed for this match"
        )

    # 3. Fetch existing prediction (REQUIRED for edit)
    prediction = db.query(Prediction).filter(
        Prediction.match_id == match_id,
        Prediction.user_id == user_id_local
    ).first()

    if not prediction:
        raise HTTPException(
            status_code=404,
            detail="No existing prediction to update"
        )

    # 4. Update prediction fields
    prediction.toss_winner = data.toss_winner
    prediction.match_winner = data.match_winner
    prediction.top_wicket_taker = data.top_wicket_taker
    prediction.top_run_scorer = data.top_run_scorer
    prediction.highest_run_scored = data.highest_run_scored
    prediction.powerplay_runs = data.powerplay_runs
    prediction.total_wickets = data.total_wickets

    # Reset points (will be recalculated later)
    prediction.points_earned = None

    # 5. Delete old X-Factor predictions
    db.query(PredictedXFactor).filter(
        PredictedXFactor.prediction_id == prediction.id
    ).delete()

    # 6. Create new X-Factor predictions
    for xf in data.x_factors:
        predicted_xf = PredictedXFactor(
            prediction_id=prediction.id,
            xf_id=xf.xf_id,
            player_name=xf.player_name,
            correct=None
        )
        db.add(predicted_xf)

    # 7. Commit changes
    db.commit()
    db.refresh(prediction)

    return prediction
