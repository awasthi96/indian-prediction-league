def aggregate_scorecard(scorecard):

    def safe_float(value, default=0.0):
        try:
            if value in ("", None):
                return default
            return float(value)
        except ValueError:
            return default


    def safe_int(value, default=0):
        try:
            if value in ("", None):
                return default
            return int(value)
        except ValueError:
            return default

    match_detail = scorecard["Matchdetail"]
    innings = scorecard["Innings"]
    teams = scorecard["Teams"]

    # -------------------------
    # Toss + Winner
    # -------------------------
    toss_team_id = match_detail["Tosswonby"]
    winning_team_id = match_detail["Winningteam"]

    toss_winner = teams[toss_team_id]["Name_Full"]
    match_winner = teams[winning_team_id]["Name_Full"]

    batters = {}
    bowlers = {}
    fielders = {}

    highest_total = 0
    total_wickets = 0
    max_powerplay = 0

    top_run_scorer_id = None
    top_run_scorer_runs = -1

    top_wicket_taker_id = None
    top_wicket_taker_wkts = -1

    for inning in innings:

        highest_total = max(highest_total, int(inning["Total"]))
        total_wickets += int(inning["Wickets"])

        # Powerplay
        for pp in inning.get("PowerPlayDetails", []):
            max_powerplay = max(max_powerplay, int(pp["Runs"]))

        # -------------------------
        # BATTERS (use ICC values directly)
        # -------------------------
        for b in inning["Batsmen"]:

            pid = b["Batsman"]

            if not b.get("Runs"):
                continue

            runs = safe_int(b.get("Runs"))

            batters[pid] = {
                "runs": runs,
                "balls": safe_int(b.get("Balls")),
                "fours": safe_int(b.get("Fours")),
                "sixes": safe_int(b.get("Sixes")),
                "strike_rate": safe_float(b.get("Strikerate")),
                "dots": safe_int(b.get("Dots"))
            }

            if runs > top_run_scorer_runs:
                top_run_scorer_runs = runs
                top_run_scorer_id = pid

            # -------------------------
            # FIELDING (Catches)
            # -------------------------
            dismissal_id = (b.get("DismissalId") or "").lower()

            if dismissal_id == "ct":

                fielder_id = b.get("Fielder")
                if fielder_id:
                    fielders.setdefault(fielder_id, {"catches": 0})
                    fielders[fielder_id]["catches"] += 1

            elif dismissal_id == "cbb":

                bowler_id = b.get("Bowler")
                if bowler_id:
                    fielders.setdefault(bowler_id, {"catches": 0})
                    fielders[bowler_id]["catches"] += 1

        # -------------------------
        # BOWLERS (use ICC values directly)
        # -------------------------
        for bow in inning["Bowlers"]:

            pid = bow["Bowler"]
            wickets = safe_int(bow.get("Wickets"))

            bowlers[pid] = {
                "wickets": wickets,
                "balls": safe_int(bow.get("Balls_Bowled")),
                "runs": safe_int(bow.get("Runs")),
                "dots": safe_int(bow.get("Dots")),
                "economy": safe_float(bow.get("Economyrate"))
            }

            if wickets > top_wicket_taker_wkts:
                top_wicket_taker_wkts = wickets
                top_wicket_taker_id = pid

    # -------------------------
    # Resolve Names
    # -------------------------
    def resolve_name(pid):
        for team in teams.values():
            if pid in team["Players"]:
                return team["Players"][pid]["Name_Full"]
        return None

    return {
        "toss_winner": toss_winner,
        "match_winner": match_winner,
        "top_run_scorer": resolve_name(top_run_scorer_id),
        "top_wicket_taker": resolve_name(top_wicket_taker_id),
        "highest_run_scored": highest_total,
        "powerplay_runs": max_powerplay,
        "total_wickets": total_wickets,
        "batters": batters,
        "bowlers": bowlers,
        "fielders": fielders,
        "teams": teams  # needed for resolving XF names
    }