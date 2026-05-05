"""
Twitter/X Engine — uses twitterapi.io Advanced Search
Pay-as-you-go, credits provided by hackathon organizers.
$0.15 per 1000 tweets. Free tier: 1 req per 5 seconds QPS.
"""
import asyncio
import hashlib
from datetime import datetime, timezone
import httpx
from app.engines.base import BaseEngine
from app.models.post import RawPost
from app.config import settings

TWITTERAPI_BASE = "https://api.twitterapi.io"


class TwitterEngine(BaseEngine):
    engine_type = "twitter"
    display_name = "X / Twitter"
    description = "Searches X (Twitter) using twitterapi.io Advanced Search for real-time health signal monitoring"

    async def fetch(self, keywords: list[str], since=None) -> list[RawPost]:
        if not settings.twitter_api_key:
            print("[TwitterEngine] No API key configured — skipping")
            return []

        posts = []
        headers = {"X-API-Key": settings.twitter_api_key}
        max_results = self.config.get("max_results", 20)

        async with httpx.AsyncClient(timeout=15.0) as client:
            for i, keyword in enumerate(keywords[:5]):
                # Free tier: 1 request per 5 seconds QPS limit
                if i > 0:
                    await asyncio.sleep(6)

                query = self.config.get(
                    "search_query_template",
                    "{keyword} side effects OR reaction OR adverse"
                ).format(keyword=keyword)

                try:
                    resp = await client.get(
                        f"{TWITTERAPI_BASE}/twitter/tweet/advanced_search",
                        headers=headers,
                        params={
                            "query": query,
                            "queryType": "Latest",
                            "count": max_results,
                        }
                    )
                    if resp.status_code == 429:
                        print(f"[TwitterEngine] Rate limited on '{keyword}' — stopping early")
                        break
                    if resp.status_code != 200:
                        print(f"[TwitterEngine] API error {resp.status_code}: {resp.text[:200]}")
                        continue

                    tweets = resp.json().get("tweets", [])
                    for tweet in tweets:
                        text = tweet.get("text", "").strip()
                        if not text:
                            continue

                        ts_str = tweet.get("createdAt", "")
                        try:
                            ts = datetime.strptime(ts_str, "%a %b %d %H:%M:%S +0000 %Y").replace(tzinfo=timezone.utc)
                        except Exception:
                            ts = datetime.now(timezone.utc)

                        author_id = str(tweet.get("author", {}).get("id", "unknown"))
                        posts.append(RawPost(
                            project_id=self.project_id,
                            engine_id=self.engine_id,
                            source="twitter",
                            external_id=tweet.get("id", ""),
                            text=text,
                            original_url=f"https://x.com/i/web/status/{tweet.get('id', '')}",
                            author_hash=hashlib.sha256(author_id.encode()).hexdigest()[:16],
                            timestamp=ts,
                            metadata={
                                "lang": tweet.get("lang", ""),
                                "likes": tweet.get("likeCount", 0),
                                "retweets": tweet.get("retweetCount", 0),
                                "keyword": keyword,
                            }
                        ))
                except Exception as e:
                    print(f"[TwitterEngine] Fetch error for '{keyword}': {e}")

        return posts

    def get_config_schema(self) -> dict:
        return {
            "search_query_template": {
                "type": "string",
                "default": "{keyword} side effects OR reaction OR adverse",
                "description": "Search query template. Use {keyword} as placeholder.",
            },
            "max_results": {
                "type": "integer",
                "default": 20,
                "description": "Max tweets per keyword per fetch",
            },
        }
