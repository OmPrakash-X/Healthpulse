from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # MongoDB
    mongo_uri: str = "mongodb://localhost:27017"
    db_name: str = "healthpulse"

    # Reddit
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "HealthPulse/1.0"

    # TwitterAPI.io
    twitter_api_key: str = ""

    # LLM APIs (primary: Groq → fallback: Gemini → fallback: Mistral)
    groq_api_key: str = ""
    gemini_api_key: str = ""
    mistral_api_key: str = ""

    # OpenFDA (no key needed)
    faers_base_url: str = "https://api.fda.gov/drug/event.json"

    # Server
    port: int = 8000
    frontend_url: str = "http://localhost:3000"


settings = Settings()
