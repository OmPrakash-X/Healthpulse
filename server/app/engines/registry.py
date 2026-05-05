"""
Engine Registry — Plugin System

To add a new engine:
  1. Create a class in engines/ that extends BaseEngine
  2. Call register_engine("type_name", YourEngineClass) at the bottom of this file

The admin UI auto-discovers registered engines and builds setup forms from config_schema.
"""
from app.engines.base import BaseEngine

_registry: dict[str, type[BaseEngine]] = {}


def register_engine(engine_type: str, cls: type[BaseEngine]):
    _registry[engine_type] = cls


def get_engine_class(engine_type: str) -> type[BaseEngine] | None:
    return _registry.get(engine_type)


def list_engine_types() -> list[dict]:
    """Returns info for all registered engines — used by admin UI"""
    return [cls(engine_id="preview", project_id="preview", config={}).get_info()
            for cls in _registry.values()]


def build_engine(engine_type: str, engine_id: str, project_id: str, config: dict) -> BaseEngine | None:
    cls = get_engine_class(engine_type)
    if cls is None:
        return None
    return cls(engine_id=engine_id, project_id=project_id, config=config)


# ── Register all built-in engines ──────────────────────────────────────────────
from app.engines.reddit_engine import RedditEngine      # noqa: E402
from app.engines.twitter_engine import TwitterEngine    # noqa: E402
from app.engines.quora_engine import QuoraEngine        # noqa: E402

register_engine("reddit", RedditEngine)
register_engine("twitter", TwitterEngine)
register_engine("quora", QuoraEngine)
