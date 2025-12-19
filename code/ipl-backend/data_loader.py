# data_loader.py
import json
from pathlib import Path
from typing import List, Optional, Dict, Any

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"

def _load_json(filename: str):
    with open(DATA_DIR / filename, "r", encoding="utf-8") as f:
        return json.load(f)

TEAMS: list[Dict[str, Any]] = _load_json("teams_players.json")

# convenience maps
TEAM_BY_ABBR = {t["abbr"]: t for t in TEAMS}
TEAM_BY_FULLNAME = {t["full_name"].strip().lower(): t for t in TEAMS}

def normalize_team_abbr(name: str) -> Optional[str]:
    if not name:
        return None
    name = name.strip()
    # if already abbr
    if name in TEAM_BY_ABBR:
        return name
    # try fullname case-insensitive
    t = TEAM_BY_FULLNAME.get(name.lower())
    if t:
        return t["abbr"]
    # fallback: try to find substring match
    for tt in TEAMS:
        if tt["abbr"].lower() == name.lower():
            return tt["abbr"]
    return None

def get_players_for_team_abbr(abbr: str) -> List[str]:
    t = TEAM_BY_ABBR.get(abbr)
    return t.get("players", []) if t else []

def get_players_for_match(home_team_name: str, away_team_name: str) -> List[str]:
    home = normalize_team_abbr(home_team_name)
    away = normalize_team_abbr(away_team_name)
    if not home and not away:
        return []
    names = []
    if home:
        names.extend(get_players_for_team_abbr(home))
    if away:
        names.extend([p for p in get_players_for_team_abbr(away) if p not in names])
    return names
