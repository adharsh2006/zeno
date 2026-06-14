from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Xeno AI-Native CRM"
    API_V1_STR: str = "/api/v1"
    
    # Infrastructure URLs
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/xenocrm"
    REDIS_URL: str = "redis://localhost:6379/0"
    STUB_CHANNEL_URL: str = "http://localhost:8001"
    
    # JWT Configs
    JWT_SECRET_KEY: str = "supersecretkeyxeno123"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 120
    
    # LLM APIs

    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
