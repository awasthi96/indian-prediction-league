from fastapi import FastAPI

from routers.auth import router as auth_router
from routers.users import router as users_router
from routers.matches import router as matches_router
from routers.predictions import router as predictions_router
from routers.leaderboard import router as leaderboard_router
from routers.players import router as players_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Indian Prediction League API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from xfactor_master import load_default_xfactors

load_default_xfactors()


@app.get("/health")
def health_check():
    return {"status": "ok"}

# Attach routers
app.include_router(auth_router, prefix="/auth")
app.include_router(users_router, prefix="/users")
app.include_router(matches_router, prefix="/matches")
app.include_router(predictions_router, prefix="/predictions")
app.include_router(leaderboard_router, prefix="/leaderboard")
app.include_router(players_router, prefix="/players")
