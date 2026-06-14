from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite+aiosqlite:///./gymdb.sqlite"
    SECRET_KEY: str = "super_secret_key_change_me_in_prod"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    # Legacy Resend fields (kept for compatibility, not used when Gmail SMTP is active)
    RESEND_API_KEY: str = "re_stub"
    EMAIL_FROM: str = "FitX Pro <dhruvpratapsinghchauhan9@gmail.com>"
    GYM_NAME: str = "FitX Pro"
    ALGORITHM: str = "HS256"
    APP_ENV: str = "development"
    # Gmail SMTP
    GMAIL_USER: str = ""
    GMAIL_APP_PASSWORD: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
