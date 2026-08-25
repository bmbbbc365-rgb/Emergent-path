import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import {
  ArrowRight, ArrowLeft, Check, Lock, Sparkles, ExternalLink,
  Trophy, Award, Compass, Flag, Star,
} from "lucide-react";
import JourneyKey from "@/components/journey/JourneyKey";
import BlueprintDoor from "@/components/journey/BlueprintDoor";

const BMB_URL = "https://buildmyblueprintbbc.com";

const STAGE_LABELS = {
  enter: "You've entered",
  build: "You're building",
  graduate: "You've graduated",
  unlock: "You've opened the next door",
  expand: "You're expanding",
};

export default function Journey() {
  const nav = useNavigate();
  const [snap, setSnap] = useState(null);
  const [showTransition, setShowTransition] = useState(false);
  const celebratedFiredRef = useRef(false);

  const load = async () => {
    try {
      const { data } = await api.get("/journey/state");
      setSnap(data);
    } catch { toast.error("Could not load journey"); }
  };
  useEffect(() => { load(); }, []);

  // Fire the confetti once — the FIRST time a graduated participant lands on
  // this page. Persist server-side so subsequent visits stay dignified.
  useEffect(() => {
    if (!snap || celebratedFiredRef.current) return;
    const s = snap.state || {};
    if (s.graduation_approved && !s.graduation_celebrated) {
      celebratedFiredRef.current = true;
      fireGoldShimmer();
      // Persist. Silent failure — don't block the reveal.
      api.post("/journey/graduation-celebrated").catch(() => {});
    }
  }, [snap]);

  const openTransition = async () => {
    try {
      const { data } = await api.post("/journey/transition/view");
      setSnap(data);
      setShowTransition(true);
    } catch { toast.error("Something went wrong opening the transition page"); }
  };

  const decide = async (choice) => {
    try {
      const { data } = await api.post("/journey/transition/interest", { choice });
      setSnap(data);
      if (choice === "interested") {
        toast.success("Noted. When Build My Blueprint™ is ready for you, we'll help you continue.");
      } else {
        toast("That's okay. This door isn't going anywhere.");
      }
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not record your choice");
    }
  };

  if (!snap) return <div className="text-slate-500">Loading your journey…</div>;

  const { state, signals, stage } = snap;
  const graduated = !!state.graduation_approved;

  // If graduated & they've viewed the transition and are inside the transition page
  if (showTransition && graduated) {
    return <TransitionPage state={state} onBack={() => setShowTransition(false)} onDecide={decide} />;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="journey-page">
      {/* Hero */}
      <div className="rounded-3xl px-6 md:px-10 py-8 md:py-10 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(700px 320px at 90% -10%, #B5851F55 0%, transparent 60%), " +
            "linear-gradient(135deg, #2B1440 0%, #4a2a5a 55%, #B76E79 100%)",
        }}>
        <div className="flex items-center gap-3">
          <JourneyKey size={40} tone="gold" glow />
          <div className="overline text-[#F5D28F]">Your Path Forward</div>
        </div>
        <h1 className="font-display text-3xl md:text-5xl text-white mt-3 leading-tight">
          {graduated
            ? "You built the key."
            : "You're on the path. Every choice moves you forward."}
        </h1>
        <p className="text-[#F3E1D8] mt-3 max-w-2xl leading-relaxed">
          {graduated
            ? "You entered A Path Forward with a blueprint. Since then, you've learned, organized, worked, completed activities, overcome obstacles, and built something that belongs entirely to you — progress."
            : "A Path Forward gave you a place to begin. What you do here builds the tools, the confidence, and — eventually — the key to what comes next."}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/12 text-white px-3 py-1 text-xs uppercase tracking-widest font-semibold">
            {STAGE_LABELS[stage] || stage}
          </span>
          {state.graduation_date && (
            <span className="rounded-full bg-[#F5D28F] text-[#1B1033] px-3 py-1 text-xs font-semibold">
              Graduated {new Date(state.graduation_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>

      {/* Progress evidence */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <EvidenceTile label="Blueprint"
          value={signals.blueprint_completed ? "Complete" : `${signals.blueprint_pct}%`}
          done={signals.blueprint_completed} icon={Compass} />
        <EvidenceTile label="Assessments"
          value={`${signals.assessments_completed}/${signals.assessments_total}`}
          done={signals.assessments_completed >= signals.assessments_total} icon={Star} />
        <EvidenceTile label="Employment Ready"
          value={`${signals.ereadiness_pct}%`}
          done={signals.ereadiness_pct >= 80} icon={Award} />
        <EvidenceTile label="Action items"
          value={`${signals.action_items_completed}/${signals.action_items_total || 0}`}
          done={signals.action_items_total > 0 && signals.action_items_completed >= signals.action_items_total} icon={Flag} />
      </div>

      {/* Milestones */}
      {(state.milestones || []).length > 0 && (
        <div className="bmb-card p-5 md:p-6">
          <div className="overline text-[#8E4E5A]">Milestones your team has recognized</div>
          <div className="mt-3 space-y-2">
            {state.milestones.map((m) => (
              <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#FBF3E9] border border-[#E4CDBF]"
                data-testid={`journey-milestone-${m.id}`}>
                <Trophy className="w-4 h-4 text-[#B5851F] mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="font-medium text-[#1B1033]">{m.label}</div>
                  {m.note && <div className="text-xs text-slate-600 mt-0.5">{m.note}</div>}
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(m.added_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Celebration + Door — only shown after graduation */}
      {graduated ? (
        <GraduationCelebration onOpenTransition={openTransition} />
      ) : (
        <LockedDoorSection stage={stage} />
      )}

      <div className="text-center text-xs text-slate-500 italic">
        A Path Forward helps you get started. Build My Blueprint™ helps you keep building.
      </div>
    </div>
  );
}

function EvidenceTile({ label, value, done, icon: Icon }) {
  return (
    <div className={`rounded-2xl p-4 border ${done ? "border-[#B5851F]/40 bg-[#FBF3E9]" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${done ? "bg-[#B5851F]/15 text-[#8E6B1A]" : "bg-slate-100 text-slate-500"}`}>
          <Icon className="w-4 h-4" />
        </div>
        {done && <Check className="w-4 h-4 text-[#B5851F]" />}
      </div>
      <div className="mt-2 text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className="font-display text-xl text-[#1B1033]">{value}</div>
    </div>
  );
}

function GraduationCelebration({ onOpenTransition }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="rounded-3xl p-6 md:p-10 relative overflow-hidden"
      style={{
        background:
          "radial-gradient(600px 260px at 10% 110%, #4E8C8655 0%, transparent 60%), " +
          "radial-gradient(600px 260px at 90% -20%, #F5D28F55 0%, transparent 60%), " +
          "linear-gradient(135deg, #FBF3E9 0%, #EED2E0 60%, #DCEDE8 100%)",
        border: "1px solid #E4CDBF",
      }}
      data-testid="graduation-celebration">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div>
          <div className="overline text-[#8E4E5A]">Graduation</div>
          <h2 className="font-display text-3xl md:text-4xl text-[#1B1033] mt-2 leading-tight">
            You built the key.<br />Now open the next door.
          </h2>
          <p className="text-slate-700 mt-4 leading-relaxed max-w-md">
            Your 10:33-sponsored A Path Forward journey may be reaching completion.
            But your blueprint doesn't have to end here. You get to decide what happens next.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <button onClick={onOpenTransition}
              className="rounded-full text-white px-5 py-2.5 text-sm font-semibold inline-flex items-center gap-2 shadow-lg hover:opacity-95"
              style={{ background: "linear-gradient(120deg, #4a2a5a, #B76E79)" }}
              data-testid="grad-see-whats-next">
              See what's next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-4 text-xs text-[#5C3D48] italic max-w-md">
            You forged the key to break your chains; now cross the bridge to conquer your future. Step through—you earned this horizon.
          </p>
        </div>
        <div className="flex items-center justify-center">
          <BlueprintDoor unlocked={true} onUnlock={onOpenTransition} variant="hero" />
        </div>
      </div>
    </motion.div>
  );
}

function LockedDoorSection({ stage }) {
  return (
    <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FBF7F2 0%, #F3E1D8 100%)",
        border: "1px solid #E4CDBF",
      }}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div>
          <div className="overline text-[#8E4E5A]">A door for later</div>
          <h2 className="font-display text-2xl md:text-3xl text-[#1B1033] mt-2 leading-tight">
            Something is waiting for you.
          </h2>
          <p className="text-slate-700 mt-3 leading-relaxed max-w-md">
            When you complete your A Path Forward journey and your team recognizes
            you're ready, this door will unlock — and you'll be introduced to
            Build My Blueprint™, an expanded experience for long-term independence.
          </p>
          <div className="mt-4 rounded-xl bg-white border border-[#E4CDBF] p-4">
            <div className="flex items-center gap-2 text-[#8E4E5A] text-xs font-semibold uppercase tracking-wider">
              <Lock className="w-3.5 h-3.5" /> Unlock conditions
            </div>
            <ul className="mt-2 text-sm text-slate-700 space-y-1">
              <li>· Complete your program milestones</li>
              <li>· Your team confirms you're ready</li>
              <li>· You decide when — and whether — to open it</li>
            </ul>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <BlueprintDoor unlocked={false} variant="hero" />
        </div>
      </div>
    </div>
  );
}

function TransitionPage({ state, onBack, onDecide }) {
  const decided = state.interested_in_continuing !== null;
  const choice = state.interested_in_continuing;

  return (
    <div className="max-w-4xl mx-auto space-y-6" data-testid="transition-page">
      <button onClick={onBack}
        className="text-sm text-[#4a2a5a] inline-flex items-center gap-1 hover:text-[#1B1033]"
        data-testid="transition-back">
        <ArrowLeft className="w-4 h-4" /> Back to my journey
      </button>

      <div className="rounded-3xl p-6 md:p-10 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(600px 260px at 90% -20%, #F5D28F55 0%, transparent 60%), " +
            "linear-gradient(135deg, #2B1440 0%, #4a2a5a 50%, #7C4E80 100%)",
        }}>
        <div className="flex items-center gap-3">
          <JourneyKey size={36} tone="gold" glow />
          <div className="overline text-[#F5D28F]">The next chapter</div>
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-white mt-3 leading-tight max-w-2xl">
          Build More Than a Path. Build Your Life.
        </h1>
        <p className="text-[#F3E1D8] mt-4 max-w-2xl leading-relaxed">
          Build My Blueprint™ takes the foundation you started here and gives you
          the opportunity to continue organizing, learning, planning, and building
          beyond reentry. When appropriate, this expanded experience can grow beyond
          you and into your household and family.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard eyebrow="Sponsored access ends" title="Your A Path Forward experience"
          body="Your 10:33-sponsored A Path Forward journey has reached completion. Nothing you built here is being taken away." />
        <InfoCard eyebrow="Separate platform" title="Build My Blueprint™"
          body="BMB™ is a separate, expanded experience for long-term independence and — when appropriate — for your household." />
        <InfoCard eyebrow="Your choice" title="Continue on your own terms"
          body="Continuing may require assuming responsibility for your own subscription after sponsored access. Nothing is automatic." />
      </div>

      <div className="bmb-card p-5 md:p-6">
        <div className="overline text-[#8E4E5A]">What you should know before deciding</div>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li className="flex gap-2"><Check className="w-4 h-4 text-[#4E8C86] mt-0.5 shrink-0" />
            Build My Blueprint™ is not part of A Path Forward. It's a separate application.</li>
          <li className="flex gap-2"><Check className="w-4 h-4 text-[#4E8C86] mt-0.5 shrink-0" />
            You will not be automatically enrolled or charged for anything. If you continue,
            you'll go through Build My Blueprint's own signup.</li>
          <li className="flex gap-2"><Check className="w-4 h-4 text-[#4E8C86] mt-0.5 shrink-0" />
            Family/household expansion lives inside Build My Blueprint™, not here.</li>
          <li className="flex gap-2"><Check className="w-4 h-4 text-[#4E8C86] mt-0.5 shrink-0" />
            You can say "not right now" — this door isn't going anywhere.</li>
        </ul>

        <a href={BMB_URL} target="_blank" rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-2 text-[#4a2a5a] hover:text-[#1B1033] text-sm font-medium"
          data-testid="transition-bmb-link">
          Visit buildmyblueprintbbc.com <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      <div className="rounded-2xl p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between"
        style={{
          background: "linear-gradient(135deg, #FBF3E9 0%, #EED2E0 100%)",
          border: "1px solid #E4CDBF",
        }}>
        <div>
          <div className="font-display text-lg text-[#1B1033]">Are you ready to continue?</div>
          <p className="text-sm text-slate-600 mt-1">Recording your interest doesn't sign you up for anything. It helps us support your next step.</p>
          {decided && (
            <div className="mt-2 text-xs text-[#4a2a5a] font-semibold">
              Currently recorded: {choice ? "Interested in continuing" : "Not right now"}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button onClick={() => onDecide("interested")}
            className="rounded-full text-white px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
            style={{ background: "linear-gradient(120deg, #4a2a5a, #B76E79)" }}
            data-testid="transition-interested">
            <Sparkles className="w-4 h-4" /> I'm interested
          </button>
          <button onClick={() => onDecide("not_now")}
            className="rounded-full bg-white text-[#4a2a5a] border border-[#4a2a5a]/30 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            data-testid="transition-not-now">
            Not right now
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-500 italic">
        You forged the key to break your chains; now cross the bridge to conquer your future. Step through—you earned this horizon.
      </div>
    </div>
  );
}

function InfoCard({ eyebrow, title, body }) {
  return (
    <div className="rounded-2xl bg-white border border-[#E4CDBF] p-4">
      <div className="overline text-[#8E4E5A]">{eyebrow}</div>
      <div className="font-display text-lg text-[#1B1033] mt-1">{title}</div>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{body}</p>
    </div>
  );
}

/**
 * Subtle, dignified gold shimmer — a small burst of warm gold and cream
 * particles from just above the "You built the key." hero. Runs ~1.4s.
 * Uses `canvas-confetti` — creates its own transient canvas, no DOM cleanup.
 */
function fireGoldShimmer() {
  const GOLDS = ["#F5D28F", "#D4AF37", "#F3E1D8", "#EED2E0", "#FBF3E9"];
  const defaults = {
    startVelocity: 32,
    spread: 70,
    ticks: 220,
    gravity: 0.7,
    scalar: 0.9,
    disableForReducedMotion: true, // honor OS reduced-motion setting
    colors: GOLDS,
  };
  // Center burst
  confetti({ ...defaults, particleCount: 70, origin: { x: 0.5, y: 0.25 } });
  // Left and right side sparkles a moment later
  window.setTimeout(() => {
    confetti({ ...defaults, particleCount: 35, angle: 60, origin: { x: 0.15, y: 0.3 } });
    confetti({ ...defaults, particleCount: 35, angle: 120, origin: { x: 0.85, y: 0.3 } });
  }, 220);
}
