from abc import ABC, abstractmethod
from datetime import datetime
from app.models.post import RawPost


class BaseEngine(ABC):
    """Abstract base class for all data acquisition engines.
    
    Adding a new source = create a subclass, implement fetch() and get_config_schema().
    Register it in registry.py. That's it — the plugin system handles the rest.
    """

    engine_type: str = "base"
    display_name: str = "Base Engine"
    description: str = ""

    def __init__(self, engine_id: str, project_id: str, config: dict):
        self.engine_id = engine_id
        self.project_id = project_id
        self.config = config

    @abstractmethod
    async def fetch(self, keywords: list[str], since: datetime | None = None) -> list[RawPost]:
        """Fetch posts matching keywords from this source.
        
        Args:
            keywords: List of keywords/phrases to search for
            since: Only fetch posts newer than this timestamp (None = fetch all recent)
        
        Returns:
            List of RawPost objects (text NOT yet PII-redacted — pipeline handles that)
        """
        ...

    @abstractmethod
    def get_config_schema(self) -> dict:
        """Return JSON Schema describing this engine's config options.
        Used by the admin UI to render the engine setup form dynamically.
        """
        ...

    def get_info(self) -> dict:
        return {
            "engine_type": self.engine_type,
            "display_name": self.display_name,
            "description": self.description,
            "config_schema": self.get_config_schema(),
        }
