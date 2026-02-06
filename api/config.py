"""
GLTCH Cloud API - Configuration
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings from environment variables"""
    
    # App
    app_secret_key: str = "change-me-in-production"
    frontend_url: str = "http://localhost:8080"
    debug: bool = True
    
    # Clerk Auth
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    
    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro: str = ""
    
    # LLM Providers (default keys, users can bring their own)
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    google_api_key: str = ""
    xai_api_key: str = ""
    
    # Database
    database_url: str = "sqlite:///./gltch_cloud.db"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()
