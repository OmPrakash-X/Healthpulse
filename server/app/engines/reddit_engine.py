"""
Reddit Engine — uses PRAW (free, 100 QPM)
Searches health-related subreddits for keyword mentions.
"""
import hashlib
from datetime import datetime, timezone
import praw
from app.engines.base import BaseEngine
from app.models.post import RawPost
from app.config import settings

HEALTH_SUBREDDITS = [
    "medicine", "pharmacy", "AskDocs", "Health",
    "india", "IndianMedicalAssociation", "medical", "Drugs"
]


class RedditEngine(BaseEngine):
    engine_type = "reddit"
    display_name = "Reddit"
    description = "Searches Reddit posts and comments across health subreddits using official PRAW API"

    def _get_client(self):
        return praw.Reddit(
            client_id=settings.reddit_client_id,
            client_secret=settings.reddit_client_secret,
            user_agent=settings.reddit_user_agent,
        )

    async def fetch(self, keywords: list[str], since=None) -> list[RawPost]:
        import asyncio
        return await asyncio.to_thread(self._fetch_sync, keywords, since)

    def _fetch_sync(self, keywords: list[str], since=None) -> list[RawPost]:
        posts = []
        try:
            reddit = self._get_client()
            subreddits_str = self.config.get("subreddits") or "+".join(HEALTH_SUBREDDITS)
            if isinstance(subreddits_str, list):
                subreddits_str = "+".join(subreddits_str)

            max_results = self.config.get("max_results", 25)

            for keyword in keywords[:5]:  # limit keywords to respect rate limits
                subreddit = reddit.subreddit(subreddits_str)
                for submission in subreddit.search(keyword, limit=max_results, sort="new"):
                    text = f"{submission.title}\n{submission.selftext}".strip()
                    if not text:
                        continue

                    posts.append(RawPost(
                        project_id=self.project_id,
                        engine_id=self.engine_id,
                        source="reddit",
                        external_id=submission.id,
                        text=text,
                        original_url=f"https://reddit.com{submission.permalink}",
                        author_hash=hashlib.sha256(
                            str(submission.author).encode()
                        ).hexdigest()[:16] if submission.author else None,
                        timestamp=datetime.fromtimestamp(
                            submission.created_utc, tz=timezone.utc
                        ),
                        metadata={
                            "subreddit": submission.subreddit.display_name,
                            "score": submission.score,
                            "num_comments": submission.num_comments,
                            "keyword": keyword,
                        }
                    ))
        except Exception as e:
            print(f"[RedditEngine] Error: {e}")
        return posts

    def get_config_schema(self) -> dict:
        return {
            "subreddits": {
                "type": "array",
                "items": {"type": "string"},
                "default": HEALTH_SUBREDDITS,
                "description": "Subreddits to search (leave empty for all health subreddits)",
            },
            "max_results": {
                "type": "integer",
                "default": 25,
                "description": "Max posts per keyword per fetch",
            },
        }
