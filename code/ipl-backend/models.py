"""
SQLAlchemy Models for IPL Prediction App
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import enum

# ============================================================================
# ENUMS
# ============================================================================
class PlayerRole(str, enum.Enum):
    BATTER = "BATTER"
    BOWLER = "BOWLER"
    ALL_ROUNDER = "ALL_ROUNDER"
    WICKET_KEEPER = "WICKET_KEEPER"

# ============================================================================
# MODEL 0: Core Data (Tournaments, Teams, Players) - NEW FOR V2
# ============================================================================

class Tournament(Base):
    """
    Container for matches. e.g. "IPL 2026", "T20 World Cup 2026"
    """
    __tablename__ = "tournaments"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)  # "IPL 2026"
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=False)  # Only one tournament active at a time?

    # Relationships
    matches = relationship("Match", back_populates="tournament")
    squads = relationship("Squad", back_populates="tournament")


class Team(Base):
    """
    Generic Team entities. Independent of tournament.
    e.g. "Mumbai Indians", "India", "Australia"
    """
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False, unique=True) # "Mumbai Indians"
    short_name = Column(String(10), nullable=False, unique=True) # "MI"
    logo_url = Column(String(255), nullable=True) # URL from S3
    primary_color = Column(String(20), nullable=True) # Hex code for UI

    # Relationships
    home_matches = relationship("Match", foreign_keys="[Match.home_team_id]", back_populates="home_team_ref")
    away_matches = relationship("Match", foreign_keys="[Match.away_team_id]", back_populates="away_team_ref")
    squad_entries = relationship("Squad", back_populates="team")


class Player(Base):
    """
    Innate player details. Independent of team/tournament.
    """
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    role = Column(Enum(PlayerRole), nullable=False) # BATTER, BOWLER, etc.
    image_url = Column(String(255), nullable=True) # URL from S3

    # Relationships
    squad_entries = relationship("Squad", back_populates="player")


class Squad(Base):
    """
    The link! Connects a Player to a Team for a specific Tournament.
    Allows a player to play for India in WC and MI in IPL.
    """
    __tablename__ = "squads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    
    is_captain = Column(Boolean, default=False)
    price = Column(String(20), nullable=True) # Optional: Auction price for IPL context

    # Relationships
    tournament = relationship("Tournament", back_populates="squads")
    team = relationship("Team", back_populates="squad_entries")
    player = relationship("Player", back_populates="squad_entries")


# ============================================================================
# MODEL 1: User (Unchanged)
# ============================================================================
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False) 
    role = Column(String(20), nullable=False, default="player")
    full_name = Column(String, nullable=True)
    mobile_number = Column(String, nullable=True)
    email = Column(String, nullable=True)
    fav_team_intl = Column(String, nullable=True)
    fav_team_ipl = Column(String, nullable=True)
    fav_player = Column(String, nullable=True) 
    
    predictions = relationship("Prediction", back_populates="user", cascade="all, delete-orphan")


# ============================================================================
# MODEL 2: Match (Updated with Foreign Keys)
# ============================================================================
class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # New V2 Foreign Keys
    tournament_id = Column(Integer, ForeignKey("tournaments.id"), nullable=True) 
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=True)

    # Legacy strings (Keep these for now to avoid breaking existing frontend/predictions immediately)
    home_team = Column(String(50), nullable=False)  
    away_team = Column(String(50), nullable=False)  
    
    venue = Column(String(100), nullable=False)
    start_time = Column(DateTime, nullable=False)
    status = Column(String(20), nullable=False, default="upcoming")
    
    # Results
    actual_toss_winner = Column(String(50), nullable=True)
    actual_match_winner = Column(String(50), nullable=True)
    actual_top_wicket_taker = Column(String(100), nullable=True)
    actual_top_run_scorer = Column(String(100), nullable=True)
    actual_highest_run_scored = Column(Integer, nullable=True)
    actual_powerplay_runs = Column(Integer, nullable=True)
    actual_total_wickets = Column(Integer, nullable=True)
    
    # Relationships
    tournament = relationship("Tournament", back_populates="matches")
    home_team_ref = relationship("Team", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team_ref = relationship("Team", foreign_keys=[away_team_id], back_populates="away_matches")
    
    predictions = relationship("Prediction", back_populates="match", cascade="all, delete-orphan")
    actual_x_factors = relationship("ActualXFactor", back_populates="match", cascade="all, delete-orphan")


# ============================================================================
# MODEL 3: Prediction (Unchanged for now)
# ============================================================================
class Prediction(Base):
    __tablename__ = "predictions"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Storing Names (Strings) allows flexibility if DB IDs change, 
    # but strictly speaking, IDs are better. Keeping Strings for V1 compatibility.
    toss_winner = Column(String(50), nullable=False)
    match_winner = Column(String(50), nullable=False)
    top_wicket_taker = Column(String(100), nullable=False)
    top_run_scorer = Column(String(100), nullable=False)
    highest_run_scored = Column(Integer, nullable=False)
    powerplay_runs = Column(Integer, nullable=False)
    total_wickets = Column(Integer, nullable=False)
    
    points_earned = Column(Integer, nullable=True, default=None)
    
    user = relationship("User", back_populates="predictions")
    match = relationship("Match", back_populates="predictions")
    x_factors = relationship("PredictedXFactor", back_populates="prediction", cascade="all, delete-orphan")


# ============================================================================
# MODEL 4: PredictedXFactor (Unchanged)
# ============================================================================
class PredictedXFactor(Base):
    __tablename__ = "predicted_x_factors"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    
    xf_id = Column(String(50), nullable=False)
    player_name = Column(String(100), nullable=False)
    correct = Column(Boolean, nullable=True, default=None)
    
    prediction = relationship("Prediction", back_populates="x_factors")


# ============================================================================
# MODEL 5: ActualXFactor (Unchanged)
# ============================================================================
class ActualXFactor(Base):
    __tablename__ = "actual_x_factors"
    
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    xf_id = Column(String(50), nullable=False)
    player_name = Column(String(100), nullable=False)
    
    match = relationship("Match", back_populates="actual_x_factors")


# ============================================================================
# MODEL 6: XFactorDefinition (Unchanged)
# ============================================================================
class XFactorDef(Base):
    __tablename__ = "x_factor_definition"

    serial = Column(Integer, primary_key=True, index=True, autoincrement=True)
    id = Column(String(50), nullable=False)
    risk = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    description = Column(String(100), nullable=False)
    status = Column(Boolean, nullable=False, default=True)
    result_description = Column(String(100), nullable=True)