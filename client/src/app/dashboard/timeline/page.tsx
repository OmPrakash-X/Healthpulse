import { getRecentSignals } from "@/lib/api";

export default async function TimelinePage() {
  const { signals, total } = await getRecentSignals(50);

  // Group signals by date
  const grouped = signals.reduce<Record<string, typeof signals>>((acc, s) => {
    const day = new Date(s.created_at).toLocaleDateString("en-IN", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {});

  const riskColor: Record<string, string> = {
    high:     "bg-ink text-paper",
    moderate: "border border-ink text-ink bg-paper",
    low:      "bg-muted text-neutral-600",
  };

  return (
    <div className="max-w-7xl">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="pb-4 border-b-4 border-ink mb-0">
        <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tighter text-ink">
          Signal<br /><span className="italic font-normal">Timeline</span>
        </h1>
        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
          {total} signals chronologically &nbsp;·&nbsp; most recent first
        </p>
      </div>

      {/* ── Timeline ────────────────────────────────────────────── */}
      {Object.entries(grouped).length === 0 ? (
        <div className="py-24 text-center border border-ink mt-0">
          <p className="font-display text-3xl text-neutral-400 italic">No signals yet</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mt-2">
            Trigger an engine ingest to begin monitoring
          </p>
        </div>
      ) : (
        <div>
          {Object.entries(grouped).map(([date, daySignals]) => (
            <div key={date} className="border-b border-ink">

              {/* Date header */}
              <div className="grid grid-cols-12 border-b border-muted">
                <div className="col-span-12 lg:col-span-3 px-6 py-3 border-r border-muted bg-neutral-100">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
                    {date}
                  </p>
                  <p className="font-data text-2xl font-medium text-ink mt-0.5">
                    {daySignals.length}
                    <span className="font-mono text-[10px] font-normal text-neutral-400 ml-1">signals</span>
                  </p>
                </div>
                <div className="col-span-12 lg:col-span-9 px-6 py-3 flex items-center gap-3 flex-wrap">
                  {["high", "moderate", "low"].map((lvl) => {
                    const count = daySignals.filter((s) => s.risk_level === lvl).length;
                    if (count === 0) return null;
                    return (
                      <span key={lvl} className={`${riskColor[lvl]} font-mono text-[9px] uppercase tracking-widest px-2 py-0.5`}>
                        {count} {lvl}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Signals for this day */}
              {daySignals.map((signal, i) => (
                <div
                  key={signal.id}
                  className={`grid grid-cols-12 border-b border-muted last:border-b-0 hover:bg-neutral-100 transition-colors ${i % 2 === 1 ? "bg-neutral-100/30" : ""}`}
                >
                  {/* Time column */}
                  <div className="col-span-12 lg:col-span-3 px-6 py-4 border-r border-muted flex lg:flex-col gap-2 lg:gap-0">
                    <p className="font-data text-[11px] text-neutral-400">
                      {new Date(signal.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <div className="flex gap-1 flex-wrap mt-1">
                      {signal.platforms.map((p) => (
                        <span key={p} className="font-mono text-[9px] uppercase tracking-widest px-1.5 py-0.5 border border-muted text-neutral-400">
                          {({twitter:"Twitter",quora:"Quora",reddit:"Reddit",generic:"Web"}[p.toLowerCase()] ?? p)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Signal content */}
                  <div className="col-span-12 lg:col-span-9 px-6 py-4 flex items-start gap-4">
                    <span className={`${riskColor[signal.risk_level]} font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 shrink-0 mt-0.5`}>
                      {signal.risk_level}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold uppercase tracking-wide text-ink">
                        {signal.drug}
                        <span className="text-neutral-400 font-normal normal-case tracking-normal mx-1">→</span>
                        <span className="font-body font-normal normal-case tracking-normal text-neutral-700">{signal.symptom}</span>
                      </p>
                      <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                        <span className="font-data text-[10px] text-neutral-500">
                          Risk score: <strong className="text-ink">{signal.risk_score.toFixed(1)}</strong>
                        </span>
                        <span className="font-data text-[10px] text-neutral-500">
                          Confidence: <strong className="text-ink">{Math.round(signal.confidence * 100)}%</strong>
                        </span>
                        {signal.faers_match && (
                          <span className="font-mono text-[9px] uppercase tracking-widest text-red font-bold">
                            ✓ FAERS Match
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
