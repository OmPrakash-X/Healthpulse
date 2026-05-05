# HealthPulse — Real-Time Patient Signal Intelligence Platform

> **Hackathon Project** · Vol. 1.0 · India Edition

HealthPulse is an agentic pharmacovigilance platform that monitors Reddit, X (Twitter), and Quora in real-time, extracts adverse drug event signals using a multi-LLM pipeline, cross-validates them against FDA FAERS, and surfaces risk-scored alerts through a newsprint-themed editorial dashboard.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Prerequisites](#prerequisites)
5. [Environment Variables](#environment-variables)
6. [Setup — Backend](#setup--backend)
7. [Setup — Frontend](#setup--frontend)
8. [Seeding the Database](#seeding-the-database)
9. [Running the Platform](#running-the-platform)
10. [API Reference](#api-reference)
11. [The Multi-LLM Pipeline](#the-multi-llm-pipeline)
12. [Risk Scoring Formula](#risk-scoring-formula)
13. [Agentic Engine Onboarding](#agentic-engine-onboarding)
14. [Dashboard Pages](#dashboard-pages)
15. [Design System](#design-system)
16. [Demo Flow](#demo-flow)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  Next.js 16 Frontend (Port 3000)                │
│  Landing → Dashboard → Signals → Timeline → Engines → Analytics │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP fetch (NEXT_PUBLIC_API_URL)
┌───────────────────────────▼──────────────────────────────────┐
│                 FastAPI Backend (Port 8000)                  │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌───────────────────┐  │
│  │   Routers   │   │   Engines    │   │     Pipeline      │  │
│  │  projects   │   │  reddit      │   │  llm_router       │  │
│  │  engines    │   │  twitter     │   │  orchestrator     │  │
│  │  signals    │   │  quora       │   │  risk_scorer      │  │
│  │  analytics  │   │  registry    │   │  signal_validator │  │
│  │  faers      │   └──────────────┘   └───────────────────┘  │
│  └─────────────┘                                             │
│              APScheduler (5-min tick)                        │
└───────────┬────────────┬──────────────┬──────────────────────┘
            │            │              │
    ┌───────▼──┐  ┌──────▼────┐  ┌─────▼──────┐
    │ MongoDB  │  │ Groq API  │  │ OpenFDA    │
    │  Atlas   │  │ (Primary) │  │ FAERS API  │
    │          │  │ Gemini    │  │            │
    │ projects │  │ (Fallback)│  └────────────┘
    │ engines  │  │ Mistral   │
    │ raw_posts│  │ (Fallback)│
    │ signals  │  └───────────┘
    └──────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 16 (App Router) + TypeScript | SSR, Server Components, fast |
| **Styling** | Tailwind CSS v4 | Utility-first, v4 theme tokens |
| **Backend** | Python FastAPI + uvicorn | Async, fast, great for LLM orchestration |
| **Database** | MongoDB Atlas (Motor async driver) | Flexible schema, free M0 cluster |
| **Task Queue** | APScheduler (in-process) | No Redis/Celery needed |
| **LLM Primary** | Groq API (`llama-3.3-70b`) | Free, 30 req/min, ~200ms response |
| **LLM Fallback 1** | Google Gemini Flash | Free, 15 req/min, 1500 req/day |
| **LLM Fallback 2** | Mistral API (`mistral-small`) | Free tier, 1 req/sec |
| **Twitter/X** | twitterapi.io Advanced Search | Hackathon-provided credits |
| **Reddit** | PRAW | Official Python wrapper |
| **Drug Safety** | OpenFDA FAERS API | Free, no key needed |
| **Icons** | lucide-react | Consistent, lightweight |

---

## Project Structure

```
HealthPulse/
├── client/                          ← Next.js 16 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           ← Root layout (4 fonts loaded)
│   │   │   ├── page.tsx             ← Landing page
│   │   │   ├── globals.css          ← Newsprint design system
│   │   │   └── dashboard/
│   │   │       ├── layout.tsx       ← Sidebar + topbar shell
│   │   │       ├── page.tsx         ← Overview (Morning Brief)
│   │   │       ├── projects/        ← Projects CRUD
│   │   │       ├── signals/         ← Signal explorer + filters
│   │   │       ├── timeline/        ← Chronological signal view
│   │   │       ├── engines/         ← Engine management + AI onboarding
│   │   │       └── analytics/       ← Risk distribution + trending
│   │   ├── components/
│   │   │   └── layout/
│   │   │       └── DashboardSidebar.tsx
│   │   └── lib/
│   │       └── api.ts               ← Typed API client + mock fallbacks
│   ├── COLORTHEME.md                ← Newsprint design system spec
│   ├── .env.local                   ← NEXT_PUBLIC_API_URL
│   └── package.json
│
└── server/                          ← FastAPI backend
    ├── app/
    │   ├── main.py                  ← FastAPI app entry + CORS + lifespan
    │   ├── config.py                ← Pydantic settings (reads .env)
    │   ├── database.py              ← Motor MongoDB client
    │   ├── routers/
    │   │   ├── projects.py          ← CRUD: /api/projects
    │   │   ├── engines.py           ← CRUD + suggest-config: /api/engines
    │   │   ├── signals.py           ← Query + filter: /api/signals
    │   │   ├── analytics.py         ← Aggregations: /api/analytics/*
    │   │   └── faers.py             ← FDA proxy: /api/faers/*
    │   ├── engines/
    │   │   ├── base.py              ← Abstract BaseEngine plugin contract
    │   │   ├── reddit_engine.py     ← PRAW-based Reddit scraper
    │   │   ├── twitter_engine.py    ← twitterapi.io client
    │   │   ├── quora_engine.py      ← httpx + BeautifulSoup scraper
    │   │   └── registry.py          ← Plugin registry (type → class map)
    │   ├── pipeline/
    │   │   ├── llm_router.py        ← Groq → Gemini → Mistral with fallback
    │   │   ├── orchestrator.py      ← End-to-end post → signal pipeline
    │   │   └── risk_scorer.py       ← 0.4S + 0.3F + 0.3V formula
    │   └── services/
    │       ├── scheduler.py         ← APScheduler 5-min tick
    │       └── faers_client.py      ← OpenFDA FAERS helper
    ├── scripts/
    │   └── seed.py                  ← Populate MongoDB with demo data
    ├── requirements.txt
    ├── .env                         ← All secrets (not committed)
    └── .env.example                 ← Template for .env
```

---

## Prerequisites

- **Python 3.11+** with `pip`
- **Node.js 20+** with `npm`
- **MongoDB Atlas** account — free M0 cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
- **Groq API key** — free at [console.groq.com](https://console.groq.com) → API Keys
- **Gemini API key** — free at [aistudio.google.com](https://aistudio.google.com) → Get API Key
- **Mistral API key** — free at [console.mistral.ai](https://console.mistral.ai) → API Keys
- **twitterapi.io key** — provided by hackathon organizers

---

## Environment Variables

### Backend — `server/.env`

```env
# MongoDB Atlas — cloud.mongodb.com → Free M0 cluster → Connect → Drivers
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/
DB_NAME=healthpulse

# Reddit (optional) — reddit.com/prefs/apps → Create App (type: script)
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=HealthPulse/1.0 by YourUsername

# Twitter — twitterapi.io
TWITTER_API_KEY=your_key_here

# Groq (PRIMARY LLM) — console.groq.com → API Keys
GROQ_API_KEY=gsk_...

# Gemini (FALLBACK 1) — aistudio.google.com
GEMINI_API_KEY=AIzaSy...

# Mistral (FALLBACK 2) — console.mistral.ai
MISTRAL_API_KEY=...

# OpenFDA — no key needed
FAERS_BASE_URL=https://api.fda.gov/drug/event.json

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend — `client/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Setup — Backend

```bash
# 1. Navigate to server directory
cd server

# 2. Create virtual environment
python -m venv ../venv

# 3. Activate it
# Windows:
..\venv\Scripts\activate
# macOS/Linux:
source ../venv/bin/activate

# 4. Install all dependencies
pip install -r requirements.txt

# 5. Copy and fill environment variables
cp .env.example .env
# Edit .env with your actual API keys
```

### `requirements.txt` includes:
```
fastapi uvicorn[standard] motor pydantic-settings python-dotenv
httpx praw beautifulsoup4 apscheduler groq google-generativeai mistralai
```

---

## Setup — Frontend

```bash
# 1. Navigate to client directory
cd client

# 2. Install dependencies
npm install

# 3. Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
```

---

## Seeding the Database

Populate MongoDB with realistic demo data (2 projects, 2 engines, 10 posts, 10 signals) — no LLM calls, instant:

```bash
cd server
..\venv\Scripts\python scripts\seed.py
```

**What it inserts:**
- **Projects**: "OTC Drug Watch India" + "Antibiotic Resistance Watch"
- **Engines**: Twitter (realtime) + Quora (daily)
- **Posts**: 10 realistic patient-reported posts including Hinglish (`"Dolo 650 khane ke baad chakkar aa rahe hain"`)
- **Signals**: 10 pre-computed signals covering Dolo-650, Paracetamol, Amoxicillin, Ibuprofen, Azithromycin, Metformin etc. with risk scores, FAERS match flags, and confidence levels

---

## Running the Platform

### Start Backend

```bash
cd server
..\venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Backend is live at: `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/docs`

### Start Frontend

```bash
cd client
npm run dev
```

Frontend is live at: `http://localhost:3000`

---

## API Reference

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/projects` | List all monitoring projects |
| `POST` | `/api/projects` | Create a new project |
| `GET` | `/api/projects/{id}` | Get project with signal stats |
| `PUT` | `/api/projects/{id}` | Update project |
| `DELETE` | `/api/projects/{id}` | Delete project |

**Create Project body:**
```json
{
  "name": "OTC Drug Watch India",
  "description": "Monitor OTC drug adverse events",
  "keywords": ["paracetamol", "dolo-650", "ibuprofen"],
  "is_active": true
}
```

---

### Engines

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/engines` | List all configured engines |
| `POST` | `/api/engines` | Add a new engine |
| `PUT` | `/api/engines/{id}` | Update engine config |
| `DELETE` | `/api/engines/{id}` | Remove engine |
| `POST` | `/api/engines/{id}/trigger` | Manually trigger an ingest cycle |
| `POST` | `/api/engines/suggest-config` | ⭐ **AI agentic onboarding** |

**Suggest Config (Agentic Onboarding):**
```bash
POST /api/engines/suggest-config
{ "url": "https://www.reddit.com/r/india" }
```

Response:
```json
{
  "engine_type": "reddit",
  "latency_mode": "daily",
  "suggested_keywords": ["paracetamol", "dolo", "fever", "medicine", "side effects"],
  "css_selectors": { "post": ".Post", "title": "h3", "body": ".RichTextJSON-root" },
  "confidence": 0.94,
  "explanation": "This is a Reddit community page. A Reddit engine with daily polling is recommended...",
  "model_used": "groq/llama-3.3-70b",
  "url_analyzed": "https://www.reddit.com/r/india"
}
```

---

### Signals

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/signals` | List signals (filterable) |
| `GET` | `/api/signals/{id}` | Signal detail with evidence |

**Query parameters for `GET /api/signals`:**

| Param | Type | Description |
|-------|------|-------------|
| `drug` | string | Filter by drug name (partial match) |
| `risk_level` | `high\|moderate\|low` | Filter by risk level |
| `faers_match` | boolean | Only FAERS-validated signals |
| `needs_review` | boolean | Only signals needing manual review |
| `limit` | int (default 50) | Max results |
| `skip` | int (default 0) | Pagination offset |

---

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/overview` | Main dashboard stats |
| `GET` | `/api/analytics/trending-drugs` | Top drugs by signal count |
| `GET` | `/api/analytics/sentiment` | Sentiment distribution |
| `GET` | `/api/analytics/risk-distribution` | Risk level breakdown |
| `GET` | `/api/analytics/platform-breakdown` | Posts per platform |
| `GET` | `/api/analytics/drug-symptom-matrix` | Top drug-symptom pairs |

**Overview response:**
```json
{
  "total_posts": 847,
  "total_signals": 124,
  "high_risk_signals": 18,
  "moderate_risk_signals": 43,
  "low_risk_signals": 63,
  "pii_flagged_posts": 23,
  "needs_review": 9,
  "faers_validated": 67,
  "cross_platform_signals": 38,
  "total_projects": 5
}
```

---

### FAERS (FDA Database)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/faers/lookup?drug=Paracetamol` | Top known reactions from FDA |
| `GET` | `/api/faers/validate-signal?drug=X&symptom=Y` | Check if drug+symptom is in FAERS |

---

## The Multi-LLM Pipeline

Every social media post flows through this pipeline:

```
Raw Post Text
     │
     ▼
┌─────────────────────────────────────────────────┐
│           LLM Router (llm_router.py)             │
│                                                  │
│  1. Try Groq (llama-3.3-70b) — fastest, free    │
│  2. If 429/error → try Gemini Flash             │
│  3. If 429/error → try Mistral Small            │
│  4. Log which model was used (full traceability) │
└────────────────────┬────────────────────────────┘
                     │ Structured JSON response
                     ▼
┌─────────────────────────────────────────────────┐
│              Analysis Result                     │
│  {                                               │
│    drugs: ["Dolo-650"],                         │
│    symptoms: ["dizziness", "liver pain"],        │
│    sentiment: "very_negative",                   │
│    sentiment_score: 0.12,                        │
│    is_adverse_event: true,                       │
│    adverse_confidence: 0.91,                     │
│    pii_detected: false,                          │
│    pii_types: [],                                │
│    redacted_text: "...",                         │
│    severity: 4,                                  │
│    language: "english",                          │
│    summary: "Patient reports liver pain..."      │
│  }                                               │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
           Risk Scorer (risk_scorer.py)
           Formula: 0.4·S + 0.3·F + 0.3·V
                     │
                     ▼
         Signal Validator (cross-platform check)
         + FAERS API cross-reference
                     │
                     ▼
            MongoDB signals collection
```

**One LLM call extracts everything:** entities, PII, sentiment, adverse event detection, severity — no local NLP downloads (no torch, no spaCy conflicts).

**Hinglish support built-in:** The LLM natively understands Hindi, English, and Hinglish. Posts like `"Dolo 650 khane ke baad bahut chakkar aa rahe hain"` are correctly processed.

---

## Risk Scoring Formula

```
Risk Score = 0.4 × S  +  0.3 × F  +  0.3 × V
```

| Component | Symbol | Description | Source |
|-----------|--------|-------------|--------|
| Severity | **S** (1–5) | How serious is the adverse event? | LLM output |
| Frequency | **F** (1–5) | How many same drug+symptom reports in last 30 days? | MongoDB count query |
| Velocity | **V** (1–5) | Rate of increase vs 30-day baseline | MongoDB aggregation |

**Risk Levels:**
- `low` → Score ≤ 2.0
- `moderate` → 2.0 < Score ≤ 3.5
- `high` → Score > 3.5

Signals with `confidence < 0.70` are automatically flagged as `needs_review = True` and appear in the review queue.

---

## Agentic Engine Onboarding

The most unique feature of HealthPulse — a judge-facing demo of AI-assisted configuration:

1. **User pastes any URL** into the Engines page input field
2. **Backend fetches the page HTML** using `httpx`
3. **HTML is sent to Groq** with a structured prompt asking for:
   - Best engine type (reddit / twitter / quora / generic)
   - Recommended latency mode (realtime / daily / weekly)
   - Suggested monitoring keywords
   - CSS selectors for post content extraction
   - Confidence score + explanation
4. **Frontend displays the complete config** in a structured result panel
5. **One click deploys** the engine to the project

This replaces the traditional "fill out a complex form" workflow with an AI-first experience.

**Try it live:** Go to `http://localhost:3000/dashboard/engines` → paste any URL → click Analyze.

---

## Dashboard Pages

| Page | Route | Type | Description |
|------|-------|------|-------------|
| Landing | `/` | Server | Editorial landing page with hero, features grid, CTA |
| Overview | `/dashboard` | Server | Morning Brief — stats, ticker, signals table, trending drugs |
| Projects | `/dashboard/projects` | Client | Project CRUD with inline create form |
| Signals | `/dashboard/signals` | Client | Full signal registry with live filters |
| Timeline | `/dashboard/timeline` | Server | Signals grouped by date |
| Engines | `/dashboard/engines` | Client | AI onboarding + active engines |
| Analytics | `/dashboard/analytics` | Server | Risk distribution, trending 30d, platform breakdown |

**Server Components** fetch from backend at request time (`revalidate: 30` in production).  
**Client Components** fetch on mount via `useEffect` — always live, no cache.  
**Mock fallbacks** in `lib/api.ts` ensure the demo works even if the backend is temporarily offline.

---

## Design System

HealthPulse uses a **Newsprint** editorial design theme — inspired by the golden age of print journalism.

**Core Tokens (Tailwind v4 `@theme inline`):**

| Token | Value | Usage |
|-------|-------|-------|
| `bg-paper` | `#F9F9F7` | Page backgrounds |
| `text-ink` | `#111111` | All primary text |
| `bg-red` / `text-red` | `#CC0000` | High risk, CTAs, accents |
| `bg-muted` | `#E5E5E0` | Dividers, bars |

**Typography:**
- `font-display` — Playfair Display (headlines, mastheads)
- `font-body` — Lora (body text, descriptions)
- `font-ui` — Inter (labels, navigation)
- `font-data` — JetBrains Mono (numbers, metrics, stats)

**Key Design Choices:**
- Zero border radius everywhere (`border-radius: 0px !important`)
- Hard offset shadow on hover (`4px 4px 0px 0px #111111`) — no soft shadows
- Collapsed grid borders (newspaper column effect)
- Dot grid body background (subtle newsprint texture)
- Ticker animation (CSS keyframes, pauses on hover)

---

## Demo Flow

For a judge walkthrough, follow this sequence:

### 1. Landing Page (`http://localhost:3000`)
- Show the hero headline and features grid
- Click **"Open Dashboard"**

### 2. Dashboard Overview (`/dashboard`)
- Point to the **Morning Brief** masthead (Playfair Display)
- Show stats: total posts, signals, high risk, projects
- Show the **breaking ticker** scrolling drug names
- Point to the signals table and FAERS match column

### 3. Agentic Engine Onboarding (`/dashboard/engines`) ⭐
- This is the **judge highlight** (15% uniqueness score)
- Paste: `https://www.reddit.com/r/india`
- Click **Analyze**
- Watch Groq return a complete engine configuration in ~2 seconds
- Show the keywords, CSS selectors, confidence, explanation

### 4. Signals Registry (`/dashboard/signals`)
- Filter by `HIGH` risk level
- Toggle **FAERS Match** to show only FDA-validated signals
- Point to the confidence scores and platform badges

### 5. Analytics (`/dashboard/analytics`)
- Show the risk distribution bars (High/Moderate/Low)
- Show the 30-day trending drugs
- Point to the platform breakdown and FAERS match count

### 6. Trigger Live Ingest (Engines page)
- Click **Trigger Ingest** on the Twitter engine
- Watch the post count and signal count update in real-time


## Key Decisions

**Why no local NLP (spaCy/torch)?**  
A single Groq API call replaces 3 GB of local model downloads. Groq's `llama-3.3-70b` extracts drug names, symptoms, PII, sentiment, severity, and adverse event classification simultaneously — in ~200ms with zero dependency conflicts.

**Why mock fallbacks in `lib/api.ts`?**  
The frontend always has data to show. If the backend is restarting or rate-limited, the UI shows realistic mock data instead of blank screens — critical for a live demo.

---

## License

MIT — Built for hackathon purposes.

---

*HealthPulse · Vol. 1.0 · 2026 Edition · Powered by Groq · Gemini · Mistral · FDA FAERS*
