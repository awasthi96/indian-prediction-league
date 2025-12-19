from typing import List
from datetime import datetime, timedelta
from models import User, Match, Prediction, PredictedXFactor

# In-memory list for users
users_db: List[User] = []

# Add a default admin user for development
default_admin = User(
    id=1,
    username="admin",
    password="qwer1234",  # change later in real use
    role="admin",
)

users_db.append(default_admin)

# You can also add a couple of default players:
player2 = User(id=2, username="rachit", password="12345", role="player")
player3 = User(id=3, username="saumya", password="12345", role="player")
users_db.extend([player2, player3])

# In-memory list for matches
matches_db: List[Match] = []

# Add a couple of dummy matches (you can change these to last year's schedule later)

now = datetime.now()

match1 = Match(
    id=1,
    home_team="KKR",
    away_team="RCB",
    venue="KOLKATA",
    start_time=now + timedelta(days=1),
    status="upcoming",
)

match2 = Match(
    id=2,
    home_team="DC",
    away_team="RCB",
    venue="DELHI",
    start_time=now - timedelta(days=1),
    status="completed",
)

matches_db.extend([match1, match2])


# In-memory list for predictions
predictions_db: list[Prediction] = []

# Dummy Prediction 1 (for user_id=2, match_id=2)
dummy_pred1 = Prediction(
    id=1,
    match_id=2,
    user_id=2,
    toss_winner="RCB",
    match_winner="RCB",
    top_wicket_taker="Josh Hazlewood",
    top_run_scorer="Virat Kohli",
    highest_run_scored=180,
    powerplay_runs=55,
    total_wickets=11,
    x_factors=[
        PredictedXFactor(
            xf_id="XF_BAT_SR_180_10B",
            player_name="Virat Kohli",
            correct=None,
        ),
        PredictedXFactor(
            xf_id="XF_BOWL_9_DOTS",
            player_name="Josh Hazlewood",
            correct=None,
        ),
    ],
    points_earned=None,
)

# Dummy Prediction 2 (for user_id=3, match_id=2)
dummy_pred2 = Prediction(
    id=2,
    match_id=2,
    user_id=3,
    toss_winner="RCB",
    match_winner="RCB",
    top_wicket_taker="Josh Hazlewood",
    top_run_scorer="Virat Kohli",
    highest_run_scored=175,
    powerplay_runs=55,
    total_wickets=11,
    x_factors=[
        PredictedXFactor(
            xf_id="XF_BAT_SR_180_10B",
            player_name="Virat Kohli",
            correct=None,
        ),
        PredictedXFactor(
            xf_id="XF_BAT_50_RUNS",
            player_name="Virat Kohli",
            correct=None,
        ),
        PredictedXFactor(
            xf_id="XF_BOWL_9_DOTS",
            player_name="Josh Hazlewood",
            correct=None,
        ),
    ],
    points_earned=None,
)

predictions_db.extend([dummy_pred1, dummy_pred2])