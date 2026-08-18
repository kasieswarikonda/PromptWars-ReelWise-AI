import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Force loading .env file from the current directory or parent directory
load_dotenv()

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    DATABASE_URL: str = "sqlite:///./reelwise.db"
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
