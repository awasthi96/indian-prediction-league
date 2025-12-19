import pandas as pd
from datetime import datetime

from database import SessionLocal
from models import User, Match, Prediction, PredictedXFactor

EXCEL_FILE = "data for beta.xlsx"


def seed_data():
    db = SessionLocal()

    try:
        # =======================
        # USERS
        # =======================
        users_df = pd.read_excel(EXCEL_FILE, sheet_name="users")

        users_map = {}

        for _, row in users_df.iterrows():
            user = db.query(User).filter_by(username=row["username"]).first()
            if not user:
                user = User(
                    id=row["id"],
                    username=row["username"],
                    password=row["password"],
                    role=row["role"],
                )
                db.add(user)
                db.flush()

            users_map[user.username] = user

        db.commit()

        # =======================
        # MATCHES
        # =======================
        matches_df = pd.read_excel(EXCEL_FILE, sheet_name="matches")

        matches_map = {}

        for _, row in matches_df.iterrows():
            match = Match(
                home_team=row["Home"],
                away_team=row["Away"],
                venue=row["Venue"],
                start_time = (
				    row["start time"].to_pydatetime()
				    if hasattr(row["start time"], "to_pydatetime")
				    else datetime.strptime(row["start time"], "%m/%d/%Y %H:%M:%S")
				),
                status=row["status"],
            )

            db.add(match)
            db.flush()

            key = f"{row['Home']} vs {row['Away']}"
            matches_map[key] = match

        db.commit()

        # =======================
        # PREDICTIONS + XFACTORS
        # =======================
        preds_df = pd.read_excel(EXCEL_FILE, sheet_name="predictions")

        for _, row in preds_df.iterrows():
            user = users_map[row["username"]]
            match = matches_map[row["match"]]

            prediction = Prediction(
                user_id=user.id,
                match_id=match.id,
                toss_winner=row["Toss Winner"],
                match_winner=row["Match Winner"],
                top_wicket_taker=row["Top Wicket Taker"],
                top_run_scorer=row["Top Run Scorer"],
                highest_run_scored=row["Highest Run Scored"],
                powerplay_runs=row["Highest Run Scored in Powerplay"],
                total_wickets=row["Total Wickets Taken"],
                points_earned=None,
            )

            db.add(prediction)
            db.flush()

            if pd.notna(row["xfactors"]):
                xf_entries = str(row["xfactors"]).split(",")

                for entry in xf_entries:
                    xf_id, player_name = entry.split(":", 1)

                    db.add(
                        PredictedXFactor(
                            prediction_id=prediction.id,
                            xf_id=xf_id.strip(),
                            player_name=player_name.strip(),
                            correct=None,
                        )
                    )

        db.commit()
        print("✅ Excel data ingested successfully")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
