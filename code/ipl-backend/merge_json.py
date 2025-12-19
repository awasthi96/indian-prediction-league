import json
from pathlib import Path
from collections import defaultdict

BASE = Path(__file__).resolve().parent
DATA = BASE / "data"

teams_path = DATA / "teams.json"
players_path = DATA / "players.json"
output_path = DATA / "teams_players.json"

with open(teams_path, "r", encoding="utf-8") as f:
    teams = json.load(f)

with open(players_path, "r", encoding="utf-8") as f:
    players = json.load(f)

# group players by team_abbr
players_by_team = defaultdict(list)
for p in players:
    abbr = p.get("team_abbr")      # ✅ this was the bug
    name = p.get("name")
    if not abbr or not name:
        continue
    players_by_team[abbr].append(name)

merged = []
for t in teams:
    abbr = t["abbr"]
    merged.append({
        "abbr": abbr,
        "short_name": t.get("short_name", abbr),
        "full_name": t["full_name"],
        "city": t.get("city", ""),
        "active": t.get("active", True),
        "players": players_by_team.get(abbr, [])
    })

with open(output_path, "w", encoding="utf-8") as f:
    json.dump(merged, f, indent=2, ensure_ascii=False)

print(f"✔ Merged {len(teams)} teams into {output_path.name}")
