"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderOpen,
  AlertTriangle,
  TrendingUp,
  Cpu,
  BarChart2,
  Activity,
} from "lucide-react";

const NAV_ITEMS = [
  { label: "Overview",  href: "/dashboard",           icon: LayoutDashboard },
  { label: "Projects",  href: "/dashboard/projects",  icon: FolderOpen },
  { label: "Signals",   href: "/dashboard/signals",   icon: AlertTriangle },
  { label: "Timeline",  href: "/dashboard/timeline",  icon: TrendingUp },
  { label: "Engines",   href: "/dashboard/engines",   icon: Cpu },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
] as const;

export default function DashboardSidebar() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-[220px] flex flex-col border-r border-ink bg-paper z-40">
      {/* ── Logo / Masthead ───────────────────────────────── */}
      <div className="border-b border-ink px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-ink flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-paper" strokeWidth={1.5} />
          </div>
          <div>
            <p className="font-display font-black text-[15px] leading-none tracking-tight text-ink">
              HealthPulse
            </p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-0.5">
              Signal Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* ── Section Label ─────────────────────────────────── */}
      <div className="px-5 pt-4 pb-1">
        <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">
          Navigation
        </p>
      </div>

      {/* ── Nav Items ─────────────────────────────────────── */}
      <nav className="flex-1 px-3 pb-4 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 px-3 py-2.5 transition-colors duration-150 border",
                active
                  ? "bg-ink text-paper border-ink"
                  : "text-ink hover:bg-neutral-100 hover:border-muted border-transparent",
              ].join(" ")}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${active ? "text-paper" : "text-neutral-600"}`}
                strokeWidth={1.5}
              />
              <span className="font-mono text-[11px] uppercase tracking-widest font-medium">
                {label}
              </span>
              {active && (
                <span className="ml-auto w-1.5 h-1.5 bg-red shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Footer / Edition ──────────────────────────────── */}
      <div className="border-t border-ink px-5 py-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">
          Vol. 1 &nbsp;·&nbsp; {new Date().getFullYear()} Edition
        </p>
        <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 mt-0.5">
          Powered by Groq · FAERS
        </p>
      </div>
    </aside>
  );
}
