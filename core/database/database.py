from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

def get_engine(dsn: str, pool_size: int = 10, max_overflow: int = 20):
    return create_engine(dsn, pool_pre_ping=True, pool_size=pool_size, max_overflow=max_overflow)

def get_session_factory(engine):
    return sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db(engine):
    Base.metadata.create_all(bind=engine)