"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef, useEffect } from "react";
import Lenis from "lenis";
import {
  ArrowRight, Activity, Shield, Zap, Globe,
  Database, Brain, Lock, Radio,
} from "lucide-react";

/* ── Data ──────────────────────────────────────────────────────────── */
const LIVE_SIGNALS = [
  { drug: "Dolo-650", symptom: "Liver Pain", level: "HIGH", faers: true, src: "Twitter", ago: "2m" },
  { drug: "Ibuprofen", symptom: "GI Bleeding", level: "HIGH", faers: true, src: "Twitter", ago: "7m" },
  { drug: "Amoxicillin", symptom: "Allergic Rash", level: "HIGH", faers: true, src: "Twitter", ago: "14m" },
  { drug: "Azithromycin", symptom: "Stomach Pain", level: "MODERATE", faers: false, src: "Quora", ago: "23m" },
  { drug: "Paracetamol", symptom: "Nausea", level: "MODERATE", faers: true, src: "Quora", ago: "31m" },
  { drug: "Crocin", symptom: "Dark Urine", level: "HIGH", faers: true, src: "Reddit", ago: "38m" },
  { drug: "Metformin", symptom: "Headache", level: "LOW", faers: false, src: "Quora", ago: "45m" },
  { drug: "Pantoprazole", symptom: "Joint Pain", level: "MODERATE", faers: false, src: "Reddit", ago: "52m" },
];

const FEATURES = [
  { icon: Globe, title: "Multi-Platform Ingestion", body: "Simultaneously monitors X (Twitter), Quora, Reddit, and any custom web source for patient-reported adverse drug events in real time." },
  { icon: Brain, title: "Agentic LLM Pipeline", body: "Groq → Gemini → Mistral in cascade — extracting drug names, symptoms, PII, severity, and sentiment from a single API call per post." },
  { icon: Shield, title: "FDA FAERS Cross-Validation", body: "Every detected signal is automatically cross-referenced against the FDA Adverse Event Reporting System database for clinical validation." },
  { icon: Database, title: "Risk Scoring Engine", body: "Proprietary 0.4·S + 0.3·F + 0.3·V weighted formula scores each signal on severity, frequency, and velocity for triage prioritisation." },
  { icon: Radio, title: "Real-Time Monitoring", body: "APScheduler ticks every 5 minutes. Critical signals surface immediately. High-risk events enter pharmacovigilance review queues." },
  { icon: Zap, title: "AI Engine Onboarding", body: "Drop any URL. AI fetches the page, analyzes its structure, and returns a complete production-ready scraping configuration in seconds." },
];

const PIPELINE = [
  { n: "01", label: "Collect", desc: "Twitter · Reddit · Quora · Web" },
  { n: "02", label: "Extract", desc: "Drug · Symptom · Severity · PII" },
  { n: "03", label: "Score", desc: "Risk = 0.4S + 0.3F + 0.3V" },
  { n: "04", label: "Validate", desc: "FDA FAERS Cross-Reference" },
  { n: "05", label: "Alert", desc: "Dashboard · API · Webhook" },
];

const STATS = [
  { num: "3+", label: "Social platforms" },
  { num: "3", label: "LLM providers" },
  { num: "< 3s", label: "Signal latency" },
  { num: "FAERS", label: "FDA validated" },
];

const TICKER_ITEMS = [
  "Paracetamol", "Dolo-650", "Azithromycin", "Metformin", "Ibuprofen",
  "Pantoprazole", "Amoxicillin", "Cetirizine", "Crocin", "Atorvastatin",
];

/* ── Helpers ──────────────────────────────────────────────────────── */
const riskStyle = (l: string) =>
  l === "HIGH" ? "bg-ink text-paper"
    : l === "MODERATE" ? "border border-ink text-ink bg-transparent"
      : "bg-neutral-200 text-neutral-600";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true as const },
  transition: { duration: 0.55, ease: "easeOut" as const, delay },
});

