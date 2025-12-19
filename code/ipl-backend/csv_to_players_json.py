import csv
import json
import os

INPUT_CSV = "IPL Prediction Adda  - Player List.csv"
OUTPUT_JSON = os.path.join("data", "players.json")

# Map CSV team header -> team abbreviation used in app
TEAM_NAME_TO_ABBR = {
    # CSK
    "Chennai Super Kings": "CSK",
    "CSK": "CSK",

    # DC
    "Delhi Capitals": "DC",
    "DC": "DC",

    # GT
    "Gujarat Titans": "GT",
    "GT": "GT",

    # KKR
    "Kolkata Knight Riders": "KKR",
    "KKR": "KKR",

    # LSG
    "Lucknow Super Giants": "LSG",
    "LSG": "LSG",

    # MI
    "Mumbai Indians": "MI",
    "MI": "MI",

    # PBKS
    "Punjab Kings": "PBKS",
    "PBKS": "PBKS",

    # RCB
    "Royal Challengers Bengaluru": "RCB",
    "Royal Challengers Bangalore": "RCB",  # old name just in case
    "RCB": "RCB",

    # RR
    "Rajasthan Royals": "RR",
    "RR": "RR",

    # SRH
    "Sunrisers Hyderabad": "SRH",
    "SRH": "SRH",
}

# Make sure data/ exists
os.makedirs("data", exist_ok=True)

# Read all rows first
rows = []
with open(INPUT_CSV, newline="", encoding="utf-8") as csvfile:
    reader = csv.reader(csvfile)
    for row in reader:
        rows.append(row)

if not rows:
    print("No rows found in CSV.")
    exit(0)

header = rows[0]  # row 1: team names across columns

# Build a mapping: column index -> team_abbr
col_to_team_abbr = {}
for col_idx, cell in enumerate(header):
    name = cell.strip()
    if not name:
        continue
    abbr = TEAM_NAME_TO_ABBR.get(name)
    if not abbr:
        print(f"⚠️ Unknown team header in column {col_idx}: '{name}'")
        continue
    col_to_team_abbr[col_idx] = abbr
    print(f"== Column {col_idx}: {name} ({abbr}) ==")

players = []
player_id = 1

# For each subsequent row, each column is (optionally) a player for that column's team
for row in rows[1:]:
    for col_idx, cell in enumerate(row):
        name = cell.strip()
        if not name:
            continue
        team_abbr = col_to_team_abbr.get(col_idx)
        if not team_abbr:
            # Column doesn't have a known team header, skip
            continue
        players.append(
            {
                "id": player_id,
                "name": name,
                "team_abbr": team_abbr,
                "active": True,
            }
        )
        player_id += 1

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(players, f, indent=2, ensure_ascii=False)

print(f"✅ Generated {len(players)} players into {OUTPUT_JSON}")
