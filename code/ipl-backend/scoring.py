from typing import List
from sqlalchemy.orm import Session
from models import Match, Prediction, ActualXFactor
from xfactor_master import XFACTOR_DEFS


# ---- Scoring constants (fill/adjust to match your PRD) ----

POINTS_TOSS_WINNER_CORRECT = 2
POINTS_MATCH_WINNER_CORRECT = 5
POINTS_TOP_RUN_SCORER_CORRECT = 4
POINTS_TOP_WICKET_TAKER_CORRECT = 4


# X-factor risk-based points: (correct_points, wrong_points)
XFACTOR_RISK_POINTS = {
    "LOW": (3, -1),
    "MEDIUM": (5, -3),
    "HARD": (10, -7),
}


SCORING_META = {
    "toss_winner": {"correct": 2},
    "match_winner": {"correct": 5},
    "top_wicket_taker": {"correct": 4},
    "top_run_scorer": {"correct": 4},
    "highest_run_scored": {"correct": 5},
    "powerplay_runs": {"correct": 3},
    "total_wickets": {"correct": 3},
    "x_factor": {
        "LOW": {"correct": 3, "wrong": -1},
        "MEDIUM": {"correct": 5, "wrong": -3},
        "HIGH": {"correct": 10, "wrong": -7},
    },
}


def did_xfactor_happen(
    xf_id: str, 
    player_name: str, 
    actual_xfactors: List[ActualXFactor]
) -> bool:
    """
    Check if a specific X-factor happened in the match.
    Now uses ActualXFactor objects from database instead of MatchXFactorHit.
    """
    for actual_xf in actual_xfactors:
        if actual_xf.xf_id == xf_id and actual_xf.player_name == player_name:
            return True
    return False


def score_prediction_for_match(
    prediction: Prediction, 
    match: Match,
    actual_xfactors: List[ActualXFactor]
) -> int:
    """
    Calculate points for a single prediction based on match results.
    Handles ties: If multiple players are top scorers/wicket-takers,
    user gets points if they predicted ANY of them.
    """
    points = 0

    # ---- Basic categorical predictions ----

    # Toss winner (single value, no ties)
    if match.actual_toss_winner and prediction.toss_winner == match.actual_toss_winner:
        points += POINTS_TOSS_WINNER_CORRECT

    # Match winner (single value, no ties)
    if match.actual_match_winner and prediction.match_winner == match.actual_match_winner:
        points += POINTS_MATCH_WINNER_CORRECT

    # Top wicket taker (handles ties - comma-separated list)
    # Example: "Josh Hazlewood, Mohammed Siraj" means both took same wickets
    if match.actual_top_wicket_taker:
        actual_wicket_takers = [name.strip() for name in match.actual_top_wicket_taker.split(',')]
        if prediction.top_wicket_taker in actual_wicket_takers:
            points += POINTS_TOP_WICKET_TAKER_CORRECT

    # Top run scorer (handles ties - comma-separated list)
    # Example: "Virat Kohli, Faf du Plessis" means both scored same runs
    if match.actual_top_run_scorer:
        actual_run_scorers = [name.strip() for name in match.actual_top_run_scorer.split(',')]
        if prediction.top_run_scorer in actual_run_scorers:
            points += POINTS_TOP_RUN_SCORER_CORRECT

    # ---- Numeric predictions with range-based scoring ----

    # Highest runs scored
    if match.actual_highest_run_scored is not None:
        diff = abs(match.actual_highest_run_scored - prediction.highest_run_scored)
        if diff <= 5:
            points += 5
        elif diff <= 10:
            points += 3
        elif diff <= 15:
            points += 1
        # else: +0

    # Powerplay runs
    if match.actual_powerplay_runs is not None:
        diff = abs(match.actual_powerplay_runs - prediction.powerplay_runs)
        if diff <= 1:
            points += 3
        elif diff <= 2:
            points += 2
        elif diff <= 4:
            points += 1
        # else: +0

    # Total wickets
    if match.actual_total_wickets is not None:
        diff = abs(match.actual_total_wickets - prediction.total_wickets)
        if diff == 0:
            points += 3
        elif diff <= 1:
            points += 2
        elif diff <= 2:
            points += 1
        # else: +0

    # ---- X-factor predictions ----

    for xf_pred in prediction.x_factors:
        xf_def = XFACTOR_DEFS.get(xf_pred.xf_id)
        if not xf_def:
            # Unknown X-factor ID; skip scoring for safety
            xf_pred.correct = None
            continue

        # Get risk-based points
        risk = xf_def.risk.upper()
        correct_pts, wrong_pts = XFACTOR_RISK_POINTS.get(risk, (0, 0))

        # Check if this X-factor actually happened
        if did_xfactor_happen(xf_pred.xf_id, xf_pred.player_name, actual_xfactors):
            xf_pred.correct = True
            points += correct_pts
        else:
            xf_pred.correct = False
            points += wrong_pts

    return points


def apply_scoring_for_match(
    match: Match, 
    predictions_for_match: List[Prediction],
    db: Session
) -> None:
    """
    Score all predictions for a specific match.
    Updates each prediction's points_earned and x_factors[i].correct.
    Commits changes to database.
    """
    # Get all actual X-factors that occurred in this match
    actual_xfactors = db.query(ActualXFactor).filter(
        ActualXFactor.match_id == match.id
    ).all()
    
    # Score each prediction
    for prediction in predictions_for_match:
        prediction.points_earned = score_prediction_for_match(
            prediction, 
            match, 
            actual_xfactors
        )
    
    # Commit all changes to database
    db.commit()