"""
Multi-LLM Router — Primary: Groq → Fallback: Gemini → Fallback: Mistral

One structured JSON prompt does ALL analysis in a single API call:
- Drug/symptom entity extraction
- Sentiment analysis (works for Hindi, English, Hinglish)
- PII detection and redaction
- Adverse event detection
- Severity scoring

Zero local model downloads. Zero version conflicts. ~200ms per post.
"""
import json
import asyncio
from typing import Optional
from pydantic import BaseModel
from app.config import settings


class AnalysisResult(BaseModel):
    drugs: list[str] = []
    symptoms: list[str] = []
    sentiment: str = "neutral"
    sentiment_score: float = 0.5
    is_adverse_event: bool = False
    adverse_confidence: float = 0.0
    pii_detected: bool = False
    pii_types: list[str] = []
    redacted_text: str = ""
    severity: int = 1          # 1-5
    temporal_signal: bool = False
    language: str = "english"
    summary: str = ""
    model_used: str = ""       # traceability — which LLM was used


ANALYSIS_PROMPT = """You are a medical pharmacovigilance signal intelligence system.
Analyze this social media post for drug safety signals.
The post may be in English, Hindi, or Hinglish (mixed Hindi-English).

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{{
  "drugs": ["list of drug names mentioned"],
  "symptoms": ["list of symptoms/side effects mentioned"],
  "sentiment": "very_negative|negative|neutral|positive|very_positive",
  "sentiment_score": 0.0-1.0,
  "is_adverse_event": true/false,
  "adverse_confidence": 0.0-1.0,
  "pii_detected": true/false,
  "pii_types": ["PERSON", "PHONE_NUMBER", "EMAIL", "AADHAAR", "LOCATION"],
  "redacted_text": "text with PII replaced by [REDACTED]",
  "severity": 1-5,
  "temporal_signal": true/false,
  "language": "english|hindi|hinglish",
  "summary": "one sentence summary of the medical concern"
}}

Severity scale: 1=mild (headache), 2=moderate (rash), 3=significant (vomiting), 4=serious (chest pain), 5=critical (death/hospitalization)
temporal_signal: true if post mentions time relationship e.g. "after taking", "since starting", "2 weeks later"

Post to analyze:
{text}"""


async def _try_groq(text: str) -> Optional[AnalysisResult]:
    if not settings.groq_api_key:
        return None
    try:
        from groq import AsyncGroq
        client = AsyncGroq(api_key=settings.groq_api_key)
        response = await client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": ANALYSIS_PROMPT.format(text=text)}],
            temperature=0.1,
            max_tokens=600,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        result = AnalysisResult(**data)
        result.model_used = "groq/llama-3.3-70b"
        return result
    except Exception as e:
        print(f"[LLM Router] Groq failed: {e}")
        return None


async def _try_gemini(text: str) -> Optional[AnalysisResult]:
    if not settings.gemini_api_key:
        return None
    try:
        import re
        import google.generativeai as genai
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = ANALYSIS_PROMPT.format(text=text) + "\n\nIMPORTANT: Return ONLY raw JSON, no markdown code fences."
        response = await asyncio.to_thread(model.generate_content, prompt)
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        data = json.loads(raw)
        result = AnalysisResult(**data)
        result.model_used = "gemini/gemini-2.5-flash"
        return result
    except Exception as e:
        print(f"[LLM Router] Gemini failed: {e}")
        return None


async def _try_mistral(text: str) -> Optional[AnalysisResult]:
    if not settings.mistral_api_key:
        return None
    try:
        from mistralai import Mistral
        client = Mistral(api_key=settings.mistral_api_key)
        response = await asyncio.to_thread(
            client.chat.complete,
            model="mistral-small-latest",
            messages=[{"role": "user", "content": ANALYSIS_PROMPT.format(text=text)}],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content)
        result = AnalysisResult(**data)
        result.model_used = "mistral/mistral-small"
        return result
    except Exception as e:
        print(f"[LLM Router] Mistral failed: {e}")
        return None


async def analyze(text: str) -> AnalysisResult:
    """
    Analyze a social media post using the best available LLM.
    Tries Groq → Gemini → Mistral in order.
    Falls back to a safe default if all providers fail.
    """
    # Truncate very long posts (LLMs have context limits; 2000 chars is plenty)
    truncated = text[:2000] if len(text) > 2000 else text

    for provider_fn in [_try_groq, _try_gemini, _try_mistral]:
        result = await provider_fn(truncated)
        if result is not None:
            result.redacted_text = result.redacted_text or text
            return result

    # All providers failed — return safe default (will be flagged for manual review)
    print("[LLM Router] All providers failed — returning default result")
    return AnalysisResult(
        redacted_text=text,
        model_used="none/failed",
        summary="Analysis failed — manual review required",
        adverse_confidence=0.0,
    )
