"""
Quora Engine — HTTP scraper using httpx + BeautifulSoup4
Targets public Quora search results. Falls back to mock data if blocked.
Note: Quora may block scrapers — mock data ensures demo reliability.
"""
import hashlib
from datetime import datetime, timezone
import httpx
from bs4 import BeautifulSoup
from app.engines.base import BaseEngine
from app.models.post import RawPost

QUORA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "en-US,en;q=0.9",
}

# Fallback mock data for demo reliability
MOCK_QUORA_POSTS = [
    ("dolo650_q1", "Dolo 650 side effects", "I have been taking Dolo 650 for 3 days for fever. Now I feel dizzy and nauseous after every dose. Is this normal? Should I stop?"),
    ("azithro_q1", "Azithromycin stomach pain", "Doctor prescribed Azithromycin 500mg for throat infection. After 2 days I am having severe stomach pain and loose stools. Very uncomfortable."),
    ("metformin_q1", "Metformin headache and fatigue", "Started metformin 2 weeks ago for diabetes. Constant headache and I feel very tired all the time. Is this from metformin?"),
    ("pantop_q1", "Pantoprazole long term use", "Taking pantoprazole daily for 6 months. Recently my joints have started hurting a lot. Could this be related to the medicine?"),
    ("paracetamol_q1", "Paracetamol liver damage risk", "I take 2 paracetamol tablets twice daily for chronic pain. I read it can damage liver. How long is safe to take it?"),
]


class QuoraEngine(BaseEngine):
    engine_type = "quora"
    display_name = "Quora"
    description = "Scrapes Quora questions and answers related to health keywords. Falls back to representative mock data if blocked."

    async def fetch(self, keywords: list[str], since=None) -> list[RawPost]:
        posts = []

        # Try live scraping first
        async with httpx.AsyncClient(headers=QUORA_HEADERS, timeout=10.0, follow_redirects=True) as client:
            for keyword in keywords[:3]:
                try:
                    url = f"https://www.quora.com/search?q={keyword}+side+effects&type=question"
                    resp = await client.get(url)
                    if resp.status_code == 200:
                        scraped = self._parse_quora(resp.text, keyword)
                        posts.extend(scraped)
                except Exception as e:
                    print(f"[QuoraEngine] Scraping failed for '{keyword}': {e}")

        # If live scraping got nothing, use mock data (ensures demo works)
        if not posts:
            print("[QuoraEngine] Using mock data (live scraping unavailable)")
            posts = self._get_mock_posts(keywords)

        return posts

    def _parse_quora(self, html: str, keyword: str) -> list[RawPost]:
        posts = []
        try:
            soup = BeautifulSoup(html, "lxml")
            # Quora question links
            question_elements = soup.select("a[href*='/What'], a[href*='/How'], a[href*='/Is'], a[href*='/Why']")
            for elem in question_elements[:10]:
                text = elem.get_text(strip=True)
                href = elem.get("href", "")
                if len(text) > 20 and any(k.lower() in text.lower() for k in [keyword, "medicine", "drug", "tablet"]):
                    posts.append(RawPost(
                        project_id=self.project_id,
                        engine_id=self.engine_id,
                        source="quora",
                        external_id=hashlib.md5(text.encode()).hexdigest()[:12],
                        text=text,
                        original_url=f"https://www.quora.com{href}" if href.startswith("/") else href,
                        timestamp=datetime.now(timezone.utc),
                        metadata={"keyword": keyword, "type": "question"},
                    ))
        except Exception as e:
            print(f"[QuoraEngine] Parse error: {e}")
        return posts

    def _get_mock_posts(self, keywords: list[str]) -> list[RawPost]:
        """Return representative mock posts when live scraping is unavailable"""
        posts = []
        for ext_id, title, text in MOCK_QUORA_POSTS:
            # Include mock post if relevant to any project keyword
            if any(k.lower() in text.lower() or k.lower() in title.lower() for k in keywords) or not keywords:
                posts.append(RawPost(
                    project_id=self.project_id,
                    engine_id=self.engine_id,
                    source="quora",
                    external_id=f"mock_{ext_id}",
                    text=f"{title}\n\n{text}",
                    original_url="https://www.quora.com/mock",
                    timestamp=datetime.now(timezone.utc),
                    metadata={"keyword": keywords[0] if keywords else "", "type": "mock"},
                ))
        return posts

    def get_config_schema(self) -> dict:
        return {
            "target_urls": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Specific Quora URLs to scrape (optional)",
            },
            "max_results": {
                "type": "integer",
                "default": 10,
                "description": "Max questions per keyword per fetch",
            },
        }
