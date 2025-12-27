"""
Database configuration for FastAPI + SQLAlchemy
Supports both PostgreSQL (production/local) and SQLite (testing)
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

# Option 1: Try to get DATABASE_URL from environment variable (for deployment)
DATABASE_URL = "postgresql://postgres:rsQlVrnEaGcEEwyKpFqUNtqOTejywiiQ@switchback.proxy.rlwy.net:34063/railway"

# Option 2: If no environment variable, use local PostgreSQL
if not DATABASE_URL:
    # REPLACE THESE WITH YOUR ACTUAL VALUES:
    DB_USER = "ipl_app_user"  # or "ipl_app_user" if you got it working
    DB_PASSWORD = "testing123"  # Your PostgreSQL password
    DB_HOST = "localhost"
    DB_PORT = "5432"
    DB_NAME = "indian_prediction_league"
    
    # Build the connection string
    DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    
    # If you want to use SQLite for testing instead, uncomment this:
    # DATABASE_URL = "sqlite:///./test.db"

# Fix Railway's postgres:// to postgresql:// (if needed)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# ============================================================================
# ENGINE SETUP
# ============================================================================

# Create the database engine (the "connection" to the database)
engine = create_engine(
    DATABASE_URL,
    # SQLite needs this special setting for FastAPI's threading
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    # Echo SQL queries to console (helpful for learning/debugging)
    echo=False  # Set to False in production
)

# ============================================================================
# SESSION SETUP
# ============================================================================

# Create a session factory (creates database sessions)
SessionLocal = sessionmaker(
    autocommit=False,  # We'll manually commit changes
    autoflush=False,   # We'll manually flush changes
    bind=engine        # Connect to our engine
)

# ============================================================================
# BASE CLASS
# ============================================================================

# Base class for all database models
Base = declarative_base()

# ============================================================================
# DEPENDENCY FUNCTION
# ============================================================================

def get_db():
    """
    FastAPI dependency that provides a database session.
    
    Usage in routes:
        @app.get("/users/")
        def get_users(db: Session = Depends(get_db)):
            return db.query(User).all()
    
    The session is automatically closed after the request.
    """
    db = SessionLocal()
    try:
        yield db  # Give the session to the route
    finally:
        db.close()  # Always close the session when done


# ============================================================================
# HELPER FUNCTIONS (OPTIONAL BUT USEFUL)
# ============================================================================

def init_db():
    """
    Create all tables in the database.
    Call this once when setting up your app for the first time.
    
    Usage:
        from database import init_db
        init_db()
    """
    # Import all models here so they're registered with Base
    from models import User, Match, Prediction, PredictedXFactor, ActualXFactor, XFactorDef

    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")


def drop_all_tables():
    """
    Drop all tables (DANGEROUS - use only in development!)
    Useful when you want to reset your database.
    """
    Base.metadata.drop_all(bind=engine)
    print("⚠️ All tables dropped!")



Base.metadata.create_all(bind=engine)
# ============================================================================
# USAGE EXAMPLES
# ============================================================================

"""
1. First time setup:
   from database import init_db
   init_db()

2. In your FastAPI routes:
   from fastapi import Depends
   from sqlalchemy.orm import Session
   from database import get_db
   
   @app.get("/users/")
   def get_users(db: Session = Depends(get_db)):
       users = db.query(User).all()
       return users

3. Reset database (development only):
   from database import drop_all_tables, init_db
   drop_all_tables()
   init_db()
"""