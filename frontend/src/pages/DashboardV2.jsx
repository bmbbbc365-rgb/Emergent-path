import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { SECTIONS, SECTION_BY_KEY } from "@/lib/sections";
import { ACCENT } from "@/lib/doorways";
import { ProgressBar } from "@/components/Bits";
import AffirmationCard from "@/components/AffirmationCard";
import ParticipantAlerts from "@/components/ParticipantAlerts";
import JourneyStrip from "@/components/journey/JourneyStrip";
import WelcomeModal from "@/components/journey/WelcomeModal";
import BlueprintDoor from "@/components/journey/BlueprintDoor";
import JourneyKey from "@/components/journey/JourneyKey";
import {
  ArrowRight, Calendar, Target, Sparkles, Bot, ClipboardList,
  Trophy, Compass, Clock, KeyRound,
} from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardV2() {
  const nav = useNavigate();
  const [me, setMe] = useState(null);
  const [dash, setDash] = useState(null);
  const [ereadiness, setEreadiness] = useState(null);
  const [actions, setActions] = useState([]);
  const [visits, setVisits] = useState([]);
  const [journey, setJourney] = useState(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => { (async () => {
    try {
      const [m, d, e, a, v, j] = await Promise.all([
        api.get("/auth/me").then(r => r.data),
        api.get("/dashboard/summary").then(r => r.data),
        api.get("/ereadiness/progress").then(r => r.data).catch(() => null),
        api.get("/action-map").then(r => r.data).catch(() => []),
        api.get("/hub-visits/recent").then(r => r.data.visits).catch(() => []),
        api.get("/journey/state").then(r => r.data).catch(() => null),
      ]);
      const seen = new Set();
      const uniqV = (v || []).filter((x) => {
        if (!x?.key || seen.has(x.key)) return false;
        seen.add(x.key); return true;
      });
      setMe(m); setDash(d); setEreadiness(e); setActions(a); setVisits(uniqV);
      setJourney(j);
      // Auto-open welcome modal once, after Blueprint completion.
      if (j && j.signals?.blueprint_completed && !j.state?.welcome_seen) {
        setWelcomeOpen(true);
      }
    } catch {}
  })(); }, []);

  const dismissWelcome = async () => {
    setWelcomeOpen(false);
    try {
      const { data } = await api.post("/journey/welcome-seen", { seen: true });
      setJourney(data);
    } catch {}
  };

  const firstName = useMemo(() => (me?.name || "").split(" ")[0] || "there", [me]);
  const topAction = useMemo(() => actions.find((a) => !a.declined && a.status !== "completed" && (a.priority || 0) >= 3) ||
                                   actions.find((a) => !a.declined && a.status !== "completed"), [actions]);
  const smallWins = useMemo(() => actions.filter((a) => a.status === "completed").slice(0, 3), [actions]);

  if (!dash) return <div className="text-slate-500">Loading your Blueprint…</div>;

  return (
    <div className="space-y-6" data-testid="dashboard-v2">
      <ParticipantAlerts />

      <WelcomeModal open={welcomeOpen} onBegin={dismissWelcome} />

      <div className="rounded-3xl px-6 md:px-8 py-6 md:py-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #2B1440 0%, #4a2a5a 55%, #B76E79 100%)",
        }}>
        <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%)" }} />
        <div className="overline text-[#F3E1D8]/80">A Path Forward · My Blueprint</div>
        <h1 className="font-display text-3xl md:text-4xl text-white mt-1">
          {greeting()}, {firstName}.
        </h1>
        <p className="text-[#F3E1D8]/90 mt-2 max-w-xl leading-relaxed">
          One step today still moves you forward. Here's where you left off and what deserves your attention.
        </p>
      </div>

      {/* Journey strip — always visible, shows the 5-stage story */}
      {journey && (
        <JourneyStrip
          stage={journey.stage}
          welcomeSeen={journey.state?.welcome_seen}
          onOpenJourney={() => nav("/app/journey")} />
      )}

      {/* Graduation celebration card — replaces standard focus if graduated */}
      {journey?.state?.graduation_approved && (
        <GraduationDashboardCard onOpen={() => nav("/app/journey")} />
      )}

      <AffirmationCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Today's Focus */}
        <div className="lg:col-span-2 bmb-card p-5 md:p-6" data-testid="dash-today-focus">
          <div className="flex items-start justify-between">
            <div>
              <div className="overline">Today's focus</div>
              <div className="font-display text-xl text-[#1B1033] mt-1">
                {topAction ? topAction.title : "Nothing high-priority — pick where to work"}
              </div>
              {topAction?.why_personal || topAction?.why ? (
                <p className="text-sm text-slate-600 mt-2 max-w-lg">{topAction.why_personal || topAction.why}</p>
              ) : (
                <p className="text-sm text-slate-600 mt-2 max-w-lg">
                  Open your Living Blueprint or start any doorway below.
                </p>
              )}
            </div>
            <Compass className="w-5 h-5 text-[#B76E79]" />
          </div>
          <div className="mt-4 flex gap-2">
            {topAction?.route
              ? <button onClick={() => nav(topAction.route)}
                  className="rounded-full bg-[#4a2a5a] hover:bg-[#3a1e4a] text-white px-4 py-2 text-sm inline-flex items-center gap-2"
                  data-testid="dash-focus-open">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              : <Link to="/app/blueprint"
                  className="rounded-full bg-[#4a2a5a] hover:bg-[#3a1e4a] text-white px-4 py-2 text-sm inline-flex items-center gap-2">
                  Open my Living Blueprint <ArrowRight className="w-4 h-4" />
                </Link>}
          </div>
        </div>

        {/* Full Blueprint / Assessments quick access */}
        <div className="rounded-2xl p-5 md:p-6 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #FBF3E9 0%, #EED2E0 100%)", border: "1px solid #E4CDBF" }}
          data-testid="dash-blueprint-cta">
          <div className="overline text-[#8E4E5A]">The Full Blueprint</div>
          <div className="font-display text-lg text-[#1B1033] mt-1">
            A deeper 30-question look at where you stand.
          </div>
          <p className="text-xs text-slate-600 mt-1">Saves automatically. Come back anytime.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/app/blueprint/intake"
              className="rounded-full bg-[#4a2a5a] hover:bg-[#3a1e4a] text-white px-3.5 py-1.5 text-xs inline-flex items-center gap-1"
              data-testid="dash-open-fbp">
              <Sparkles className="w-3 h-3" /> Start / continue
            </Link>
            <Link to="/app/assessments"
              className="rounded-full bg-white hover:bg-slate-50 text-[#4a2a5a] border border-[#4a2a5a]/30 px-3.5 py-1.5 text-xs inline-flex items-center gap-1"
              data-testid="dash-open-assess">
              <ClipboardList className="w-3 h-3" /> Assessments
            </Link>
          </div>
        </div>
      </div>

      {/* Continue where you left off */}
      {visits.length > 0 && (
        <div className="bmb-card p-5 md:p-6" data-testid="dash-continue">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#4a2a5a]" />
            <div className="overline">Continue where you left off</div>
          </div>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {visits.map((v) => (
              <button key={v.key} onClick={() => nav(v.route)}
                className="text-left border border-slate-100 hover:border-[#B76E79] rounded-xl p-3 transition"
                data-testid={`dash-visit-${v.key}`}>
                <div className="text-xs text-slate-500">Last visited</div>
                <div className="font-medium text-sm text-[#1B1033] mt-0.5">{v.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sections — colored accents */}
      <div>
        <div className="overline mb-3">Blueprint sections</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {SECTIONS.map((sec) => {
            const p = (dash.section_progress || {})[sec.key] || { pct: 0, done: 0, total: 0 };
            const Icon = sec.icon;
            const color = accentFor(sec.key);
            return (
              <Link key={sec.key} to={`/app/section/${sec.key}`}
                className="rounded-2xl p-5 block bg-white border-l-4 hover:-translate-y-0.5 transition-transform"
                style={{ borderLeftColor: color, boxShadow: "0 1px 3px rgba(27,16,51,0.06)" }}
                data-testid={`v2-section-${sec.key}`}>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}18`, color }}>
                    <Icon className="w-5 h-5" />
                  </div>
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
      </div>

      {/* Small wins */}
      {smallWins.length > 0 && (
        <div className="bmb-card p-5 md:p-6" data-testid="dash-small-wins">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[#B5851F]" />
            <div className="overline">Small wins</div>
          </div>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            {smallWins.map((w) => <li key={w.id}>• {w.title}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function accentFor(sectionKey) {
  if (sectionKey === "documents" || sectionKey === "identity") return ACCENT.identity;
  if (sectionKey === "home-hub" || sectionKey === "independent-living") return ACCENT.housing;
  if (sectionKey === "health-hub") return ACCENT.health;
  if (sectionKey === "employment-record" || sectionKey === "employment-readiness") return ACCENT.employment;
  if (sectionKey === "benefits-hub") return ACCENT.benefits;
  if (sectionKey === "wellness") return ACCENT.wellness;
  if (sectionKey === "support-circle") return ACCENT.support;
  if (sectionKey === "requirements") return ACCENT.compliance;
  if (sectionKey === "life-skills") return ACCENT.life;
  return ACCENT.identity;
}

function GraduationDashboardCard({ onOpen }) {
  return (
    <div
      className="rounded-3xl p-5 md:p-7 relative overflow-hidden cursor-pointer group"
      onClick={onOpen}
      style={{
        background:
          "radial-gradient(500px 220px at 90% -20%, #F5D28F66 0%, transparent 60%), " +
          "linear-gradient(135deg, #FBF3E9 0%, #EED2E0 60%, #DCEDE8 100%)",
        border: "1px solid #E4CDBF",
      }}
      data-testid="dash-graduation-card">
      <div className="flex items-center gap-4">
        <JourneyKey size={44} tone="gold" glow />
        <div className="flex-1">
          <div className="overline text-[#8E4E5A]">Graduation</div>
          <div className="font-display text-xl md:text-2xl text-[#1B1033] leading-tight mt-1">
            You built the key. The next door is ready.
          </div>
          <p className="text-sm text-slate-700 mt-1">
            Open your journey to see what comes next — on your terms.
          </p>
        </div>
        <ArrowRight className="w-5 h-5 text-[#4a2a5a] group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}
