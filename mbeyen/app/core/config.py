from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment variables / the .env file."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_NAME: str = "Bu'kuma"
    SHOP_NAME: str = "M.Fenfaquee Enterprise"
    CURRENCY: str = "NLe"
    ENVIRONMENT: str = "development"
    API_V1_PREFIX: str = "/api/v1"
    # Anyone can create a shop from the sign-up page; set to false to close sign-ups
    ALLOW_SIGNUP: bool = True

    DATABASE_URL: str
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # one working day
    JWT_ALGORITHM: str = "HS256"

    # Comma-separated list of allowed frontend origins
    CORS_ORIGINS: str = "http://localhost:5173"

    @field_validator("DATABASE_URL")
    @classmethod
    def use_psycopg_driver(cls, v: str) -> str:
        """Hosted providers hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver name."""
        for prefix in ("postgres://", "postgresql://"):
            if v.startswith(prefix):
                return "postgresql+psycopg://" + v[len(prefix) :]
        return v

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_strength(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long")
        return v

    @property
    def cors_origins_list(self) -> list[str]:
        # Browsers send origins without a trailing slash — tolerate "https://x.netlify.app/"
        return [o.strip().rstrip("/") for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
