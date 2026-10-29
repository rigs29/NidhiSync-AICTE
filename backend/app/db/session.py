import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# Normalize connection string for PostgreSQL drivers
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

# SQLite File Location Persistence for Serverless (Vercel / AWS Lambda)
if "sqlite" in db_url and (os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME")):
    tmp_db_path = "/tmp/aicte_fdr.db"
    # If the database does not exist in /tmp or is 0 bytes, restore from bundled seed db
    if not os.path.exists(tmp_db_path) or os.path.getsize(tmp_db_path) == 0:
        candidate_seeds = [
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "backend", "aicte_fdr.db"),
            os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "aicte_fdr.db"),
            os.path.join(os.getcwd(), "backend", "aicte_fdr.db"),
            os.path.join(os.getcwd(), "aicte_fdr.db"),
        ]
        for seed_path in candidate_seeds:
            if os.path.exists(seed_path) and os.path.getsize(seed_path) > 0:
                try:
                    os.makedirs("/tmp", exist_ok=True)
                    shutil.copyfile(seed_path, tmp_db_path)
                    print(f"[DB Session] Successfully initialized /tmp/aicte_fdr.db from {seed_path}")
                    break
                except Exception as e:
                    print(f"[DB Session Warning] Could not copy {seed_path}: {e}")

connect_args = {}
engine_kwargs = {"pool_pre_ping": True}

if db_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # Serverless PostgreSQL settings: auto-reconnect, connection recycling
    engine_kwargs["pool_recycle"] = 300
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    engine_kwargs["pool_timeout"] = 30

engine = create_engine(db_url, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
