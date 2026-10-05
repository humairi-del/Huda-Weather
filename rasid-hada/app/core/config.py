from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str
    openai_api_key: str = ""
    secret_key: str
    owner_email: str = ""
    daily_visitor_message_limit: int = 10

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
