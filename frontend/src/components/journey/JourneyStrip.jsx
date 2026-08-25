import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Lock, Check, Sparkles } from "lucide-react";
import JourneyKey from "./JourneyKey";

const STAGES = [
  {
    key: "enter",
    eyebrow: "01 · Enter",
    title: "A Path Forward",
    body: "Your journey begins here. Organize what matters, find resources, and start creating your plan.",
    gradient: "linear-gradient(150deg, #7A3A47 0%, #B76E79 100%)",
    accent: "#F5D0BF",
  },
  {
    key: "build",
    eyebrow: "02 · Build",
    title: "Build Toward Independence",
    body: "Every step matters. Take your classes, organize your documents, and grow the tools you need.",
    gradient: "linear-gradient(150deg, #4a2a5a 0%, #7C4E80 100%)",
    accent: "#EED2E0",
  },
  {
    key: "graduate",
    eyebrow: "03 · Graduate",
    title: "Complete Your Path",
    body: "Reach your program milestones. Your accomplishments become something you can actually see and celebrate.",
    gradient: "linear-gradient(150deg, #2B5F5A 0%, #4E8C86 100%)",
    accent: "#DCEDE8",
  },
  {
    key: "unlock",
    eyebrow: "04 · Unlock",
    title: "The Next Door Opens",
    body: "Graduation means you're ready to decide what happens next. You built the key.",
    gradient: "linear-gradient(150deg, #6A4E1B 0%, #B5851F 100%)",
    accent: "#F5E4B8",
  },
  {
    key: "expand",
    eyebrow: "05 · Expand",
    title: "Build More Than a Path",
    body: "Build My Blueprint™ carries the foundation forward — for you, and when appropriate, your family.",
    gradient: "linear-gradient(150deg, #1B4A5A 0%, #3B7A8A 100%)",
    accent: "#CDE5EE",
  },
];

export default function JourneyStrip({ stage, welcomeSeen, onOpenJourney }) {
  const activeIdx = Math.max(0, STAGES.findIndex((s) => s.key === stage));

  return (
    <div className="rounded-3xl p-5 md:p-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #FBF3E9 0%, #F3E1D8 50%, #EED2E0 100%)",
        border: "1px solid #E4CDBF",
      }}
      data-testid="journey-strip">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <JourneyKey size={40} tone="gold" glow />
          <div>
            <div className="overline text-[#8E4E5A]">The Journey · A Path Forward</div>
            <div className="font-display text-lg md:text-xl text-[#1B1033] leading-tight">
              Enter → Build → Graduate → Unlock → Expand
            </div>
          </div>
        </div>
        <button
          onClick={onOpenJourney}
          className="hidden md:inline-flex text-xs font-medium text-[#4a2a5a] hover:text-[#1B1033] items-center gap-1"
          data-testid="journey-strip-open">
          Open my journey <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory -mx-1 px-1 thin-scroll">
        {STAGES.map((s, i) => {
          const isActive = i === activeIdx;
          const isDone = i < activeIdx;
          const isLocked = i > activeIdx;
          return (
            <div
              key={s.key}
              className={`snap-start shrink-0 w-[78%] sm:w-[52%] md:w-[30%] rounded-2xl p-4 md:p-5 relative overflow-hidden transition-all ${isActive ? "ring-2 ring-[#D4AF37] shadow-lg scale-[1.01]" : "opacity-95"}`}
              style={{ background: s.gradient, minHeight: 200 }}
              data-testid={`journey-stage-${s.key}`}>
              <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: `radial-gradient(circle, ${s.accent}55 0%, transparent 70%)` }} />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold tracking-[0.18em] uppercase"
                  style={{ color: s.accent }}>{s.eyebrow}</span>
                {isActive && <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-[#1B1033] bg-[#F5D28F] px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" /> Now
                </span>}
                {isDone && <Check className="w-3.5 h-3.5 text-white/90" />}
                {isLocked && <Lock className="w-3.5 h-3.5 text-white/50" />}
              </div>
              <div className="font-display text-lg text-white mt-2 leading-tight">{s.title}</div>
              <p className="text-xs md:text-sm mt-2 leading-relaxed" style={{ color: s.accent }}>
                {s.body}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#5C3D48] italic max-w-lg">
          The door is here. <span className="font-semibold text-[#4a2a5a]">The key belongs to you.</span>
        </p>
        <button
          onClick={onOpenJourney}
          className="md:hidden text-xs font-medium text-[#4a2a5a] inline-flex items-center gap-1"
          data-testid="journey-strip-open-mobile">
          Open my journey <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
