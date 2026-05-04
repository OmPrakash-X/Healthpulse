import DashboardSidebar from "@/components/layout/DashboardSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Fixed sidebar — 220px wide */}
      <DashboardSidebar />

      {/* Main content area — offset by sidebar width */}
      <div className="ml-[220px] flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-ink bg-paper px-8 py-[24.5px] flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            HealthPulse &mdash; Real-Time Patient Signal Intelligence
          </p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
