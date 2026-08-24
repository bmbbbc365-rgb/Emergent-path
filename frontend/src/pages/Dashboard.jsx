import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Section, StatCard, ProgressBar, EmptyHint } from "@/components/Bits";
import { SECTIONS, SECTION_BY_KEY } from "@/lib/sections";
import {
  CheckCircle2, Calendar, Target, FileText, Sparkles, ArrowRight, Shield,
  Stethoscope, HandCoins, House, Briefcase, GraduationCap, AlertCircle,
} from "lucide-react";

function TilePreview({ icon: Icon, label, to, children }) {
  return (
    <Link to={to} className="bmb-card p-5 block hover:-translate-y-0.5 transition-transform">
      <div className="flex items-center justify-between">
        <div className="w-10 h-10 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Icon className="w-5 h-5" /></div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
      </div>
      <div className="font-display text-lg text-[#1B1033] mt-3">{label}</div>
      <div className="mt-2 text-xs text-slate-500 space-y-1">{children}</div>
    </Link>
  );
}

export default function Dashboard() {
  const [s, setS] = useState(null);

  useEffect(() => { (async () => setS((await api.get("/dashboard/summary")).data))(); }, []);

  const toggle = async (id) => {
    await api.patch(`/tasks/${id}`, { status: "done" });
    setS((await api.get("/dashboard/summary")).data);
  };

  if (!s) return <div className="text-slate-500">Loading your Blueprint…</div>;

  return (
    <div className="space-y-8" data-testid="dashboard">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-[#C94F7C]/15 blur-3xl" />
        <div className="overline">A Path Forward™ · My Blueprint</div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight text-[#1B1033] mt-1">Your command center.</h1>
        <p className="text-slate-600 mt-2 max-w-2xl">Not a task list — a living view of everything you're building. Requirements, documents, health, benefits, home, employment, education, and your Support Circle in one calm place.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <StatCard label="Required items" value={`${s.required.done}/${s.required.total}`} sublabel={`${s.required.pct}% complete`} accent testId="stat-required" />
          <StatCard label="Goals average" value={`${s.goals_avg_progress}%`} sublabel={`${s.goals_count} active`} testId="stat-goals" />
          <StatCard label="Education" value={`${s.education.pct}%`} sublabel={`${s.education.lessons_done}/${s.education.lessons_total} lessons`} testId="stat-education" />
          <StatCard label="Documents saved" value={s.documents_count} sublabel="Private to you" testId="stat-docs" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bmb-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div><div className="overline">Today's priorities</div><h2 className="font-display text-xl text-[#1B1033]">What to work on today</h2></div>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>
          {s.today_priority.length === 0 ? <EmptyHint>Nothing urgent today. Nice work.</EmptyHint> : (
            <ul className="divide-y divide-slate-100">
              {s.today_priority.map((t) => {
                const sec = SECTION_BY_KEY[t.section];
                return (
                  <li key={t.id} className="py-3 flex items-start gap-3" data-testid={`priority-${t.id}`}>
                    <button onClick={() => toggle(t.id)} className="mt-0.5 text-slate-300 hover:text-emerald-500" data-testid={`complete-${t.id}`}><CheckCircle2 className="w-5 h-5" /></button>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#1B1033] font-medium">{t.title}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{sec?.label || t.section} · due {t.due_date || "—"}
                        {t.required && <span className="ml-2 bmb-pill bg-[#5B1A3A]/10 text-[#5B1A3A]">required</span>}
                        {t.priority === "high" && <span className="ml-2 bmb-pill bg-[#B76E79]/15 text-[#8E4E5A]">high</span>}
                      </div>
                    </div>
                    {sec && <Link to={`/app/section/${sec.key}`} className="text-xs text-[#1B1033] hover:text-[#C94F7C]">Open →</Link>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="bmb-card p-6">
          <div className="overline">Upcoming (7 days)</div>
          <h2 className="font-display text-xl text-[#1B1033]">Deadlines</h2>
          <div className="mt-4 space-y-3">
            {s.upcoming.length === 0 && <EmptyHint>Clear week ahead.</EmptyHint>}
            {s.upcoming.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-start gap-3">
                <div className="w-9 text-center">
                  <div className="text-[10px] uppercase text-slate-400 leading-none">{(t.due_date || "").slice(5, 7)}</div>
                  <div className="font-display text-lg text-[#1B1033] leading-none">{(t.due_date || "--").slice(8, 10)}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-[#1B1033] truncate">{t.title}</div>
                  <div className="text-[11px] text-slate-500 truncate">{SECTION_BY_KEY[t.section]?.label || t.section}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Section eyebrow="Cross-system snapshot" title="Where you stand across A Path Forward">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          <TilePreview icon={Shield} label="Release Requirements" to="/app/section/requirements">
            <div className="flex justify-between"><span>Open items</span><span className="text-[#1B1033]">{s.required.open}</span></div>
            <div className="flex justify-between"><span>Balance owed</span><span className="text-[#1B1033]">${(s.requirements.owed || 0).toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Paid so far</span><span className="text-[#1B1033]">${(s.requirements.paid || 0).toFixed(2)}</span></div>
          </TilePreview>

          <TilePreview icon={Stethoscope} label="Health Hub" to="/app/section/health-hub">
            <div className="flex justify-between"><span>Medications</span><span className="text-[#1B1033]">{s.health.medications}</span></div>
            <div className="flex justify-between"><span>Conditions</span><span className="text-[#1B1033]">{s.health.conditions}</span></div>
            <div className="flex justify-between"><span>Next appointment</span><span className="text-[#1B1033] truncate ml-2">{s.appointments[0]?.scheduled_at?.slice(0,10) || "—"}</span></div>
          </TilePreview>

          <TilePreview icon={HandCoins} label="Benefits Hub" to="/app/section/benefits-hub">
            <div className="flex justify-between"><span>Active benefits</span><span className="text-[#1B1033]">{s.benefits.active}</span></div>
            <div className="text-xs text-slate-500">Includes health, dental, vision, life, disability where you've added them.</div>
          </TilePreview>

          <TilePreview icon={House} label="Home Hub" to="/app/section/home-hub">
            <div className="flex justify-between"><span>Housing status</span><span className="text-[#1B1033] truncate ml-2">{s.housing?.status || "not set"}</span></div>
            <div className="flex justify-between"><span>Address</span><span className="text-[#1B1033] truncate ml-2">{s.housing?.address || "—"}</span></div>
          </TilePreview>

          <TilePreview icon={Briefcase} label="Employment" to="/app/section/employment-record">
            <div className="flex justify-between"><span>Active jobs</span><span className="text-[#1B1033]">{s.employment.active_jobs}</span></div>
            <div className="flex justify-between"><span>Open applications</span><span className="text-[#1B1033]">{s.employment.open_applications}</span></div>
          </TilePreview>

          <TilePreview icon={GraduationCap} label="Education" to="/app/library">
            <div className="flex justify-between"><span>Lessons complete</span><span className="text-[#1B1033]">{s.education.lessons_done}/{s.education.lessons_total}</span></div>
            <ProgressBar pct={s.education.pct} />
          </TilePreview>
        </div>
      </Section>

      <Section eyebrow="Goals" title="30 · 90 · 180 · 365 days">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {s.goals.map((g) => (
            <div key={g.id} className="bmb-card p-5">
              <div className="flex items-center justify-between"><div className="overline">{g.timeframe}-day</div><Target className="w-4 h-4 text-slate-400" /></div>
              <div className="font-display text-lg text-[#1B1033] mt-1">{g.title}</div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{g.description}</p>
              <div className="mt-4"><ProgressBar pct={g.progress} /></div>
              <div className="mt-2 text-xs text-slate-500">{g.progress}% · target {g.target_date || "—"}</div>
            </div>
          ))}
          {s.goals.length === 0 && <EmptyHint>Add your first goal.</EmptyHint>}
        </div>
      </Section>

      <Section eyebrow="Section progress" title="Blueprint sections">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {SECTIONS.map((sec) => {
            const p = s.section_progress[sec.key] || { pct: 0, done: 0, total: 0 };
            const Icon = sec.icon;
            return (
              <Link key={sec.key} to={`/app/section/${sec.key}`} className="bmb-card p-5 block hover:-translate-y-0.5 transition-transform" data-testid={`section-card-${sec.key}`}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Icon className="w-5 h-5" /></div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>
                <div className="font-display text-lg text-[#1B1033] mt-3">{sec.label}</div>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">{sec.blurb}</p>
                <div className="mt-4"><ProgressBar pct={p.pct} /></div>
                <div className="mt-2 text-[11px] text-slate-500">{p.done}/{p.total} tasks</div>
              </Link>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
