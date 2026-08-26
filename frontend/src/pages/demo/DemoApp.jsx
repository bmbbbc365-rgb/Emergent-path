import React, { useState } from "react";
import { Routes, Route, NavLink, Link, useNavigate } from "react-router-dom";
import {
  Sparkles, Home, Compass, FileText, Bot, GraduationCap, MapPin, TrendingUp,
  Info, ArrowRight, ArrowLeft, RotateCcw, LogOut, Check, Circle, Clock, Lock,
  Shield, Layers, Send,
} from "lucide-react";
import {
  DEMO_PARTICIPANT, DEMO_BLUEPRINT, DEMO_VAULT, DEMO_ACTIONS, DEMO_LEARN_PATHWAY,
  DEMO_RESOURCE_MAP, DEMO_PROGRESS, DEMO_BRIDGE_SUGGESTIONS, demoBridgeAnswer,
} from "./DemoData";

const BRAND_IMG = "/journey-brand.png";

/* ============================================================
 * DemoLayout — persistent Demo Mode banner + sidebar
 * ============================================================ */
function DemoBanner() {
  const nav = useNavigate();
  return (
    <div className="w-full text-white px-4 py-2 text-xs md:text-sm flex flex-wrap items-center justify-between gap-2"
      style={{ background: "linear-gradient(90deg, #4a2a5a 0%, #B76E79 100%)" }}
      data-testid="demo-banner">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-[#F5D28F]" />
        <span className="font-semibold tracking-wide uppercase">Demo Mode</span>
        <span className="hidden sm:inline text-white/80">— Fictional participant · No real data.</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={() => nav("/demo")}
          className="rounded-full bg-white/15 hover:bg-white/25 text-white px-3 py-1 text-[11px] font-medium inline-flex items-center gap-1"
          data-testid="demo-restart">
          <RotateCcw className="w-3 h-3" /> Start over
        </button>
        <Link to="/"
          className="rounded-full bg-white text-[#4a2a5a] px-3 py-1 text-[11px] font-medium inline-flex items-center gap-1 hover:bg-slate-50"
          data-testid="demo-exit">
          <LogOut className="w-3 h-3" /> Exit demo
        </Link>
      </div>
    </div>
  );
}

const NAV = [
  { to: "/demo",           label: "Overview",  icon: Home,          end: true },
  { to: "/demo/blueprint", label: "Blueprint", icon: Compass       },
  { to: "/demo/vault",     label: "Vault",     icon: FileText      },
  { to: "/demo/bridge",    label: "Bridge AI", icon: Bot           },
  { to: "/demo/learn",     label: "Learn → Do", icon: GraduationCap },
  { to: "/demo/resources", label: "Resources", icon: MapPin        },
  { to: "/demo/progress",  label: "Progress",  icon: TrendingUp    },
  { to: "/demo/about",     label: "About",     icon: Info          },
];

function DemoNav() {
  return (
    <div className="rounded-2xl bg-white border border-[#E4CDBF] p-2 flex flex-wrap gap-1 mb-6 sticky top-2 z-20 shadow-sm">
      {NAV.map((n) => {
        const Icon = n.icon;
        return (
          <NavLink key={n.to} to={n.to} end={n.end}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-xs md:text-sm inline-flex items-center gap-1.5 transition ${
                isActive ? "bg-[#4a2a5a] text-white" : "text-[#4a2a5a] hover:bg-[#F3E1D8]"
              }`
            }
            data-testid={`demo-nav-${n.to.split("/").pop() || "overview"}`}>
            <Icon className="w-4 h-4" /> {n.label}
          </NavLink>
        );
      })}
    </div>
  );
}

function ProfileHeader() {
  return (
    <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #2B1440 0%, #4a2a5a 55%, #B76E79 100%)" }}>
      <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(255,255,255,0.14) 0%, transparent 70%)" }} />
      <div className="text-[10px] uppercase tracking-[0.22em] text-[#F5D28F] font-semibold">
        Demo Profile — Fictional data
      </div>
      <h1 className="font-display text-3xl md:text-4xl text-white mt-2 leading-tight">
        Meet {DEMO_PARTICIPANT.name}
      </h1>
      <p className="text-[#F3E1D8] mt-2 max-w-2xl">
        {DEMO_PARTICIPANT.location} · {DEMO_PARTICIPANT.situation}. Housing is
        stable for now. Goal: a warehouse or manufacturing role and a first bank
        account within 60 days.
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
        {[
          { k: "Transportation", v: "No vehicle" },
          { k: "Tech",           v: "Smartphone" },
          { k: "State ID",       v: "Replacement needed" },
          { k: "Resume",         v: "Draft" },
        ].map((f) => (
          <span key={f.k} className="rounded-full bg-white/10 border border-white/20 text-white px-3 py-1">
            <span className="text-white/60">{f.k}:</span> {f.v}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
 * OVERVIEW
 * ============================================================ */
function DemoOverview() {
  return (
    <>
      <ProfileHeader />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3" data-testid="demo-flow-strip">
        {[
          { n: "01", label: "Where am I now?",  body: "Guided intake surfaces real barriers.",  to: "/demo/blueprint" },
          { n: "02", label: "What do I need?",  body: "Blueprint ranks priorities by leverage.", to: "/demo/blueprint" },
          { n: "03", label: "What should I do?", body: "Learn → Do → Track → Get Help.",         to: "/demo/learn" },
          { n: "04", label: "What comes next?", body: "Progress tracker + Bridge context.",     to: "/demo/progress" },
        ].map((s) => (
          <Link key={s.n} to={s.to}
            className="rounded-2xl bg-white border border-[#E4CDBF] p-4 hover:-translate-y-0.5 transition-transform block"
            data-testid={`demo-flow-${s.n}`}>
            <div className="text-[10px] uppercase tracking-widest text-[#8E4E5A] font-semibold">Step {s.n}</div>
            <div className="font-display text-base text-[#1B1033] mt-1">{s.label}</div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">{s.body}</p>
            <div className="mt-2 text-[11px] text-[#4a2a5a] inline-flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <TilePriorities />
        <TileVault />
        <TileBridge />
      </div>

      <div className="mt-6 rounded-2xl bg-[#FBF3E9] border border-[#E4CDBF] p-4 md:p-5">
        <div className="overline text-[#8E4E5A]">Why A Path Forward exists</div>
        <p className="text-sm text-slate-800 mt-2 max-w-3xl leading-relaxed">
          While building Build My Blueprint™, we set out to bridge one gap—and
          uncovered another. Meet A Path Forward: bridging fragmented resources
          and unequal access with personalized pathways forward.
        </p>
      </div>
    </>
  );
}

function TilePriorities() {
  const top = DEMO_ACTIONS.filter((a) => a.status !== "completed").slice(0, 3);
  return (
    <div className="rounded-2xl bg-white border border-[#E4CDBF] p-4 md:p-5" data-testid="demo-tile-priorities">
      <div className="overline text-[#8E4E5A]">Today's priorities</div>
      <ul className="mt-3 space-y-2">
        {top.map((a) => (
          <li key={a.id} className="text-sm">
            <div className="font-medium text-[#1B1033]">{a.title}</div>
            <div className="text-xs text-slate-600 mt-0.5">{a.why}</div>
          </li>
        ))}
      </ul>
      <Link to="/demo/blueprint" className="mt-3 inline-flex items-center gap-1 text-xs text-[#4a2a5a] hover:underline">
        Open Blueprint <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
function TileVault() {
  const n = DEMO_VAULT.length;
  const done = DEMO_VAULT.filter((d) => d.status === "available" || d.status === "received" || d.status === "completed").length;
  return (
    <div className="rounded-2xl bg-white border border-[#E4CDBF] p-4 md:p-5" data-testid="demo-tile-vault">
      <div className="overline text-[#8E4E5A]">Pathway Vault</div>
      <div className="font-display text-2xl text-[#1B1033] mt-1">{done}/{n}</div>
      <p className="text-xs text-slate-600 mt-1">Documents secured. AI recognized categories linked to Blueprint.</p>
      <Link to="/demo/vault" className="mt-3 inline-flex items-center gap-1 text-xs text-[#4a2a5a] hover:underline">
        Open Vault <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}
function TileBridge() {
  return (
    <div className="rounded-2xl p-4 md:p-5 text-white"
      style={{ background: "linear-gradient(135deg, #4a2a5a 0%, #B76E79 100%)" }}
      data-testid="demo-tile-bridge">
      <div className="overline text-[#F5D28F]">Bridge AI</div>
      <div className="font-display text-lg mt-1 leading-tight">Answers with Jordan's Blueprint, Vault, and progress in context.</div>
      <Link to="/demo/bridge" className="mt-3 inline-flex items-center gap-1 text-xs bg-white/15 hover:bg-white/25 rounded-full px-3 py-1">
        Ask Bridge <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

/* ============================================================
 * BLUEPRINT
 * ============================================================ */
function DemoBlueprint() {
  return (
    <>
      <ProfileHeader />
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-bp-priorities">
          <div className="overline text-[#8E4E5A]">Immediate priorities · ranked by leverage</div>
          <ol className="mt-3 space-y-3">
            {DEMO_BLUEPRINT.immediate_priorities.map((p, i) => (
              <li key={p.key} className="flex gap-3 rounded-xl border border-slate-100 p-3">
                <div className="w-7 h-7 shrink-0 rounded-full bg-[#4a2a5a]/10 text-[#4a2a5a] flex items-center justify-center text-xs font-bold">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium text-[#1B1033]">{p.label}</div>
                    <StatusPill status={p.status} />
                  </div>
                  <div className="text-xs text-slate-600 mt-1">{p.why}</div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1">ETA · {p.eta}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-bp-strengths">
            <div className="overline text-[#4E8C86]">Strengths & assets</div>
            <ul className="mt-2 text-sm text-slate-800 space-y-1">
              {DEMO_BLUEPRINT.strengths.map((s) => <li key={s}>· {s}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-bp-barriers">
            <div className="overline text-[#B85A4B]">Barriers</div>
            <ul className="mt-2 text-sm space-y-1">
              {DEMO_BLUEPRINT.barriers.map((b) => (
                <li key={b.key} className="flex items-center justify-between">
                  <span>· {b.label}</span>
                  <SeverityPill s={b.severity} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl bg-[#FBF3E9] border border-[#E4CDBF] p-4 text-sm text-slate-800">
        <span className="font-semibold text-[#4a2a5a]">Why this isn't a checklist:</span>{" "}
        The Blueprint reorders itself when Jordan's answers, uploads, or milestones change.
        Someone whose barrier list starts with "no housing" or "recent overdose" gets a
        completely different first step and a different resource map — same engine.
      </div>
    </>
  );
}
function StatusPill({ status }) {
  const map = {
    completed:  { label: "Complete",     bg: "bg-emerald-100", text: "text-emerald-800", Icon: Check },
    in_progress:{ label: "In progress",  bg: "bg-amber-100",   text: "text-amber-900",   Icon: Clock },
    not_started:{ label: "Not started",  bg: "bg-slate-100",   text: "text-slate-600",   Icon: Circle },
  };
  const m = map[status] || map.not_started;
  return <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full ${m.bg} ${m.text}`}><m.Icon className="w-3 h-3" /> {m.label}</span>;
}
function SeverityPill({ s }) {
  const m = { high: "bg-rose-100 text-rose-700", medium: "bg-amber-100 text-amber-800", low: "bg-slate-100 text-slate-600" }[s];
  return <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-full ${m}`}>{s}</span>;
}

/* ============================================================
 * VAULT
 * ============================================================ */
function DemoVault() {
  return (
    <>
      <ProfileHeader />
      <div className="mt-6 rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-vault">
        <div className="overline text-[#8E4E5A]">Pathway Vault · demo documents</div>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
          {DEMO_VAULT.map((d) => (
            <div key={d.id} className="rounded-xl border border-slate-100 p-4"
              data-testid={`demo-vault-${d.id}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-[#1B1033]">{d.title}</div>
                <VaultPill status={d.status} />
              </div>
              <div className="text-[11px] text-slate-500 mt-1">{d.category} · updated {d.updated}</div>
              <div className="mt-2 text-xs text-[#4a2a5a] bg-[#F3E1D8]/60 border border-[#E4CDBF] rounded-lg p-2">
                <span className="font-semibold">Bridge insight: </span>{d.ai_note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function VaultPill({ status }) {
  const map = {
    available:            { label: "Available",     cls: "bg-emerald-100 text-emerald-800" },
    received:             { label: "Received",      cls: "bg-emerald-100 text-emerald-800" },
    completed:            { label: "Completed",     cls: "bg-emerald-100 text-emerald-800" },
    draft:                { label: "Draft",         cls: "bg-amber-100 text-amber-900" },
    replacement_needed:   { label: "Needs work",    cls: "bg-rose-100 text-rose-700" },
  };
  const m = map[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`text-[10px] uppercase tracking-widest font-semibold px-2 py-0.5 rounded-full ${m.cls}`}>{m.label}</span>;
}

/* ============================================================
 * BRIDGE AI (scripted)
 * ============================================================ */
function DemoBridge() {
  const [messages, setMessages] = useState([
    { from: "bridge", text: "I know Jordan's current Blueprint, Vault, and progress. Ask me anything — try one of the suggested prompts below." },
  ]);
  const [input, setInput] = useState("");

  const ask = (q) => {
    if (!q.trim()) return;
    const answer = demoBridgeAnswer(q);
    setMessages((m) => [
      ...m,
      { from: "user", text: q },
      { from: "bridge", text: answer.text, actions: answer.actions || [] },
    ]);
    setInput("");
  };

  return (
    <>
      <ProfileHeader />
      <div className="mt-6 rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-bridge">
        <div className="overline text-[#8E4E5A]">Bridge AI · contextual guide</div>

        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_BRIDGE_SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => ask(s)}
              className="rounded-full bg-[#F3E1D8]/70 border border-[#E4CDBF] hover:border-[#B76E79] text-[11px] text-[#1B1033] px-3 py-1"
              data-testid={`demo-bridge-suggestion-${i}`}>{s}</button>
          ))}
        </div>

        <div className="mt-4 space-y-2 max-h-[420px] overflow-y-auto pr-2">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.from === "user"
                  ? "bg-[#4a2a5a] text-white"
                  : "bg-[#FBF3E9] border border-[#E4CDBF] text-slate-800"
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={{ __html: renderInlineBold(m.text) }} />
                {m.actions?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.actions.map((a, j) => (
                      <Link key={j} to={a.route}
                        className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white text-[11px] px-3 py-1"
                        data-testid={`demo-bridge-action-${i}-${j}`}>
                        {a.label} <ArrowRight className="w-3 h-3 inline" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(input)}
            placeholder="Ask Bridge…"
            className="flex-1 rounded-full border border-[#E4CDBF] px-4 py-2 text-sm outline-none focus:border-[#B76E79]"
            data-testid="demo-bridge-input" />
          <button onClick={() => ask(input)}
            className="rounded-full bg-[#4a2a5a] hover:bg-[#3a1e4a] text-white px-4 py-2 text-sm inline-flex items-center gap-1"
            data-testid="demo-bridge-send">
            <Send className="w-4 h-4" /> Send
          </button>
        </div>

        <p className="mt-3 text-[10px] text-slate-500 italic">
          Demo Bridge replies from Jordan Carter's fictional Blueprint. Production Bridge uses the participant's live data via GPT-5.6.
        </p>
      </div>
    </>
  );
}
function renderInlineBold(text) {
  return String(text).replace(/</g, "&lt;").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/* ============================================================
 * LEARN → DO → TRACK → GET HELP
 * ============================================================ */
function DemoLearn() {
  const p = DEMO_LEARN_PATHWAY;
  return (
    <>
      <ProfileHeader />
      <div className="mt-6 rounded-2xl p-5 text-white"
        style={{ background: "linear-gradient(135deg, #2B5F5A 0%, #4E8C86 100%)" }}
        data-testid="demo-learn-hero">
        <div className="overline text-[#DCEDE8]">Pathway · {p.progress_pct}% complete</div>
        <h2 className="font-display text-2xl mt-1">{p.title}</h2>
        <div className="mt-3 h-2 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full bg-[#F5D28F]" style={{ width: `${p.progress_pct}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <PathwayCard eyebrow="Learn" title={p.learn.title} body={p.learn.summary} meta={`${p.learn.minutes} min · ${p.learn.status}`} accent="#4a2a5a" />
        <PathwayCard eyebrow="Do"    title={p.do.title}    body={p.do.summary}    meta={p.do.status}                                accent="#B76E79" />
        <div className="rounded-2xl bg-white border border-[#E4CDBF] p-4">
          <div className="overline text-[#2B5F5A]">Track</div>
          <div className="text-xs font-semibold text-slate-700 mt-2">Completed</div>
          <ul className="mt-1 text-sm text-slate-800 space-y-1">
            {p.track.completed.map((t) => <li key={t} className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600" /> {t}</li>)}
          </ul>
          <div className="text-xs font-semibold text-slate-700 mt-3">Remaining</div>
          <ul className="mt-1 text-sm text-slate-800 space-y-1">
            {p.track.remaining.map((t) => <li key={t} className="flex items-center gap-2"><Circle className="w-3.5 h-3.5 text-slate-400" /> {t}</li>)}
          </ul>
        </div>
        <div className="rounded-2xl bg-white border border-[#E4CDBF] p-4">
          <div className="overline text-[#B85A4B]">Get help</div>
          <ul className="mt-2 space-y-1">
            {p.help.map((h) => (
              <li key={h.label}>
                <Link to={h.route} className="text-sm text-[#4a2a5a] hover:underline inline-flex items-center gap-1">
                  {h.label} <ArrowRight className="w-3 h-3" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
function PathwayCard({ eyebrow, title, body, meta, accent }) {
  return (
    <div className="rounded-2xl bg-white border-l-4 p-4" style={{ borderLeftColor: accent }}>
      <div className="overline" style={{ color: accent }}>{eyebrow}</div>
      <div className="font-display text-base text-[#1B1033] mt-1">{title}</div>
      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{body}</p>
      <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">{meta}</div>
    </div>
  );
}

/* ============================================================
 * RESOURCE NAVIGATION (barrier → mapped resources)
 * ============================================================ */
function DemoResources() {
  return (
    <>
      <ProfileHeader />
      <div className="mt-6 space-y-4">
        {Object.entries(DEMO_RESOURCE_MAP).map(([key, group]) => (
          <div key={key} className="rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid={`demo-res-${key}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#B85A4B]/15 text-[#B85A4B] flex items-center justify-center">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="overline text-[#B85A4B]">Barrier</div>
                <div className="font-display text-lg text-[#1B1033] leading-tight">{group.label}</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {group.resources.map((r, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-3">
                  <div className="font-medium text-sm text-[#1B1033]">{r.title}</div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.body}</p>
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">{r.source}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl bg-[#FBF3E9] border border-[#E4CDBF] p-4 text-sm text-slate-800">
        <span className="font-semibold text-[#4a2a5a]">Not a directory.</span>{" "}
        A Path Forward maps resources to the barriers your Blueprint actually
        identifies — so you see the two or three that fit your situation, not
        the full 40-page county list.
      </div>
    </>
  );
}

/* ============================================================
 * PROGRESS · Before / Current / Next
 * ============================================================ */
function DemoProgress() {
  return (
    <>
      <ProfileHeader />
      <div className="mt-6 rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-progress">
        <div className="overline text-[#8E4E5A]">Demo participant progress</div>
        <div className="mt-2 text-xs italic text-slate-500">
          The numbers below reflect Jordan Carter's sample plan only. They are
          <span className="font-semibold text-[#B85A4B]"> not </span>
          real-world A Path Forward outcome metrics.
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <Column color="#8E4E5A" title="Starting point" items={DEMO_PROGRESS.starting_point} />
          <Column color="#B5851F" title="Current progress" items={DEMO_PROGRESS.current} />
          <Column color="#2B5F5A" title="Next priority"   items={DEMO_PROGRESS.next} />
        </div>

        <div className="mt-5">
          <div className="text-xs uppercase tracking-widest text-slate-500">Overall Blueprint progress</div>
          <div className="mt-2 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#4a2a5a] to-[#B76E79]" style={{ width: `${DEMO_BLUEPRINT.progress_pct}%` }} />
          </div>
          <div className="mt-1 text-xs text-[#4a2a5a] font-semibold">{DEMO_BLUEPRINT.progress_pct}%</div>
        </div>
      </div>
    </>
  );
}
function Column({ color, title, items }) {
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <div className="overline" style={{ color }}>{title}</div>
      <ul className="mt-2 text-sm text-slate-800 space-y-1.5">
        {items.map((t) => <li key={t}>· {t}</li>)}
      </ul>
    </div>
  );
}

/* ============================================================
 * ABOUT · Built to Expand · BBC 365
 * ============================================================ */
function DemoAbout() {
  return (
    <>
      <ProfileHeader />

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-about-expand">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#B76E79]" />
            <div className="overline text-[#8E4E5A]">Built to expand</div>
          </div>
          <p className="mt-3 text-sm text-slate-800 leading-relaxed">
            The same engine that generated Jordan's reentry Blueprint can
            generate a different Blueprint for a family after a disaster, a
            person exiting long-term treatment, or a young adult exiting
            foster care.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
            {[
              "Same underlying engine",
              "Different starting circumstances",
              "Different Blueprint",
              "Different resources",
              "Different pathway",
            ].map((t) => (
              <div key={t} className="flex items-center gap-2 rounded-lg bg-[#FBF3E9] border border-[#E4CDBF] px-3 py-2 text-[#1B1033]">
                <Check className="w-4 h-4 text-[#4a2a5a]" /> {t}
              </div>
            ))}
          </div>
          <div className="mt-3 text-[11px] italic text-slate-500">
            Arkansas-first reentry pathway inspired by the mission and work of
            Restore Hope and 10:33. A Path Forward is not owned, operated, or
            formally endorsed by either.
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-[#E4CDBF] p-5" data-testid="demo-about-ecosystem">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#B76E79]" />
            <div className="overline text-[#8E4E5A]">The ecosystem</div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <img src={BRAND_IMG} alt="A Path Forward — Reentry · Transformation"
              className="w-20 h-20 rounded-xl shadow-md" />
            <div>
              <div className="font-display text-lg text-[#1B1033] leading-tight">A Path Forward</div>
              <div className="text-xs text-slate-500">by Beautifully Brokered Consulting · Part of the BBC 365 ecosystem</div>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm">
            <li className="rounded-lg border border-slate-100 p-3">
              <div className="font-medium text-[#1B1033]">Build My Blueprint™</div>
              <div className="text-xs text-slate-600">The broader ecosystem — long-term independence and household organization.</div>
            </li>
            <li className="rounded-lg border-2 border-[#B76E79] p-3 bg-[#FBF3E9]">
              <div className="font-medium text-[#4a2a5a]">A Path Forward <span className="text-[10px] font-bold uppercase tracking-widest bg-[#B76E79] text-white px-1.5 py-0.5 rounded-full ml-1">You are here</span></div>
              <div className="text-xs text-slate-600">The specialized starting-over pathway. Currently focused on Arkansas reentry.</div>
            </li>
            <li className="rounded-lg border border-slate-100 p-3">
              <div className="font-medium text-[#1B1033]">Beginner Blueprint™</div>
              <div className="text-xs text-slate-500">A developing youth-focused pathway.</div>
            </li>
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl p-5 md:p-6 text-white"
        style={{ background: "linear-gradient(135deg, #2B1440 0%, #4a2a5a 60%, #B76E79 100%)" }}>
        <div className="overline text-[#F5D28F]">The bottom line</div>
        <p className="mt-2 max-w-3xl leading-relaxed">
          A Path Forward isn't another list of resources. It turns fragmented
          needs, information, education, documents, and resources into an
          individualized pathway forward.
        </p>
      </div>
    </>
  );
}

/* ============================================================
 * ROOT
 * ============================================================ */
export default function DemoApp() {
  return (
    <div className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 500px at -10% -20%, #F3E1D8 0%, transparent 60%), " +
          "radial-gradient(1000px 500px at 110% 10%, #EED2E0 0%, transparent 55%), " +
          "linear-gradient(180deg, #FBF7F2 0%, #F6EEE4 100%)",
      }}>
      <DemoBanner />
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
        <DemoNav />
        <Routes>
          <Route index element={<DemoOverview />} />
          <Route path="blueprint" element={<DemoBlueprint />} />
          <Route path="vault"     element={<DemoVault />} />
          <Route path="bridge"    element={<DemoBridge />} />
          <Route path="learn"     element={<DemoLearn />} />
          <Route path="resources" element={<DemoResources />} />
          <Route path="progress"  element={<DemoProgress />} />
          <Route path="about"     element={<DemoAbout />} />
        </Routes>
      </div>
    </div>
  );
}
