from typing import Dict

from models import XFactorDef

# In-memory catalog for now. You can move this to DB or JSON later.
XFACTOR_DEFS: Dict[str, XFactorDef] = {}

def load_default_xfactors():
    global XFACTOR_DEFS
    XFACTOR_DEFS = {
        "XF_BAT_SR_180_10B": XFactorDef(
            id="XF_BAT_SR_180_10B",
            risk="MEDIUM",
            category="batting",
            description="Strike rate >= 180 (min 10 balls)",
        ),
        "XF_BOWL_9_DOTS": XFactorDef(
            id="XF_BOWL_9_DOTS",
            risk="MEDIUM",
            category="bowling",
            description="Bowled >= 9 dot balls",
        ),
        "XF_BAT_50_RUNS": XFactorDef(
            id="XF_BAT_50_RUNS",
            risk="MEDIUM",
            category="batting",
            description="Scored >= 50 runs",
        ),
        "XF_FIELD_CATCH": XFactorDef(
            id="XF_FIELD_CATCH",
            risk="MEDIUM",
            category="fielding",
            description="Took a catch",
        ),
        "XF_BAT_15_RUNS_OVER": XFactorDef(
            id="XF_BAT_15_RUNS_OVER",
            risk="MEDIUM",
            category="batting",
            description="Scored >= 15 runs in a over",
        ),
        "XF_BOWL_3_WICKETS": XFactorDef(
            id="XF_BOWL_3_WICKETS",
            risk="MEDIUM",
            category="bowling",
            description="took 3 wickets",
        ),
        "XF_BOWL_7_ECONOMY": XFactorDef(
            id="XF_BOWL_7_ECONOMY",
            risk="MEDIUM",
            category="bowling",
            description="economy <=7",
        ),
        "XF_BAT_8_BOUNDARIES": XFactorDef(
            id="XF_BAT_8_BOUNDARIES",
            risk="MEDIUM",
            category="batting",
            description="hit >=8 boundaries",
        ),# add more as needed
    }

# Call this once at startup (e.g., from main.py)
load_default_xfactors()