/* ── Page ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const featRef = useRef(null);
  const featInView = useInView(featRef, { once: true, margin: "-80px" });

  useEffect(() => {
    const lenis = new Lenis();
    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  return (
    <div className="min-h-screen bg-paper text-ink">

      {/* ── Nav ───────────────────────────────────────────────────── */}
      <nav className="border-b border-ink px-6 py-3 flex items-center justify-between sticky top-0 bg-paper z-40">
        <div className="flex items-center gap-2.5">
          <motion.div
            className="w-7 h-7 bg-ink flex items-center justify-center"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Activity className="w-3.5 h-3.5 text-paper" strokeWidth={1.5} />
          </motion.div>
          <span className="font-display font-black text-sm tracking-tight">HealthPulse</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 border-l border-muted pl-2.5 ml-1 hidden sm:block">
            Signal Intelligence
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 hidden md:block">
            Vol. 1 &nbsp;·&nbsp; India Edition
          </span>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-ink text-paper font-mono text-[10px] uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            Enter Dashboard <ArrowRight className="w-3 h-3" strokeWidth={2} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="border-b border-ink px-6 md:px-12 py-12 md:py-16 newsprint-texture overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <motion.p
            className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          >
            {today} &nbsp;·&nbsp; Hackathon Edition
          </motion.p>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 ">
            {/* Left */}
            <div className="lg:col-span-7  lg:pr-10 pb-10 lg:pb-0">
              <div className="overflow-hidden">
                {["Monitor.", "Detect.", "Protect."].map((word, i) => (
                  <motion.div
                    key={word}
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: i * 0.12 }}
                  >
                    <h1 className={`font-display font-black text-6xl md:text-7xl lg:text-8xl xl:text-[6rem] leading-[0.9] tracking-tighter ${i === 2 ? "italic font-normal text-neutral-500" : "text-ink"}`}>
                      {word}
                    </h1>
                  </motion.div>
                ))}
              </div>

              <motion.p
                className="font-body text-base md:text-lg text-neutral-600 mt-7 max-w-xl leading-relaxed"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.6 }}
              >
                HealthPulse listens to millions of patient voices on Twitter, Reddit, and Quora —
                extracting adverse drug signals in real time, cross-validating against FDA FAERS,
                and surfacing critical safety intelligence before it becomes a crisis.
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-3 mt-8"
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                <Link
                  href="/dashboard"
                  className="group flex items-center gap-2 px-6 py-3 bg-ink text-paper font-mono text-[11px] uppercase tracking-widest transition-all duration-200 hover:gap-3"
                >
                  <Zap className="w-3.5 h-3.5" strokeWidth={2} />
                  Open Dashboard
                  <ArrowRight className="w-3 h-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                </Link>
                <Link
                  href="/dashboard/engines"
                  className="flex items-center gap-2 px-6 py-3 border border-ink font-mono text-[11px] uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors duration-200"
                >
                  Try AI Onboarding →
                </Link>
              </motion.div>

              {/* Source badges */}
              <motion.div
                className="flex flex-wrap gap-2 mt-10"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.5 }}
              >
                {["𝕏 Twitter", "Reddit", "Quora", "Any Forum", "FDA FAERS"].map((src) => (
                  <span key={src} className="font-mono text-[9px] uppercase tracking-widest px-3 py-1.5 border border-muted text-neutral-500 bg-neutral-100">
                    {src}
                  </span>
                ))}
              </motion.div>
            </div>

            {/* Right — Live Signal Feed */}
            <motion.div
              className="lg:col-span-5 lg:pl-8 pt-10 lg:pt-0 border-t lg:border-t-0 border-ink"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
            >
              {/* Feed header */}
              <div className="flex items-center justify-between mb-4">
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">Live Signal Feed</p>
                <div className="flex items-center gap-1.5">
                  <motion.span
                    className="w-1.5 h-1.5 bg-red block"
                    animate={{ opacity: [1, 0.2, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                  <span className="font-mono text-[9px] uppercase tracking-widest text-red">Live</span>
                </div>
              </div>

              {/* Scrolling feed */}
              <div className="border border-ink overflow-hidden h-[360px] relative">
                {/* Fade overlay top */}
                <div className="absolute top-0 inset-x-0 h-8 bg-linear-to-b from-paper to-transparent z-10 pointer-events-none" />
                {/* Fade overlay bottom */}
                <div className="absolute bottom-0 inset-x-0 h-8 bg-linear-to-t from-paper to-transparent z-10 pointer-events-none" />

                <motion.div
                  animate={{ y: ["0%", "-50%"] }}
                  transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                >
                  {[...LIVE_SIGNALS, ...LIVE_SIGNALS].map((sig, i) => (
                    <div key={i} className="px-4 py-3 border-b border-muted last:border-b-0 hover:bg-neutral-100 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-mono text-[8px] uppercase tracking-widest px-2 py-0.5 ${riskStyle(sig.level)}`}>
                          {sig.level}
                        </span>
                        <div className="flex items-center gap-2">
                          {sig.faers && (
                            <span className="font-mono text-[8px] uppercase tracking-widest text-red">✓ FAERS</span>
                          )}
                          <span className="font-mono text-[8px] text-neutral-400">{sig.ago} ago</span>
                        </div>
                      </div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-ink">
                        {sig.drug} <span className="text-neutral-400 font-normal normal-case tracking-normal mx-1">→</span>
                        <span className="font-body font-normal normal-case tracking-normal text-neutral-700 text-xs">{sig.symptom}</span>
                      </p>
                      <p className="font-mono text-[8px] uppercase tracking-widest text-neutral-400 mt-0.5">via {sig.src}</p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Ticker ────────────────────────────────────────────────── */}
      <div className="flex items-center overflow-hidden border-b border-ink bg-ink text-paper">
        <div className="shrink-0 px-4 py-2.5 border-r border-neutral-700 flex items-center gap-2">
          <motion.span
            className="w-2 h-2 bg-red block"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="font-mono text-[9px] uppercase tracking-widest">Monitoring</span>
        </div>
        <div className="overflow-hidden flex-1 py-2.5">
          <div className="ticker-track">
            {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((drug, i) => (
              <span key={i} className="font-mono text-[10px] uppercase tracking-widest text-paper mx-6">
                {drug} <span className="text-neutral-600 mx-2">·</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <section className="border-b border-ink">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 grid-newspaper">
          {STATS.map(({ num, label }, i) => (
            <motion.div
              key={label}
              className="px-8 py-10 newsprint-texture"
              {...fadeUp(i * 0.08)}
            >
              <p className="font-data text-4xl md:text-5xl font-bold text-ink">{num}</p>
              <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mt-2">{label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Pipeline ──────────────────────────────────────────────── */}
      <section className="border-b border-ink px-6 md:px-12 py-12">
        <div className="max-w-7xl mx-auto">
          <motion.div className="mb-8" {...fadeUp()}>
            <h2 className="font-display font-black text-3xl md:text-4xl text-ink">How It Works</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-1">
              End-to-end signal intelligence pipeline
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-5 grid-newspaper">
            {PIPELINE.map(({ n, label, desc }, i) => (
              <motion.div
                key={n}
                className="p-6 relative group hover:bg-ink hover:text-paper transition-colors duration-200"
                {...fadeUp(i * 0.1)}
              >
                <p className="font-data text-4xl font-bold text-muted group-hover:text-neutral-700 transition-colors mb-3">{n}</p>
                <p className="font-display font-bold text-lg text-ink group-hover:text-paper transition-colors">{label}</p>
                <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 group-hover:text-neutral-300 transition-colors mt-1">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="border-b border-ink" ref={featRef}>
        <div className="max-w-7xl mx-auto">
          <motion.div className="px-6 md:px-12 py-6 border-b border-ink" {...fadeUp()}>
            <h2 className="font-display font-black text-3xl md:text-4xl text-ink">Core Capabilities</h2>
            <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-1">Agentic pharmacovigilance</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 grid-newspaper">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                className="p-8 newsprint-texture group hover:bg-ink transition-colors duration-300 cursor-default"
                initial={{ opacity: 0, y: 28 }}
                animate={featInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.55, ease: "easeOut", delay: i * 0.07 }}
              >
                <motion.div
                  className="w-10 h-10 border border-ink group-hover:border-paper flex items-center justify-center mb-5 transition-colors duration-300"
                  whileHover={{ scale: 1.05 }}
                >
                  <Icon className="w-4 h-4 text-ink group-hover:text-paper transition-colors duration-300" strokeWidth={1.5} />
                </motion.div>
                <h3 className="font-display font-bold text-xl text-ink group-hover:text-paper transition-colors duration-300 mb-2">{title}</h3>
                <p className="font-body text-sm text-neutral-600 group-hover:text-neutral-300 transition-colors duration-300 leading-relaxed">{body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="bg-ink text-paper px-6 md:px-12 py-20 newsprint-texture">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-7">
            <motion.p
              className="font-mono text-[9px] uppercase tracking-widest text-neutral-400 mb-4"
              {...fadeUp()}
            >
              Built for Hackathon 2026 · Theme 6
            </motion.p>
            <motion.h2
              className="font-display font-black text-5xl md:text-6xl text-paper leading-[0.92] tracking-tighter"
              {...fadeUp(0.08)}
            >
              Real signals.<br />
              <span className="italic font-normal text-neutral-400">Real impact.</span>
            </motion.h2>
            <motion.p
              className="font-body text-base text-neutral-400 mt-5 leading-relaxed max-w-lg"
              {...fadeUp(0.16)}
            >
              Every missed adverse drug signal is a patient at risk. HealthPulse bridges
              social media conversations and clinical pharmacovigilance — in seconds,
              not weeks.
            </motion.p>
          </div>
          <motion.div className="lg:col-span-5 flex flex-col gap-4" {...fadeUp(0.24)}>
            <Link
              href="/dashboard"
              className="group flex items-center justify-center gap-2 px-8 py-4 bg-paper text-ink font-mono text-[11px] uppercase tracking-widest hover:bg-neutral-100 transition-colors hard-shadow-hover border border-neutral-700"
            >
              <Activity className="w-4 h-4" strokeWidth={1.5} />
              Open Live Dashboard
              <ArrowRight className="w-3.5 h-3.5 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
            </Link>
            <Link
              href="/dashboard/engines"
              className="flex items-center justify-center gap-2 px-8 py-4 border border-neutral-600 text-paper font-mono text-[11px] uppercase tracking-widest hover:border-paper hover:bg-neutral-900 transition-colors"
            >
              Try Agentic Onboarding →
            </Link>
            <div className="grid grid-cols-3 gap-3 mt-2">
              {["Groq", "Gemini", "Mistral"].map((m) => (
                <div key={m} className="border border-neutral-700 px-3 py-2 text-center">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">{m}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="border-t border-ink px-6 md:px-12 py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-ink flex items-center justify-center">
            <Activity className="w-2.5 h-2.5 text-paper" strokeWidth={1.5} />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-neutral-500">
            HealthPulse &nbsp;·&nbsp; Vol. 1.0 &nbsp;·&nbsp; Hackathon 2026
          </span>
        </div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
          Groq · Gemini · Mistral · FDA FAERS · MongoDB Atlas
        </p>
      </footer>
    </div>
  );
}
