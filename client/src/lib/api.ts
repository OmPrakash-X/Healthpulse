const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// ── Types ──────────────────────────────────────────────────────────────────

export interface Overview {
  total_posts: number;
  total_signals: number;
  high_risk_signals: number;
  moderate_risk_signals: number;
  low_risk_signals: number;
  pii_flagged_posts: number;
  needs_review: number;
  faers_validated: number;
  cross_platform_signals: number;
  total_projects: number;
}

export interface TrendingDrug {
  drug: string;
  count: number;
  avg_risk: number;
  max_risk: number;
  faers_matches: number;
}

export interface SignalItem {
  id: string;
  drug: string;
  symptom: string;
  risk_level: "high" | "moderate" | "low";
  risk_score: number;
  confidence: number;
  platforms: string[];
  faers_match: boolean;
  created_at: string;
}

export interface PlatformStat {
  platform: string;
  count: number;
  pii_flagged: number;
}

// ── Mock fallback data (shown when backend is offline) ────────────────────

const MOCK_OVERVIEW: Overview = {
  total_posts: 847,
  total_signals: 124,
  high_risk_signals: 18,
  moderate_risk_signals: 43,
  low_risk_signals: 63,
  pii_flagged_posts: 23,
  needs_review: 9,
  faers_validated: 67,
  cross_platform_signals: 38,
  total_projects: 5,
};

const MOCK_TRENDING: TrendingDrug[] = [
  { drug: "Paracetamol", count: 34, avg_risk: 2.8, max_risk: 4.2, faers_matches: 12 },
  { drug: "Dolo-650", count: 29, avg_risk: 3.1, max_risk: 4.8, faers_matches: 9 },
  { drug: "Azithromycin", count: 24, avg_risk: 2.4, max_risk: 3.7, faers_matches: 7 },
  { drug: "Metformin", count: 18, avg_risk: 2.0, max_risk: 3.2, faers_matches: 5 },
  { drug: "Pantoprazole", count: 14, avg_risk: 1.8, max_risk: 2.9, faers_matches: 3 },
];

const MOCK_SIGNALS: SignalItem[] = [
  { id: "1", drug: "Dolo-650", symptom: "Liver damage", risk_level: "high", risk_score: 4.2, confidence: 0.91, platforms: ["twitter", "quora"], faers_match: true, created_at: new Date().toISOString() },
  { id: "2", drug: "Paracetamol", symptom: "Nausea", risk_level: "moderate", risk_score: 3.1, confidence: 0.78, platforms: ["quora"], faers_match: true, created_at: new Date().toISOString() },
  { id: "3", drug: "Azithromycin", symptom: "Stomach pain", risk_level: "moderate", risk_score: 2.9, confidence: 0.82, platforms: ["twitter"], faers_match: false, created_at: new Date().toISOString() },
  { id: "4", drug: "Metformin", symptom: "Headache", risk_level: "low", risk_score: 2.1, confidence: 0.71, platforms: ["quora"], faers_match: false, created_at: new Date().toISOString() },
  { id: "5", drug: "Dolo-650", symptom: "Dizziness", risk_level: "high", risk_score: 3.8, confidence: 0.88, platforms: ["twitter", "quora"], faers_match: true, created_at: new Date().toISOString() },
  { id: "6", drug: "Pantoprazole", symptom: "Joint pain", risk_level: "moderate", risk_score: 2.7, confidence: 0.74, platforms: ["quora"], faers_match: false, created_at: new Date().toISOString() },
  { id: "7", drug: "Cetirizine", symptom: "Drowsiness", risk_level: "low", risk_score: 1.9, confidence: 0.65, platforms: ["twitter"], faers_match: false, created_at: new Date().toISOString() },
  { id: "8", drug: "Amoxicillin", symptom: "Rash", risk_level: "high", risk_score: 4.0, confidence: 0.93, platforms: ["twitter", "quora"], faers_match: true, created_at: new Date().toISOString() },
];

const MOCK_PLATFORMS: PlatformStat[] = [
  { platform: "twitter", count: 423, pii_flagged: 11 },
  { platform: "quora", count: 289, pii_flagged: 8 },
  { platform: "reddit", count: 135, pii_flagged: 4 },
];

// ── Fetchers ──────────────────────────────────────────────────────────────

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 30 } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export const getOverview = () => get<Overview>("/api/analytics/overview", MOCK_OVERVIEW);

export const getTrendingDrugs = (days = 7) =>
  get<TrendingDrug[]>(`/api/analytics/trending-drugs?days=${days}&limit=5`, MOCK_TRENDING);

