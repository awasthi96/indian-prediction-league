"""
Database configuration for FastAPI + SQLAlchemy
Supports both PostgreSQL (production/local) and SQLite (testing)
"""

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import declarative_base, sessionmaker
import os

# ============================================================================
# DATABASE CONFIGURATION
# ============================================================================

APP_ENV = os.getenv("APP_ENV", "local")

# Option 1: Try to get DATABASE_URL from environment variable (for deployment)
DATABASE_URL = os.getenv("DATABASE_URL")

# Option 2: If no environment variable, use local PostgreSQL
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not set")

DB_SCHEMA = "ipl_prod" if APP_ENV == "prod" else "ipl_staging"

if APP_ENV == "prod" and DB_SCHEMA != "ipl_prod":
    raise RuntimeError("🚨 PROD cannot use non-prod schema")

# ============================================================================
# ENGINE SETUP
# ============================================================================

# Create the database engine (the "connection" to the database)
engine = create_engine(
    DATABASE_URL,
    # SQLite needs this special setting for FastAPI's threading
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    # Echo SQL queries to console (helpful for learning/debugging)
    echo=False,  # Set to False in production
    execution_options={
        "schema_translate_map": {"public": DB_SCHEMA}
    }
)

@event.listens_for(engine,"checkout")
def set_search_path(dbapi_connection, connection_record, connection_proxy):
    cursor = dbapi_connection.cursor()
    try:
        cursor.execute(f"SET search_path TO {DB_SCHEMA}")
    finally:
        cursor.close()

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
    db = SessionLocal()
    try:
        yield db  # Give the session to the route
    finally:
        db.close()  # Always close the session when done


# ============================================================================
# HELPER FUNCTIONS (OPTIONAL BUT USEFUL)
# ============================================================================

def init_db():
    # 1. Determine which schema to use (default to ipl_staging if not set)
    schema = os.getenv("DB_SCHEMA", "ipl_staging")
    print(f"🛠️  Initializing database in schema: {schema}")

    with engine.connect() as connection:
        # 2. Create the schema if it doesn't exist
        connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema}"))
        # 3. Set the search path to that schema
        # This tells SQLAlchemy: "Create all tables INSIDE this schema, not public"
        connection.execute(text(f"SET search_path TO {schema}"))
        connection.commit()

    # 4. Create all tables in the active schema
    print("🚀 Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")


def drop_all_tables():
    """
    Drop all tables (DANGEROUS - use only in development!)
    Useful when you want to reset your database.
    """
    Base.metadata.drop_all(bind=engine)
    print("⚠️ All tables dropped!")


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