"use client";

import { useState, useEffect } from "react";
import { getProjects, createProject, createEngine } from "@/lib/api";
import type { Project } from "@/lib/api";
import { FolderOpen, Plus, X, AlertTriangle, Check } from "lucide-react";

const SOURCE_OPTIONS = [
  { type: "twitter",  label: "X / Twitter" },
  { type: "quora",    label: "Quora" },
  { type: "reddit",   label: "Reddit" },
  { type: "generic",  label: "Generic / Forum" },
] as const;

type SourceType = typeof SOURCE_OPTIONS[number]["type"];
type LatencyMode = "realtime" | "daily" | "weekly";

function ProjectCard({ project }: { project: Project }) {
  return (
    <div className="border border-ink p-6 hard-shadow-hover newsprint-texture flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="w-9 h-9 border border-ink flex items-center justify-center shrink-0">
          <FolderOpen className="w-4 h-4 text-ink" strokeWidth={1.5} />
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-widest px-2 py-0.5 shrink-0 ${project.is_active ? "bg-ink text-paper" : "border border-muted text-neutral-400"}`}>
          {project.is_active ? "Active" : "Paused"}
        </span>
      </div>
      <div>
        <h3 className="font-display font-bold text-xl leading-tight text-ink">{project.name}</h3>
        <p className="font-body text-sm text-neutral-600 mt-1 leading-relaxed">{project.description}</p>
      </div>
      <div className="flex flex-wrap gap-1">
        {(project.keywords || []).slice(0, 4).map((kw) => (
          <span key={kw} className="font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 border border-muted text-neutral-500">
            {kw}
          </span>
        ))}
        {(project.keywords || []).length > 4 && (
          <span className="font-mono text-[9px] text-neutral-400 px-1">+{(project.keywords || []).length - 4}</span>
        )}
      </div>
      <div className="grid grid-cols-3 border-t border-muted pt-4 mt-auto">
        <div className="text-center border-r border-muted">
          <p className="font-data text-2xl font-medium text-ink">{project.signal_count}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-neutral-500 mt-0.5">Signals</p>
        </div>
        <div className="text-center border-r border-muted">
          <p className={`font-data text-2xl font-medium ${project.high_risk_count > 0 ? "text-red" : "text-ink"}`}>
            {project.high_risk_count}
          </p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-neutral-500 mt-0.5">High Risk</p>
        </div>
        <div className="text-center">
          <p className="font-data text-2xl font-medium text-ink">{project.post_count}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-neutral-500 mt-0.5">Posts</p>
        </div>
      </div>
      <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-400">
        Created {new Date(project.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
      </p>
    </div>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [keywordsRaw, setKeywordsRaw] = useState("");
  const [selectedSources, setSelectedSources] = useState<SourceType[]>(["twitter", "quora"]);
  const [latency, setLatency] = useState<LatencyMode>("daily");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    getProjects().then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, []);

  function toggleSource(type: SourceType) {
    setSelectedSources((prev) =>
      prev.includes(type) ? prev.filter((s) => s !== type) : [...prev, type]
    );
  }

  async function handleCreate() {
    if (!name.trim()) { setFormError("Project name is required"); return; }
    const keywords = keywordsRaw.split(",").map((k) => k.trim()).filter(Boolean);
    if (keywords.length === 0) { setFormError("Add at least one keyword"); return; }
    if (selectedSources.length === 0) { setFormError("Select at least one source to monitor"); return; }

    setCreating(true);
    setFormError("");
    setSuccessMsg("");

    try {
      // 1. Create the project
      const created = await createProject({ name: name.trim(), description: description.trim(), keywords });

      // 2. Auto-create an engine for each selected source
      const enginePromises = selectedSources.map((sourceType) =>
        createEngine({
          project_id: created.id,
          engine_type: sourceType as "twitter" | "reddit" | "quora" | "generic",
          latency_mode: latency,
          config: {},
          is_active: true,
        }).catch(() => null) // non-fatal — project still created
      );
      const engines = await Promise.all(enginePromises);
      const engineCount = engines.filter(Boolean).length;

      setProjects((prev) => [created, ...prev]);
      setSuccessMsg(`Project created with ${engineCount} engine${engineCount !== 1 ? "s" : ""}!`);
      setName(""); setDescription(""); setKeywordsRaw("");
      setSelectedSources(["twitter", "quora"]);
      setLatency("daily");

      setTimeout(() => {
        setShowForm(false);
        setSuccessMsg("");
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  const LATENCY_OPTIONS: { value: LatencyMode; label: string; desc: string }[] = [
    { value: "realtime", label: "Real-time", desc: "Every 5 min" },
    { value: "daily",    label: "Daily",     desc: "Once per day" },
    { value: "weekly",   label: "Weekly",    desc: "Once per week" },
  ];

  return (
    <div className="max-w-7xl">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="pb-4 border-b-4 border-ink flex items-end justify-between">
        <div>
          <h1 className="font-display font-black text-5xl leading-[0.95] tracking-tighter text-ink">
            Monitoring<br /><span className="italic font-normal">Projects</span>
          </h1>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mt-2">
            {projects.length} projects &nbsp;·&nbsp; keyword-based signal collection
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(""); }}
          className="flex items-center gap-2 px-5 py-2.5 border border-ink font-mono text-[11px] uppercase tracking-widest transition-colors hover:bg-ink hover:text-paper mb-1"
        >
          {showForm ? <X className="w-3.5 h-3.5" strokeWidth={2} /> : <Plus className="w-3.5 h-3.5" strokeWidth={2} />}
          {showForm ? "Cancel" : "New Project"}
        </button>
      </div>

      {/* ── Create Form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="border-b border-l border-r border-ink bg-neutral-100/60 p-6">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-5">
            Configure New Monitoring Project
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left column */}
            <div className="flex flex-col gap-5">
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-1">Project Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. OTC Drug Watch India"
                  className="w-full bg-paper border-b-2 border-ink px-0 py-1.5 font-mono text-sm text-ink placeholder:text-neutral-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the monitoring goal"
                  className="w-full bg-paper border-b-2 border-muted px-0 py-1.5 font-mono text-sm text-ink placeholder:text-neutral-400 focus:outline-none focus:border-ink transition-colors"
                />
              </div>
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-1">Keywords * (comma-separated)</label>
                <textarea
                  value={keywordsRaw}
                  onChange={(e) => setKeywordsRaw(e.target.value)}
                  placeholder="paracetamol, dolo-650, ibuprofen, crocin"
                  rows={3}
                  className="w-full bg-paper border border-ink px-3 py-2 font-mono text-sm text-ink placeholder:text-neutral-400 focus:outline-none resize-none"
                />
                <p className="font-mono text-[9px] text-neutral-400 mt-1">
                  {keywordsRaw.split(",").filter((k) => k.trim()).length} keywords entered
                </p>
              </div>
            </div>

            {/* Right column — Source + Latency config */}
            <div className="flex flex-col gap-5">
              {/* Sources */}
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-2">
                  Sources to Monitor *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCE_OPTIONS.map(({ type, label }) => {
                    const active = selectedSources.includes(type);
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => toggleSource(type)}
                        className={[
                          "flex items-center gap-2 px-3 py-2.5 border font-mono text-[10px] uppercase tracking-widest transition-colors",
                          active
                            ? "bg-ink text-paper border-ink"
                            : "bg-paper text-neutral-500 border-muted hover:border-ink hover:text-ink",
                        ].join(" ")}
                      >
                        <span className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${active ? "border-paper" : "border-muted"}`}>
                          {active && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                        </span>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <p className="font-mono text-[9px] text-neutral-400 mt-2">
                  {selectedSources.length} source{selectedSources.length !== 1 ? "s" : ""} selected — one engine will be created per source
                </p>
              </div>

              {/* Latency mode */}
              <div>
                <label className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 block mb-2">
                  Ingest Frequency (applied to all sources)
                </label>
                <div className="grid grid-cols-3 border border-ink">
                  {LATENCY_OPTIONS.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setLatency(value)}
                      className={[
                        "py-3 px-2 text-center border-r last:border-r-0 border-ink transition-colors",
                        latency === value ? "bg-ink text-paper" : "bg-paper text-ink hover:bg-neutral-100",
                      ].join(" ")}
                    >
                      <p className="font-mono text-[10px] uppercase tracking-widest">{label}</p>
                      <p className={`font-mono text-[8px] mt-0.5 ${latency === value ? "text-neutral-400" : "text-neutral-500"}`}>{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {selectedSources.length > 0 && (
                <div className="border border-muted p-3 bg-paper">
                  <p className="font-mono text-[9px] uppercase tracking-widest text-neutral-500 mb-2">Will Create:</p>
                  {selectedSources.map((s) => (
                    <p key={s} className="font-mono text-[10px] text-ink">
                      · {s} engine &nbsp;<span className="text-neutral-400">({latency})</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {formError && (
            <div className="flex items-center gap-2 mt-4 text-red">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" strokeWidth={1.5} />
              <p className="font-mono text-xs">{formError}</p>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 mt-4 text-ink">
              <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2} />
              <p className="font-mono text-xs font-bold">{successMsg}</p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="px-6 py-2.5 bg-ink text-paper font-mono text-[11px] uppercase tracking-widest hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {creating ? "Creating…" : `Create Project + ${selectedSources.length} Engine${selectedSources.length !== 1 ? "s" : ""}`}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2.5 border border-ink font-mono text-[11px] uppercase tracking-widest hover:bg-neutral-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Projects Grid ───────────────────────────────────────────── */}
      {loading ? (
        <div className="py-24 text-center border-b border-l border-r border-ink">
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 animate-pulse">Loading projects…</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="py-24 text-center border-b border-l border-r border-ink">
          <p className="font-display text-3xl text-neutral-400 italic">No projects yet</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400 mt-2">
            Create a project to start monitoring drug signals
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 grid-newspaper">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}
