import { getOverview, getTrendingDrugs, getRecentSignals, getPlatformBreakdown } from "@/lib/api";
import type { SignalItem } from "@/lib/api";

// ── Sub-components (defined here, used once — no separate files needed) ────

function RiskBadge({ level }: { level: SignalItem["risk_level"] }) {
  const cls = {
    high: "risk-high",
    moderate: "risk-moderate",
    low: "risk-low",
  }[level];
  return (
    <span className={`${cls} px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest`}>
      {level}
    </span>
  );
}

function StatCell({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className="p-6 newsprint-texture">
      <p className={`font-data text-5xl font-medium leading-none tabular-nums ${accent ? "text-red" : "text-ink"}`}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
        {label}
      </p>
      {sub && (
        <p className="font-mono text-[10px] text-neutral-400 mt-1">{sub}</p>
      )}
    </div>
  );
}

function DrugBar({ drug, count, max }: { drug: string; count: number; max: number }) {
  const pct = Math.round((count / max) * 100);
  return (
    <div className="py-3 border-b border-muted last:border-b-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-ink">{drug}</span>
        <span className="font-data text-[11px] text-neutral-500">{count}</span>
      </div>
      <div className="h-1.5 bg-muted w-full">
        <div className="h-full bg-ink transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const [overview, trending, { signals }, platforms] = await Promise.all([
    getOverview(),
    getTrendingDrugs(),
    getRecentSignals(),
    getPlatformBreakdown(),
  ]);

  const maxDrugCount = trending[0]?.count ?? 1;
  const tickerDrugs = [...trending, ...trending].map((d) => d.drug); // doubled for seamless loop

  const totalPlatformPosts = platforms.reduce((s, p) => s + p.count, 0);

  return (
    <div className="max-w-7xl">

      {/* ── Masthead ──────────────────────────────────────────────── */}
      <div className="mb-0 pb-4 border-b-4 border-ink">
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">
          Vol. 1 &nbsp;·&nbsp; {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} &nbsp;·&nbsp; India Edition
        </p>
        <h1 className="font-display font-black text-5xl lg:text-6xl leading-[0.95] tracking-tighter text-ink">
          Signal Intelligence<br />
          <span className="italic font-normal">Morning Brief</span>
        </h1>
        <p className="font-body text-sm text-neutral-600 mt-2 max-w-xl">
          Real-time adverse drug event signals extracted from social media and cross-validated against FDA FAERS.
        </p>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 grid-newspaper">
        <StatCell label="Total Posts Ingested" value={overview.total_posts} sub="across all platforms" />
        <StatCell label="Active Signals" value={overview.total_signals} sub={`${overview.faers_validated} FAERS validated`} />
        <StatCell label="High Risk Alerts" value={overview.high_risk_signals} accent sub="require immediate review" />
        <StatCell label="Projects" value={overview.total_projects} sub={`${overview.needs_review} signals need review`} />
      </div>

      {/* ── Breaking Ticker ────────────────────────────────────────── */}
      <div className="flex items-center overflow-hidden border-b border-ink bg-ink text-paper">
        <div className="shrink-0 px-3 py-2 border-r border-neutral-600 flex items-center gap-2">
          <span className="w-2 h-2 bg-red" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-paper">Trending</span>
        </div>
        <div className="overflow-hidden flex-1 py-2">
          <div className="ticker-track">
            {[...tickerDrugs, ...tickerDrugs].map((drug, i) => (
              <span key={i} className="font-mono text-[11px] uppercase tracking-widest text-paper mx-6">
                {drug} <span className="text-neutral-400 mx-2">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content: 8/4 Split ───────────────────────────────── */}
      <div className="grid grid-cols-12 border-l border-b border-ink">

        {/* Left — Signals Table (8 cols) */}
        <div className="col-span-12 lg:col-span-8 border-r border-ink">
          <div className="px-6 py-3 border-b border-ink flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-ink">Latest Signals</h2>
            <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
              {overview.total_signals} total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-muted">
                  {["Drug", "Symptom", "Risk", "Confidence", "Platforms", "FAERS"].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-mono text-[9px] uppercase tracking-widest text-neutral-500 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signals.map((s, i) => (
                  <tr
                    key={s.id}
                    className={`border-b border-muted transition-colors duration-150 hover:bg-neutral-100 ${i % 2 === 0 ? "" : "bg-neutral-100/40"}`}
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
                      {Math.round(s.confidence * 100)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {s.platforms.map((p) => (
                          <span key={p} className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-muted text-neutral-500">
                            {({twitter:"Twitter",quora:"Quora",reddit:"Reddit",generic:"Web"}[p.toLowerCase()] ?? p)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {s.faers_match ? (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-red font-bold">✓ Match</span>
                      ) : (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right — Trending + Platforms (4 cols) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col">

          {/* Trending Drugs */}
          <div className="border-b border-ink flex-1">
            <div className="px-5 py-3 border-b border-ink">
              <h2 className="font-display font-bold text-lg text-ink">Trending Drugs</h2>
              <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">Last 7 days</p>
            </div>
            <div className="px-5 py-4">
              {trending.map((d) => (
                <DrugBar key={d.drug} drug={d.drug} count={d.count} max={maxDrugCount} />
              ))}
            </div>
          </div>

          {/* Platform Breakdown */}
          <div>
            <div className="px-5 py-3 border-b border-ink">
              <h2 className="font-display font-bold text-lg text-ink">Platform Breakdown</h2>
            </div>
            <div className="px-5 py-4 flex flex-col gap-3">
              {platforms.map((p) => {
                const pct = Math.round((p.count / totalPlatformPosts) * 100);
                return (
                  <div key={p.platform} className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink w-16 shrink-0">
                      {p.platform}
                    </span>
                    <div className="flex-1 h-1.5 bg-muted">
                      <div className="h-full bg-ink" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="font-data text-[11px] text-neutral-500 w-8 text-right shrink-0">
                      {p.count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* PII + FAERS footer stats */}
            <div className="grid grid-cols-2 border-t border-muted mx-5 mb-4">
              <div className="py-3 border-r border-muted pr-4">
                <p className="font-data text-xl font-medium text-ink">{overview.pii_flagged_posts}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">PII Flagged</p>
              </div>
              <div className="py-3 pl-4">
                <p className="font-data text-xl font-medium text-red">{overview.faers_validated}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">FAERS Match</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
