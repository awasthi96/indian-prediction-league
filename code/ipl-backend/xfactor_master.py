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
            status=True,
        ),
        "XF_BOWL_9_DOTS": XFactorDef(
            id="XF_BOWL_9_DOTS",
            risk="MEDIUM",
            category="bowling",
            description="Bowled >= 9 dot balls",
            status=True,
        ),
        "XF_BAT_50_RUNS": XFactorDef(
            id="XF_BAT_50_RUNS",
            risk="MEDIUM",
            category="batting",
            description="Scored >= 50 runs",
            status=True,
        ),
        "XF_FIELD_CATCH": XFactorDef(
            id="XF_FIELD_CATCH",
            risk="LOW",
            category="fielding",
            description="Took a catch",
            status=True,
        ),
        "XF_BAT_15_RUNS_OVER": XFactorDef(
            id="XF_BAT_15_RUNS_OVER",
            risk="HIGH",
            category="batting",
            description="Scored >= 15 runs in a over",
            status=True,
        ),
        "XF_BOWL_3_WICKETS": XFactorDef(
            id="XF_BOWL_3_WICKETS",
            risk="HIGH",
            category="bowling",
            description="took 3 wickets",
            status=True,
        ),
        "XF_BOWL_7_ECONOMY": XFactorDef(
            id="XF_BOWL_7_ECONOMY",
            risk="MEDIUM",
            category="bowling",
            description="economy <=7",
            status=True,
        ),
        "XF_BAT_8_BOUNDARIES": XFactorDef(
            id="XF_BAT_8_BOUNDARIES",
            risk="MEDIUM",
            category="batting",
            description="hit >=8 boundaries",
            status=True,
        ),
        "XF_BAT_SR_200_10B": XFactorDef(
            id="XF_BAT_SR_200_10B",
            risk="HIGH",
            category="batting",
            description="Strike rate >= 200 (min 10 balls)",
            status=True,
        ),
        "XF_BAT_40_RUNS": XFactorDef(
            id="XF_BAT_40_RUNS",
            risk="LOW",
            category="batting",
            description="Scored >= 40 runs",
            status=True,
        ),
        "XF_BAT_60_RUNS": XFactorDef(
            id="XF_BAT_60_RUNS",
            risk="HIGH",
            category="batting",
            description="Scored >= 60 runs",
            status=True,
        ),
        "XF_BAT_SR_160_10B": XFactorDef(
            id="XF_BAT_SR_160_10B",
            risk="LOW",
            category="batting",
            description="Strike rate >= 160 (min 10 balls)",
            status=True,
        ),
        "XF_BOWL_6_ECONOMY": XFactorDef(
            id="XF_BOWL_6_ECONOMY",
            risk="HIGH",
            category="bowling",
            description="economy <=6",
            status=True,
        ),
        "XF_BOWL_8_ECONOMY": XFactorDef(
            id="XF_BOWL_8_ECONOMY",
            risk="LOW",
            category="bowling",
            description="economy <=8",
            status=True,
        ),
    }

# Call this once at startup (e.g., from main.py)
load_default_xfactors()


