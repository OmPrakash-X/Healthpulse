"use client";

import { useState, useEffect } from "react";
import { getEngines, getProjects, suggestEngineConfig, triggerEngine, createEngine } from "@/lib/api";
import type { Engine, SuggestConfigResult, Project } from "@/lib/api";
import { Cpu, Zap, Globe, AlertCircle, CheckCircle } from "lucide-react";

const ENGINE_ICONS: Record<string, string> = {
  twitter: "𝕏",
  reddit: "r/",
  quora: "Q",
  generic: "∞",
};

// ── Engine Card ─────────────────────────────────────────────────────────────

function EngineCard({ engine, onTrigger }: { engine: Engine; onTrigger: (id: string) => Promise<{ posts_fetched: number; signals_created: number }> }) {
  const [triggering, setTriggering] = useState(false);
  const [result, setResult] = useState<{ posts_fetched: number; signals_created: number } | null>(null);

  async function handleTrigger() {
    setTriggering(true);
    setResult(null);
    try {
      const r = await onTrigger(engine.id);
      setResult(r ?? null);
    } finally {
      setTriggering(false);
    }
  }

  const lastRun = engine.last_run
    ? new Date(engine.last_run).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : "Never";

  return (
    <div className="border border-ink p-5 hard-shadow-hover newsprint-texture">
      {/* Engine type symbol */}
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 border border-ink flex items-center justify-center font-display font-black text-lg text-ink">
          {ENGINE_ICONS[engine.engine_type] ?? "∞"}
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 ${engine.is_active ? "bg-ink text-paper" : "border border-muted text-neutral-400"}`}>
          {engine.is_active ? "Active" : "Paused"}
        </span>
      </div>

      <p className="font-mono text-xs uppercase tracking-widest font-bold text-ink mt-2">
        {engine.engine_type}
      </p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">
        {engine.latency_mode} &nbsp;·&nbsp; Last: {lastRun}
      </p>

      {/* Trigger result */}
      {result && (
        <div className="mt-3 border-t border-muted pt-2">
          <p className="font-mono text-[10px] text-ink">
            <span className="text-red">↑</span> {result.posts_fetched} posts &nbsp;·&nbsp; {result.signals_created} signals
          </p>
        </div>
      )}

      <button
        onClick={handleTrigger}
        disabled={triggering}
        className="mt-4 w-full py-2 border border-ink font-mono text-[10px] uppercase tracking-widest transition-colors hover:bg-ink hover:text-paper disabled:opacity-40 flex items-center justify-center gap-2"
      >
        <Zap className="w-3 h-3" strokeWidth={1.5} />
        {triggering ? "Fetching…" : "Trigger Ingest"}
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function EnginesPage() {
  const [engines, setEngines] = useState<Engine[]>([]);
  const [loadingEngines, setLoadingEngines] = useState(true);

  // Agentic suggest-config state
  const [url, setUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestConfigResult | null>(null);
  const [suggestError, setSuggestError] = useState("");

  // Deploy form state
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployProjectId, setDeployProjectId] = useState("");
  const [deploying, setDeploying] = useState(false);
  const [deploySuccess, setDeploySuccess] = useState("");

  useEffect(() => {
    getEngines().then((data) => {
      setEngines(data);
      setLoadingEngines(false);
    });
    getProjects().then((data) => {
      setProjects(data);
      if (data[0]) setDeployProjectId(data[0].id);
    });
  }, []);

  async function handleAnalyze() {
    if (!url.trim()) return;
    setAnalyzing(true);
    setSuggestion(null);
    setSuggestError("");
    try {
      const result = await suggestEngineConfig(url.trim());
      setSuggestion(result);
    } catch (err) {
      setSuggestError(err instanceof Error ? err.message : "Analysis failed. Check that the backend is running.");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleTrigger(id: string) {
    return triggerEngine(id);
  }

  return (
    <div className="max-w-7xl">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="pb-4 border-b-4 border-ink mb-0">
        <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tighter text-ink">
          Intelligence<br /><span className="italic font-normal">Engines</span>
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
          Data acquisition plugins &nbsp;·&nbsp; {engines.length} active sources
        </p>
      </div>

      {/* ── ⭐ Agentic Onboarding Section ──────────────────────────── */}
      <div className="bg-ink text-paper newsprint-texture mt-0 border-b-4 border-red">
        <div className="px-8 py-6">
          {/* Label */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-red flex items-center justify-center shrink-0">
              <Cpu className="w-3.5 h-3.5 text-paper" strokeWidth={2} />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
              AI Engine Onboarding &nbsp;·&nbsp; Groq → Gemini → Mistral
            </p>
          </div>

          <h2 className="font-display font-black text-3xl text-paper leading-tight mb-2">
            Drop any URL.<br />
            <span className="italic font-normal text-neutral-400">Get an engine config in seconds.</span>
          </h2>
          <p className="font-body text-sm text-neutral-400 mb-6 max-w-xl">
            Paste any health forum, subreddit, or social platform URL. The AI fetches the page, analyzes its structure,
            and returns a ready-to-deploy engine configuration.
          </p>

          {/* URL Input */}
          <div className="flex gap-0 border border-neutral-600">
            <div className="flex items-center px-3 border-r border-neutral-600">
              <Globe className="w-4 h-4 text-neutral-400" strokeWidth={1.5} />
            </div>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="https://www.reddit.com/r/india  or  https://www.quora.com/topic/Drug-Side-Effects"
              className="flex-1 bg-transparent px-4 py-3 font-mono text-sm text-paper placeholder:text-neutral-600 focus:outline-none"
            />
            <button
              onClick={handleAnalyze}
              disabled={analyzing || !url.trim()}
              className="px-6 py-3 bg-red text-paper font-mono text-[11px] uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0 flex items-center gap-2"
            >
              <Zap className="w-3.5 h-3.5" strokeWidth={2} />
              {analyzing ? "Analyzing…" : "Analyze"}
            </button>
          </div>

          {/* Loading state */}
          {analyzing && (
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mt-4 animate-pulse">
              Fetching page · Sending to Groq LLM · Generating config…
            </p>
          )}

          {/* Error */}
          {suggestError && (
            <div className="mt-4 flex items-start gap-2 border border-red/50 px-4 py-3">
              <AlertCircle className="w-4 h-4 text-red mt-0.5 shrink-0" strokeWidth={1.5} />
              <p className="font-mono text-xs text-neutral-400">{suggestError}</p>
            </div>
          )}

          {/* ── AI Suggestion Result ─────────────────────────────── */}
          {suggestion && (
            <div className="mt-6 border border-neutral-600 bg-[#0a0a0a]">
              {/* Result header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-700">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-red" strokeWidth={1.5} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                    AI Configuration Generated &nbsp;·&nbsp; {suggestion.model_used}
                  </span>
                </div>
                <span className="font-data text-[11px] text-red font-bold">
                  {Math.round(suggestion.confidence * 100)}% confidence
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-neutral-700">
                {/* Left: config fields */}
                <div className="p-5 space-y-4">
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Engine Type</p>
                    <p className="font-mono text-sm text-paper font-bold uppercase">{suggestion.engine_type}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Latency Mode</p>
                    <p className="font-mono text-sm text-paper uppercase">{suggestion.latency_mode}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-1">Suggested Keywords</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {suggestion.suggested_keywords.map((kw) => (
                        <span key={kw} className="font-mono text-[10px] px-2 py-0.5 border border-neutral-700 text-neutral-300">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-1">AI Explanation</p>
                    <p className="font-body text-sm text-neutral-400 italic leading-relaxed">{suggestion.explanation}</p>
                  </div>
                </div>

                {/* Right: CSS selectors */}
                <div className="p-5">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-3">CSS Selectors</p>
                  <div className="space-y-2">
                    {Object.entries(suggestion.css_selectors).map(([key, val]) => (
                      <div key={key} className="font-mono text-[10px]">
                        <span className="text-neutral-500">{key}: </span>
                        <span className="text-paper break-all">{val || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Deploy form */}
              <div className="border-t border-neutral-700 px-5 py-4 space-y-3">
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">Deploy to Project</p>

                {/* Project selector */}
                <select
                  value={deployProjectId}
                  onChange={(e) => setDeployProjectId(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-600 px-3 py-2 font-mono text-xs text-paper focus:outline-none focus:border-neutral-400"
                >
                  {projects.length === 0 && (
                    <option value="">No projects — create one first</option>
                  )}
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-3">
                  <button
                    onClick={async () => {
                      if (!deployProjectId) return;
                      setDeploying(true);
                      setDeploySuccess("");
                      try {
                        const engine = await createEngine({
                          project_id: deployProjectId,
                          engine_type: suggestion.engine_type as Engine["engine_type"],
                          latency_mode: suggestion.latency_mode as Engine["latency_mode"],
                          config: {
                            keywords: suggestion.suggested_keywords,
                            css_selectors: suggestion.css_selectors,
                            url_analyzed: suggestion.url_analyzed,
                          },
                          is_active: true,
                        });
                        setEngines((prev) => [...prev, engine]);
                        setDeploySuccess(`Engine deployed!`);
                        setSuggestion(null);
                        setUrl("");
                      } catch (err) {
                        setDeploySuccess(err instanceof Error ? err.message : "Deploy failed");
                      } finally {
                        setDeploying(false);
                      }
                    }}
                    disabled={deploying || !deployProjectId}
                    className="px-6 py-2.5 bg-paper text-ink font-mono text-[11px] uppercase tracking-widest hover:bg-neutral-200 disabled:opacity-40 transition-colors flex items-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" strokeWidth={2} />
                    {deploying ? "Deploying…" : "Deploy Engine"}
                  </button>
                  {deploySuccess && (
                    <span className="font-mono text-[10px] text-red">{deploySuccess}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Active Engines ─────────────────────────────────────────── */}
      <div className="border-b border-l border-r border-ink">
        <div className="px-6 py-3 border-b border-ink flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-ink">Active Engines</h2>
          <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {engines.length} configured
          </span>
        </div>

        {loadingEngines ? (
          <div className="py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 animate-pulse">
              Loading engines…
            </p>
          </div>
        ) : engines.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-2xl text-neutral-400 italic">No engines configured</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mt-2">
              Use the AI onboarding above to create your first engine
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 grid-newspaper p-0">
            {engines.map((engine) => (
              <div key={engine.id} className="p-5">
                <EngineCard engine={engine} onTrigger={handleTrigger} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