export const getRecentSignals = (limit = 8) =>
  get<{ signals: SignalItem[]; total: number }>(
    `/api/signals?limit=${limit}`,
    { signals: MOCK_SIGNALS, total: MOCK_SIGNALS.length }
  );

export const getPlatformBreakdown = () =>
  get<PlatformStat[]>("/api/analytics/platform-breakdown", MOCK_PLATFORMS);

// ── Engine types + functions ──────────────────────────────────────────────

export interface Engine {
  id: string;
  project_id: string;
  engine_type: "reddit" | "twitter" | "quora" | "generic";
  latency_mode: "realtime" | "daily" | "weekly";
  config: Record<string, unknown>;
  is_active: boolean;
  last_run: string | null;
  created_at: string;
}

export interface SuggestConfigResult {
  engine_type: string;
  latency_mode: string;
  suggested_keywords: string[];
  css_selectors: Record<string, string>;
  confidence: number;
  explanation: string;
  model_used: string;
  url_analyzed: string;
}

const MOCK_ENGINES: Engine[] = [
  { id: "e1", project_id: "p1", engine_type: "twitter", latency_mode: "realtime", config: {}, is_active: true, last_run: new Date(Date.now() - 5 * 60000).toISOString(), created_at: new Date().toISOString() },
  { id: "e2", project_id: "p1", engine_type: "quora",   latency_mode: "daily",    config: {}, is_active: true, last_run: new Date(Date.now() - 2 * 3600000).toISOString(), created_at: new Date().toISOString() },
];

export const getEngines = (projectId?: string) =>
  get<Engine[]>(
    projectId ? `/api/engines?project_id=${projectId}` : "/api/engines",
    MOCK_ENGINES
  );

// Client-side POST helpers (no `next` cache option — browser fetch only)
export async function suggestEngineConfig(url: string): Promise<SuggestConfigResult> {
  const res = await fetch(`${BASE}/api/engines/suggest-config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createEngine(data: Omit<Engine, "id" | "created_at" | "last_run">): Promise<Engine> {
  const res = await fetch(`${BASE}/api/engines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function triggerEngine(engineId: string): Promise<{ posts_fetched: number; signals_created: number }> {
  const res = await fetch(`${BASE}/api/engines/${engineId}/trigger`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Signals with filters (client-side — no revalidate)
export async function getSignalsFiltered(params: {
  drug?: string;
  risk_level?: string;
  faers_match?: boolean;
  needs_review?: boolean;
  limit?: number;
}): Promise<{ signals: SignalItem[]; total: number }> {
  try {
    const q = new URLSearchParams();
    if (params.drug)       q.set("drug", params.drug);
    if (params.risk_level) q.set("risk_level", params.risk_level);
    if (params.faers_match !== undefined) q.set("faers_match", String(params.faers_match));
    if (params.needs_review !== undefined) q.set("needs_review", String(params.needs_review));
    q.set("limit", String(params.limit ?? 50));
    const res = await fetch(`${BASE}/api/signals?${q.toString()}`);
    if (!res.ok) return { signals: MOCK_SIGNALS, total: MOCK_SIGNALS.length };
    return res.json();
  } catch {
    return { signals: MOCK_SIGNALS, total: MOCK_SIGNALS.length };
  }
}

// ── Project types + functions ──────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  is_active: boolean;
  signal_count: number;
  post_count: number;
  high_risk_count: number;
  created_at: string;
}

const MOCK_PROJECTS: Project[] = [
  { id: "p1", name: "OTC Drug Watch India", description: "Monitor OTC drug adverse events across social media", keywords: ["paracetamol", "dolo-650", "crocin", "ibuprofen"], is_active: true, signal_count: 89, post_count: 543, high_risk_count: 12, created_at: new Date(Date.now() - 7 * 86400000).toISOString() },
  { id: "p2", name: "Antibiotic Resistance Signals", description: "Track self-medication with antibiotics", keywords: ["azithromycin", "amoxicillin", "ciprofloxacin"], is_active: true, signal_count: 35, post_count: 218, high_risk_count: 6, created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
];

export const getProjects = () =>
  get<Project[]>("/api/projects", MOCK_PROJECTS);

export async function createProject(data: {
  name: string;
  description: string;
  keywords: string[];
}): Promise<Project> {
  const res = await fetch(`${BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...data, is_active: true }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// Analytics extras
export interface RiskDistribution {
  level: string;
  count: number;
}

export const getRiskDistribution = () =>
  get<RiskDistribution[]>("/api/analytics/risk-distribution", [
    { level: "high", count: 18 },
    { level: "moderate", count: 43 },
    { level: "low", count: 63 },
  ]);
