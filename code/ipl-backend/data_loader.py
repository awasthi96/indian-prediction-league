from sqlalchemy.orm import Session
from models import Match, Squad, Player, Team, PlayerRole

def get_match_players_grouped(db: Session, match_id: int):
    """
    Fetches players for the specific match from the DB (Squads table).
    Returns them grouped by Role for the frontend SectionList.
    """
    # 1. Get Match to find out which Tournament and Teams are involved
    match = db.query(Match).filter(Match.id == match_id).first()
    
    # Safety check: If match doesn't exist or isn't linked to V2 Tournament yet
    if not match or not match.tournament_id:
        return []

    # 2. Query Squads
    # We want players who are in this Tournament AND belong to either Home or Away team
    results = (
        db.query(Player.name, Player.role)
        .join(Squad, Squad.player_id == Player.id)
        .filter(Squad.tournament_id == match.tournament_id)
        .filter(Squad.team_id.in_([match.home_team_id, match.away_team_id]))
        .all()
    )

    # 3. Group by Role in buckets
    grouped = {
        "WICKET_KEEPER": [],
        "BATTER": [],
        "ALL_ROUNDER": [],
        "BOWLER": []
    }

    for name, role in results:
        # Handle Enum value safely
        r_key = str(role.value if hasattr(role, "value") else role)
        if r_key in grouped:
            grouped[r_key].append(name)

    # 4. Format for Frontend SectionList (Ordered Logic)
    # Order: WK -> Batter -> All Rounder -> Bowler
    sections = []
    labels = {
        "WICKET_KEEPER": "Wicket Keepers",
        "BATTER": "Batters",
        "ALL_ROUNDER": "All Rounders",
        "BOWLER": "Bowlers"
    }
    
    order = ["WICKET_KEEPER", "BATTER", "ALL_ROUNDER", "BOWLER"]
    
    for key in order:
        if grouped[key]:
            sections.append({
                "title": labels[key],
                "data": sorted(grouped[key]) # Sort alphabetically inside the section
            })
            
    return sections