from services.icc_client import fetch_match_data, fetch_inning
from services.scorecard_aggregator import aggregate_scorecard
from services.xf_engine import generate_xfs, extract_15_over_batters
import httpx


async def generate_match_result(game_id: int):

    # 1️⃣ Scorecard
    scorecard = await fetch_match_data(game_id)
    stats = aggregate_scorecard(scorecard)

    # 2️⃣ Commentary for 15+ over XF
    async with httpx.AsyncClient(timeout=10) as client:
        inning1 = await fetch_inning(client, game_id, 1)
        inning2 = await fetch_inning(client, game_id, 2)

    xf_15_ids = (
        extract_15_over_batters(inning1) |
        extract_15_over_batters(inning2)
    )

    # 3️⃣ Build XF list
    xfs = []

    # Generate all scorecard-based XFs (no 15+ here)
    scorecard_xfs = generate_xfs(stats)

    # Resolve names for 15+ XF
    teams = scorecard["Teams"]

    def resolve_name(pid):
        for team in teams.values():
            if pid in team["Players"]:
                return team["Players"][pid]["Name_Full"]
        return None

    for xf in scorecard_xfs:
        xfs.append({
            "xf_id": xf["xf_id"],
            "player_name": resolve_name(xf["player_id"])
        })

    for pid in xf_15_ids:
        xfs.append({
            "xf_id": "XF_BAT_15_RUNS_OVER",
            "player_name": resolve_name(pid)
        })

    # 4️⃣ Final response
    return {
        "toss_winner": stats["toss_winner"],
        "match_winner": stats["match_winner"],
        "top_wicket_taker": stats["top_wicket_taker"],
        "top_run_scorer": stats["top_run_scorer"],
        "highest_run_scored": stats["highest_run_scored"],
        "powerplay_runs": stats["powerplay_runs"],
        "total_wickets": stats["total_wickets"],
        "x_factor_hits": xfs
    }