from fastapi import APIRouter
from scoring import SCORING_META

router = APIRouter()

@router.get("/scoring")
def get_scoring_meta():
    return SCORING_META
