# app/services/commentary_aggregator.py

from collections import defaultdict


def aggregate(commentary):

    batters = defaultdict(lambda: {
        "runs": 0,
        "balls": 0,
        "fours": 0,
        "sixes": 0,
        "over_runs": defaultdict(int)
    })

    bowlers = defaultdict(lambda: {
        "runs": 0,
        "balls": 0,
        "wickets": 0,
        "dots": 0
    })

    fielders = defaultdict(lambda: {
        "catches": 0
    })

    total_runs = 0
    total_wickets = 0
    powerplay_runs = 0

    seen_balls =set() # prevent duplicates

    for ball in commentary:

        if not ball.get("Isball"):
            continue

        uid = ball.get("UID")
        if uid in seen_balls:
            continue
        seen_balls.add(uid)

        detail =(ball.get("Detail")or"").lower()

        batsman = ball.get("Batsman_Name")
        bowler = ball.get("Bowler_Name")
        over_no = int(ball.get("Over_No") or 0)

        runs = int(ball.get("Batsman_Runs") or 0)
        conceded = int(ball.get("Bowler_Conceded_Runs") or 0)

        total_runs += conceded

        # -------------------------
        # WIDE / NO BALL HANDLING
        # -------------------------
        is_extra_delivery = detail in ["wd", "nb"]

        # Add conceded runs always
        bowlers[bowler]["runs"] += conceded

        if not is_extra_delivery:
            # VALID BALL

            bowlers[bowler]["balls"] += 1

            batters[batsman]["runs"] += runs
            batters[batsman]["balls"] += 1
            batters[batsman]["over_runs"][over_no] += runs

            if runs == 4:
                batters[batsman]["fours"] += 1
            if runs == 6:
                batters[batsman]["sixes"] += 1

            if conceded == 0:
                bowlers[bowler]["dots"] += 1

            if ball.get("Iswicket"):

                dismissal_id = (ball.get("Dismissal_Id") or "").lower()
                # Always increase total wickets
                total_wickets += 1

                if dismissal_id in ["ct","cbb"]:
                    fielder_list = ball.get("Fielders") or []

                    for f in fielder_list:
                        name = f.get("Player_Name")
                        if name:
                            fielders[name]["catches"] +=1

                # Exclude non-bowler dismissals
                if dismissal_id not in ["ro"]:
                    bowlers[bowler]["wickets"] += 1

        # Powerplay runs (count all runs including wides)
        if over_no <= 6:
            powerplay_runs += conceded

    return {
        "batters": batters,
        "bowlers": bowlers,
        "fielders": fielders,
        "total_runs": total_runs,
        "total_wickets": total_wickets,
        "powerplay_runs": powerplay_runs
    }