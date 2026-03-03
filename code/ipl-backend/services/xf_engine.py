# app/services/xf_engine.py


def generate_xfs(stats):

    xfs = []

    # -------------------------
    # BATTER XFs
    # -------------------------
    for pid, data in stats["batters"].items():

        runs = data["runs"]
        balls = data["balls"]
        sr = data["strike_rate"]

        if runs >= 40:
            xfs.append({"xf_id": "XF_BAT_40_RUNS", "player_id": pid})

        if runs >= 50:
            xfs.append({"xf_id": "XF_BAT_50_RUNS", "player_id": pid})

        if runs >= 60:
            xfs.append({"xf_id": "XF_BAT_60_RUNS", "player_id": pid})

        if balls >= 10:
            if sr >= 160:
                xfs.append({"xf_id": "XF_BAT_SR_160_10B", "player_id": pid})
            if sr >= 180:
                xfs.append({"xf_id": "XF_BAT_SR_180_10B", "player_id": pid})
            if sr >= 200:
                xfs.append({"xf_id": "XF_BAT_SR_200_10B", "player_id": pid})

        if data["fours"] + data["sixes"] >= 8:
            xfs.append({"xf_id": "XF_BAT_8_BOUNDARIES", "player_id": pid})

    # -------------------------
    # BOWLER XFs
    # -------------------------
    for pid, data in stats["bowlers"].items():

        wickets = data["wickets"]
        dots = data["dots"]
        economy = data["economy"]

        if wickets >= 3:
            xfs.append({"xf_id": "XF_BOWL_3_WICKETS", "player_id": pid})

        if dots >= 7:
            xfs.append({"xf_id": "XF_BOWL_7_DOTS", "player_id": pid})
        if dots >= 9:
            xfs.append({"xf_id": "XF_BOWL_9_DOTS", "player_id": pid})
        if dots >= 12:
            xfs.append({"xf_id": "XF_BOWL_12_DOTS", "player_id": pid})

        if economy <= 6:
            xfs.append({"xf_id": "XF_BOWL_6_ECONOMY", "player_id": pid})
        if economy <= 7:
            xfs.append({"xf_id": "XF_BOWL_7_ECONOMY", "player_id": pid})
        if economy <= 8:
            xfs.append({"xf_id": "XF_BOWL_8_ECONOMY", "player_id": pid})

    for pid, data in stats["fielders"].items():
        if data["catches"] >= 1:
            xfs.append({"xf_id": "XF_FIELD_CATCH", "player_id": pid})

    return xfs


def extract_15_over_batters(commentary):

    from collections import defaultdict

    team_over_runs = {}
    batter_over_runs = defaultdict(lambda: defaultdict(int))
    candidate_overs = set()

    for entry in commentary:

        if entry.get("Isball"):
            over = entry.get("Over_No")
            batter = entry.get("Batsman")

            runs = int(entry.get("Batsman_Runs") or 0)

            if batter:
                batter_over_runs[over][batter] += runs

        if entry.get("End_Over"):
            summary = entry.get("Summary")
            if summary:
                over = summary["Over"]
                total = int(summary.get("Runs") or 0)

                team_over_runs[over] = total

                if total >= 15:
                    candidate_overs.add(over)

    result = set()

    for over in candidate_overs:
        for batter, runs in batter_over_runs.get(over, {}).items():
            if runs >= 15:
                result.add(batter)

    return result