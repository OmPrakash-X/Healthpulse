"use client";

import { useState, useEffect, useCallback } from "react";
import { getSignalsFiltered } from "@/lib/api";
import type { SignalItem } from "@/lib/api";

const RISK_LEVELS = ["all", "high", "moderate", "low"] as const;
type RiskFilter = typeof RISK_LEVELS[number];

const PLATFORM_LABELS: Record<string, string> = {
  twitter: "Twitter",
  quora:   "Quora",
  reddit:  "Reddit",
  generic: "Web",
  unknown: "Unknown",
};

function RiskBadge({ level }: { level: SignalItem["risk_level"] }) {
  const cls = { high: "risk-high", moderate: "risk-moderate", low: "risk-low" }[level];
  return (
    <span className={`${cls} px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest`}>
      {level}
    </span>
  );
}

export default function SignalsPage() {
  const [signals, setSignals] = useState<SignalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [drug, setDrug] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [faersOnly, setFaersOnly] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);

  const fetchSignals = useCallback(async () => {
    setLoading(true);
    const result = await getSignalsFiltered({
      drug: drug || undefined,
      risk_level: riskFilter === "all" ? undefined : riskFilter,
      faers_match: faersOnly || undefined,
      needs_review: reviewOnly || undefined,
      limit: 50,
    });
    setSignals(result.signals);
    setTotal(result.total);
    setLoading(false);
  }, [drug, riskFilter, faersOnly, reviewOnly]);

  useEffect(() => {
    const t = setTimeout(fetchSignals, 300); // debounce drug input
    return () => clearTimeout(t);
  }, [fetchSignals]);

  return (
    <div className="max-w-7xl">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="pb-4 border-b-4 border-ink mb-0">
        <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tighter text-ink">
          Signal<br /><span className="italic font-normal">Registry</span>
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
          {total} signals detected &nbsp;·&nbsp; cross-validated against FDA FAERS
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="border-b border-ink flex flex-wrap items-center gap-0">
        {/* Drug search */}
        <div className="flex items-center border-r border-ink px-4 py-3 gap-2 flex-1 min-w-[200px]">
          <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 shrink-0">Drug</span>
          <input
            type="text"
            value={drug}
            onChange={(e) => setDrug(e.target.value)}
            placeholder="e.g. Paracetamol"
            className="flex-1 bg-transparent font-mono text-xs text-ink placeholder:text-neutral-400 focus:outline-none border-b border-muted focus:border-ink pb-0.5 transition-colors"
          />
        </div>

        {/* Risk level pills */}
        <div className="flex items-center border-r border-ink px-4 py-3 gap-1">
          <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mr-2 shrink-0">Risk</span>
          {RISK_LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={[
                "px-2.5 py-1 font-mono text-[9px] uppercase tracking-widest border transition-colors duration-150",
                riskFilter === lvl
                  ? "bg-ink text-paper border-ink"
                  : "bg-paper text-neutral-500 border-muted hover:border-ink hover:text-ink",
              ].join(" ")}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* FAERS toggle */}
        <button
          onClick={() => setFaersOnly((v) => !v)}
          className={[
            "px-4 py-3 border-r border-ink font-mono text-[9px] uppercase tracking-widest transition-colors duration-150",
            faersOnly ? "bg-ink text-paper" : "text-neutral-500 hover:text-ink hover:bg-neutral-100",
          ].join(" ")}
        >
          {faersOnly ? "✓ " : ""}FAERS Match
        </button>

        {/* Needs review toggle */}
        <button
          onClick={() => setReviewOnly((v) => !v)}
          className={[
            "px-4 py-3 font-mono text-[9px] uppercase tracking-widest transition-colors duration-150",
            reviewOnly ? "bg-red text-paper" : "text-neutral-500 hover:text-ink hover:bg-neutral-100",
          ].join(" ")}
        >
          {reviewOnly ? "✓ " : ""}Needs Review
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────────────────── */}
      <div className="border-b border-l border-r border-ink overflow-x-auto">
        {loading ? (
          <div className="py-16 text-center">
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 animate-pulse">
              Scanning signals…
            </p>
          </div>
        ) : signals.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-2xl text-neutral-400 italic">No signals found</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mt-2">
              Adjust filters or trigger an engine ingest
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink bg-ink text-paper">
                {["Drug", "Symptom", "Risk", "Score", "Confidence", "Platforms", "FAERS", "Detected"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left font-mono text-[9px] uppercase tracking-widest font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {signals.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-muted transition-colors hover:bg-neutral-100 ${i % 2 === 1 ? "bg-neutral-100/30" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-xs font-medium text-ink uppercase tracking-wide">
                    {s.drug}
                  </td>
                  <td className="px-4 py-3 font-body text-sm text-neutral-700">
                    {s.symptom}
                  </td>
                  <td className="px-4 py-3">
                    <RiskBadge level={s.risk_level} />
                  </td>
                  <td className="px-4 py-3 font-data text-xs text-neutral-600">
                    {s.risk_score.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 font-data text-xs text-neutral-600">
                    {Math.round(s.confidence * 100)}%
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {s.platforms.map((p) => (
                        <span key={p} className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-muted text-neutral-500">
                          {PLATFORM_LABELS[p.toLowerCase()] ?? p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {s.faers_match
                      ? <span className="font-mono text-[9px] uppercase tracking-widest text-red font-bold">✓ Match</span>
                      : <span className="font-mono text-[9px] text-neutral-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-data text-[10px] text-neutral-400">
                    {new Date(s.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 mt-3">
        Showing {signals.length} of {total} signals &nbsp;·&nbsp; Auto-refreshes every 30s
      </p>
    </div>
  );
}
