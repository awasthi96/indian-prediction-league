"""
SQLAlchemy Models for IPL Prediction App
This file defines the database structure using SQLAlchemy ORM
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime


# ============================================================================
# MODEL 1: User
# ============================================================================
class User(Base):
    """
    Represents users of the app (both admins and players)
    """
    __tablename__ = "users"  # Name of the table in PostgreSQL
    
    # Columns (fields in the table)
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)  # Store hashed passwords!
    role = Column(String(20), nullable=False, default="player")  # "admin" or "player"
    
    # Relationships (connections to other tables)
    predictions = relationship(
        "Prediction",  # Name of the related model
        back_populates="user",  # The field in Prediction that links back
        cascade="all, delete-orphan"  # If user is deleted, delete their predictions too
    )
    
    def __repr__(self):
        """String representation for debugging"""
        return f"<User(id={self.id}, username='{self.username}', role='{self.role}')>"


# ============================================================================
# MODEL 2: Match
# ============================================================================
class Match(Base):
    """
    Represents IPL cricket matches
    Includes both match details AND results (filled in after match completes)
    """
    __tablename__ = "matches"
    
    # ========== MATCH DETAILS (filled when creating match) ==========
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    home_team = Column(String(50), nullable=False)  # e.g., "KKR"
    away_team = Column(String(50), nullable=False)  # e.g., "RCB"
    venue = Column(String(100), nullable=False)  # e.g., "KOLKATA"
    start_time = Column(DateTime, nullable=False)  # When the match starts
    status = Column(String(20), nullable=False, default="upcoming")  # "upcoming", "live", "completed"
    
    # ========== MATCH RESULTS (filled after match completes) ==========
    # These will be NULL until admin enters results
    actual_toss_winner = Column(String(50), nullable=True, default=None)
    actual_match_winner = Column(String(50), nullable=True, default=None)
    actual_top_wicket_taker = Column(String(100), nullable=True, default=None)
    actual_top_run_scorer = Column(String(100), nullable=True, default=None)
    actual_highest_run_scored = Column(Integer, nullable=True, default=None)
    actual_powerplay_runs = Column(Integer, nullable=True, default=None)
    actual_total_wickets = Column(Integer, nullable=True, default=None)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    predictions = relationship(
        "Prediction",
        back_populates="match",
        cascade="all, delete-orphan"  # If match is deleted, delete all predictions for it
    )
    
    # Relationship to actual X-factors that occurred in the match
    actual_x_factors = relationship(
        "ActualXFactor",
        back_populates="match",
        cascade="all, delete-orphan"  # If match is deleted, delete its x-factors
    )
    
    def __repr__(self):
        return f"<Match(id={self.id}, {self.home_team} vs {self.away_team}, status='{self.status}')>"


# ============================================================================
# MODEL 3: Prediction
# ============================================================================
class Prediction(Base):
    """
    Represents a player's predictions for a specific match
    One user can make one prediction per match
    """
    __tablename__ = "predictions"
    
    # Columns
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign Keys (links to other tables)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Prediction fields
    toss_winner = Column(String(50), nullable=False)
    match_winner = Column(String(50), nullable=False)
    top_wicket_taker = Column(String(100), nullable=False)
    top_run_scorer = Column(String(100), nullable=False)
    highest_run_scored = Column(Integer, nullable=False)
    powerplay_runs = Column(Integer, nullable=False)
    total_wickets = Column(Integer, nullable=False)
    
    # Points (calculated after match completes)
    points_earned = Column(Integer, nullable=True, default=None)
    
    # Timestamps (optional but useful)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="predictions")
    match = relationship("Match", back_populates="predictions")
    x_factors = relationship(
        "PredictedXFactor",
        back_populates="prediction",
        cascade="all, delete-orphan"  # If prediction is deleted, delete its x-factors
    )
    
    def __repr__(self):
        return f"<Prediction(id={self.id}, user_id={self.user_id}, match_id={self.match_id})>"


# ============================================================================
# MODEL 4: PredictedXFactor
# ============================================================================
class PredictedXFactor(Base):
    """
    Represents special achievement predictions (X-factors)
    Each prediction can have multiple x-factors
    Example: "Virat Kohli will score 50+ runs" or "Bumrah will bowl 9 dot balls"
    """
    __tablename__ = "predicted_x_factors"
    
    # Columns
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign Key (links to predictions table)
    prediction_id = Column(Integer, ForeignKey("predictions.id"), nullable=False)
    
    # X-factor details
    xf_id = Column(String(50), nullable=False)  # e.g., "XF_BAT_50_RUNS"
    player_name = Column(String(100), nullable=False)  # e.g., "Virat Kohli"
    correct = Column(Boolean, nullable=True, default=None)  # True/False/None (not evaluated yet)
    
    # Relationship
    prediction = relationship("Prediction", back_populates="x_factors")
    
    def __repr__(self):
        return f"<PredictedXFactor(id={self.id}, xf_id='{self.xf_id}', player='{self.player_name}')>"


# ============================================================================
# MODEL 5: ActualXFactor
# ============================================================================
class ActualXFactor(Base):
    """
    Represents X-factors that ACTUALLY occurred during the match
    Admin fills these in after the match completes
    Example: "Virat Kohli scored 50+ runs" or "Bumrah bowled 9 dot balls"
    """
    __tablename__ = "actual_x_factors"
    
    # Columns
    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    
    # Foreign Key (links to matches table)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # X-factor details (what actually happened)
    xf_id = Column(String(50), nullable=False)  # e.g., "XF_BAT_50_RUNS"
    player_name = Column(String(100), nullable=False)  # e.g., "Virat Kohli"
    
    # Relationship
    match = relationship("Match", back_populates="actual_x_factors")
    
    def __repr__(self):
        return f"<ActualXFactor(id={self.id}, match_id={self.match_id}, xf_id='{self.xf_id}', player='{self.player_name}')>"


# ============================================================================
# MODEL 6: XFactorDefinition
# ============================================================================
class XFactorDef(Base):
    """
    Stores predefined X-Factors created by admin
    """
    __tablename__ = "x_factor_definition"

    #Columns
    serial = Column(Integer, primary_key=True, index=True, autoincrement=True)

    id = Column(String(50),nullable=False) # e.g., "XF_BAT_50_RUNS"
    risk = Column(String(50),nullable=False) # "LOW" | "MEDIUM" | "HARD"
    category = Column(String(50),nullable=False) # "batting" | "bowling" | "fielding"
    description = Column(String(100), nullable=False)  # e.g. "Strike rate >= 180 (min 10 balls)"
    status = Column(Boolean, nullable=False, default=True) # e.g. true or false
    result_description = Column(String(100), nullable=True) # e.g. display string in past-tense for result screen 

    def __repr__(self):
        return f"<XFactorDef(serial={self.serial}, id={self.id}, risk='{self.risk}', description='{self.description}')>"
# ============================================================================
# SUMMARY OF RELATIONSHIPS
# ============================================================================
"""
Relationship Summary (How tables are connected):

1. User → Predictions (One-to-Many)
   - One user can make MANY predictions (one per match)
   - Each prediction belongs to ONE user
   
2. Match → Predictions (One-to-Many)
   - One match can have MANY predictions (from different users)
   - Each prediction is about ONE match

3. Match → ActualXFactors (One-to-Many)
   - One match can have MANY actual x-factors that occurred
   - Each actual x-factor belongs to ONE match
   
4. Prediction → PredictedXFactors (One-to-Many)
   - One prediction can have MANY x-factor predictions
   - Each predicted x-factor belongs to ONE prediction

Visual Diagram:
                    ┌─────────────┐
                    │    Match    │
                    └─────────────┘
                          │
                ┌─────────┼─────────┐
                │                   │
                ▼                   ▼
         ┌──────────┐        ┌─────────────────┐
         │Prediction│        │ ActualXFactor   │
         └──────────┘        └─────────────────┘
               │
               │
               ▼
    ┌──────────────────┐
    │PredictedXFactor  │
    └──────────────────┘

    User (1) ----< Predictions (Many)
"""