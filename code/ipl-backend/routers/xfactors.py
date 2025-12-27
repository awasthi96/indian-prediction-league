from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import XFactorDef

router = APIRouter()

@router.get("/xfactors")
def get_xfactors(db: Session = Depends(get_db)):
    rows = (
        db.query(XFactorDef)
        .filter(XFactorDef.status == True)
        .all()
    )

    result = {"LOW": [], "MEDIUM": [], "HIGH": []}

    for r in rows:
        result[r.risk].append({
            "id": r.id,
            "category": r.category,
            "description": r.description,
        })

    return result


@router.get("/")
def list_xfactors(db: Session = Depends(get_db)):
    return (
        db.query(XFactorDef)
        .filter(XFactorDef.status == True)
        .all()
    )