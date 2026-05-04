import { getOverview, getTrendingDrugs, getPlatformBreakdown, getRiskDistribution } from "@/lib/api";

export default async function AnalyticsPage() {
  const [overview, trending, platforms, riskDist] = await Promise.all([
    getOverview(),
    getTrendingDrugs(30),
    getPlatformBreakdown(),
    getRiskDistribution(),
  ]);

  const riskTotal = riskDist.reduce((s, r) => s + r.count, 0) || 1;
  const maxTrend = trending[0]?.count ?? 1;

  return (
    <div className="max-w-7xl">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="pb-4 border-b-4 border-ink mb-0">
        <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tighter text-ink">
          Analytics<br /><span className="italic font-normal">& Insights</span>
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
          Aggregate signal intelligence &nbsp;·&nbsp; last 30 days
        </p>
      </div>

      {/* ── Inverted summary strip ──────────────────────────────────── */}
      <div className="bg-ink text-paper grid grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Signals", value: overview.total_signals },
          { label: "FAERS Validated", value: overview.faers_validated },
          { label: "Cross-Platform", value: overview.cross_platform_signals },
          { label: "Under Review", value: overview.needs_review },
        ].map((s, i) => (
          <div key={s.label} className={`p-6 ${i < 3 ? "border-r border-neutral-700" : ""}`}>
            <p className="font-data text-4xl font-medium text-paper">{s.value}</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Two column: Risk + Platform ─────────────────────────────── */}
      <div className="grid grid-cols-12 border-l border-r border-b border-ink">

        {/* Risk Distribution */}
        <div className="col-span-12 lg:col-span-5 border-r border-ink">
          <div className="px-6 py-3 border-b border-ink">
            <h2 className="font-display font-bold text-xl text-ink">Risk Distribution</h2>
          </div>
          <div className="p-6 space-y-5">
            {[
              { level: "high",     label: "High Risk",     cls: "bg-ink" },
              { level: "moderate", label: "Moderate Risk", cls: "bg-neutral-500" },
              { level: "low",      label: "Low Risk",      cls: "bg-muted" },
            ].map(({ level, label, cls }) => {
              const entry = riskDist.find((r) => r.level === level);
              const count = entry?.count ?? 0;
              const pct = Math.round((count / riskTotal) * 100);
              return (
                <div key={level}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink">{label}</span>
                    <span className="font-data text-sm text-neutral-600">{count} &nbsp;<span className="text-neutral-400 text-[10px]">({pct}%)</span></span>
                  </div>
                  <div className="h-5 bg-muted w-full border border-ink">
                    <div className={`h-full ${cls} transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* PII Stats */}
          <div className="border-t border-ink mx-6 mb-6 pt-4">
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-3">Privacy Signals</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-data text-2xl font-medium text-ink">{overview.pii_flagged_posts}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">PII Detected & Redacted</p>
              </div>
              <div>
                <p className="font-data text-2xl font-medium text-red">{overview.faers_validated}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">FAERS Database Matches</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trending + Platforms */}
        <div className="col-span-12 lg:col-span-7 flex flex-col">

          {/* Trending drugs (30d) */}
          <div className="flex-1 border-b border-ink">
            <div className="px-6 py-3 border-b border-ink">
              <h2 className="font-display font-bold text-xl text-ink">Top Drugs by Signal Volume</h2>
              <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">Last 30 days</p>
            </div>
            <div className="p-6 space-y-4">
              {trending.map((d) => (
                <div key={d.drug}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-ink font-medium">{d.drug}</span>
                    <div className="flex items-center gap-3">
                      {d.faers_matches > 0 && (
                        <span className="font-mono text-[9px] uppercase tracking-widest text-red">FAERS ✓</span>
                      )}
                      <span className="font-data text-xs text-neutral-500">{d.count} signals</span>
                      <span className="font-mono text-[9px] text-neutral-400">avg {d.avg_risk.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-muted">
                    <div
                      className="h-full bg-ink transition-all duration-500"
                      style={{ width: `${Math.round((d.count / maxTrend) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform breakdown */}
          <div>
            <div className="px-6 py-3 border-b border-ink">
              <h2 className="font-display font-bold text-xl text-ink">Source Platforms</h2>
            </div>
            <div className="grid grid-cols-3">
              {platforms.map((p, i) => (
                <div key={p.platform} className={`p-5 ${i < platforms.length - 1 ? "border-r border-ink" : ""}`}>
                  <p className="font-data text-3xl font-medium text-ink">{p.count}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink mt-1">{p.platform}</p>
                  <p className="font-mono text-[9px] text-neutral-400 mt-0.5">{p.pii_flagged} PII flagged</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
