import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Leave Management System"
    API_V1_STR: str = "/api/v1"
    
    # DATABASE
    POSTGRES_SERVER: str = os.getenv("POSTGRES_SERVER", "localhost")
    POSTGRES_USER: str = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "postgres")
    POSTGRES_DB: str = os.getenv("POSTGRES_DB", "hrms")
    POSTGRES_PORT: str = os.getenv("POSTGRES_PORT", "5432")
    DATABASE_URL: str | None = None
    SQLALCHEMY_DATABASE_URI: str | None = os.getenv("DATABASE_URL")
    
    # SECURITY
    SECRET_KEY: str = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7") # Change in prod
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

print("DATABASE_URL =", settings.DATABASE_URL)
print("SQLALCHEMY_DATABASE_URI =", settings.SQLALCHEMY_DATABASE_URI)

if settings.DATABASE_URL:
    settings.SQLALCHEMY_DATABASE_URI = settings.DATABASE_URL
elif not settings.SQLALCHEMY_DATABASE_URI:
    # Temporarily using SQLite for local development so you can test without a Postgres DB!
    settings.SQLALCHEMY_DATABASE_URI = "sqlite:///./hrms.db"
