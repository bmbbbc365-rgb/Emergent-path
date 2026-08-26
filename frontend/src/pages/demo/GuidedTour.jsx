import React, { useEffect, useState } from "react";
import { Sparkles, ArrowRight, X } from "lucide-react";

/**
 * 60-second guided tour for the public demo.
 * Skippable, single-visit (localStorage flag "apf_demo_tour_seen_v1").
 * Highlights the FOUR pillars of the demo: Starting Point → Blueprint →
 * Action/Resources → Progress/Bridge.
 *
 * Renders as a fixed overlay with a narrow card + spotlight. It does NOT
 * redesign the demo; it only overlays and steps through anchors.
 */
const STEPS = [
  {
    anchor: null, // opening card, centered
    eyebrow: "Welcome to the demo",
    title: "60-second tour",
    body:
      "Meet Jordan Carter. In under a minute you'll see how A Path Forward turns a starting point into a personalized pathway — Blueprint, Bridge AI, resources, and progress.",
    cta: "Start the tour",
  },
  {
    anchor: '[data-testid="demo-flow-strip"]',
    eyebrow: "01 · Starting point",
    title: "Where am I now?",
    body:
      "Every A Path Forward journey starts with the participant's real starting point. Barriers, strengths, and situation — not a generic checklist.",
    cta: "Show the Blueprint",
  },
  {
    anchor: '[data-testid="demo-nav-blueprint"]',
    route: "/demo/blueprint",
    eyebrow: "02 · Personalized Blueprint",
    title: "Priorities ranked by leverage",
    body:
      "Jordan's Blueprint is reordered by what actually unblocks the most next steps. Change the inputs and the Blueprint changes — same engine, different pathway.",
    cta: "See action + resources",
  },
  {
    anchor: '[data-testid="demo-nav-resources"]',
    route: "/demo/resources",
    eyebrow: "03 · Action + Resources",
    title: "Barriers mapped to real help",
    body:
      "Not a directory. Each barrier is mapped to the two or three resources that actually fit — with Learn → Do → Track → Get Help woven in.",
    cta: "See progress + Bridge",
  },
  {
    anchor: '[data-testid="demo-nav-bridge"]',
    route: "/demo/bridge",
    eyebrow: "04 · Progress + Bridge AI",
    title: "Bridge knows the whole plan",
    body:
      "Bridge AI answers using Jordan's live Blueprint, Vault, and progress — not a generic chatbot. Try the suggested questions on the Bridge page.",
    cta: "Explore on my own",
  },
];

const KEY = "apf_demo_tour_seen_v1";

export default function GuidedTour({ open, onClose, navigateTo }) {
  const [i, setI] = useState(0);
  const step = STEPS[i];
  const [rect, setRect] = useState(null);

  // Reposition spotlight over the anchor
  useEffect(() => {
    if (!open) return;
    if (!step.anchor) { setRect(null); return; }
    // Wait a frame for route change to settle
    const id = window.requestAnimationFrame(() => {
      const el = document.querySelector(step.anchor);
      if (el) {
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        window.setTimeout(() => {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        }, 220);
      } else { setRect(null); }
    });
    return () => window.cancelAnimationFrame(id);
  }, [i, open, step]);

  // Recompute on resize/scroll while open
  useEffect(() => {
    if (!open || !step.anchor) return;
    const recompute = () => {
      const el = document.querySelector(step.anchor);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
      }
    };
    window.addEventListener("resize", recompute);
    window.addEventListener("scroll", recompute, true);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("scroll", recompute, true);
    };
  }, [i, open, step]);

  if (!open) return null;

  const close = (markSeen = true) => {
    if (markSeen) { try { localStorage.setItem(KEY, "1"); } catch {} }
    setI(0);
    onClose?.();
  };

  const next = () => {
    if (i >= STEPS.length - 1) return close(true);
    const nxt = STEPS[i + 1];
    if (nxt.route) navigateTo?.(nxt.route);
    setI(i + 1);
  };

  const pad = 8;

  return (
    <div className="fixed inset-0 z-[100]" data-testid="demo-tour">
      {/* Dim backdrop with a spotlight hole */}
      <div className="absolute inset-0 bg-[#1B1033]/70 backdrop-blur-[1px]"
        style={rect ? {
          clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0,
            ${rect.left - pad}px ${rect.top - pad}px,
            ${rect.left - pad}px ${rect.top + rect.height + pad}px,
            ${rect.left + rect.width + pad}px ${rect.top + rect.height + pad}px,
            ${rect.left + rect.width + pad}px ${rect.top - pad}px,
            ${rect.left - pad}px ${rect.top - pad}px)`,
        } : undefined}
        onClick={() => close(true)}
      />
      {/* Highlight border for the spotlight */}
      {rect && (
        <div className="absolute pointer-events-none rounded-2xl border-2 border-[#F5D28F] shadow-[0_0_0_4px_rgba(245,210,143,0.35)]"
          style={{ top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      )}

      {/* Card */}
      <div className={`absolute z-10 ${rect ? "" : "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"}`}
        style={rect ? cardPositionFor(rect) : undefined}>
        <div className="w-[min(92vw,380px)] rounded-2xl bg-white border border-[#E4CDBF] shadow-2xl overflow-hidden">
          <div className="px-5 py-4 relative"
            style={{ background: "linear-gradient(135deg, #4a2a5a 0%, #B76E79 100%)" }}>
            <button onClick={() => close(true)}
              className="absolute top-2 right-2 text-white/80 hover:text-white"
              data-testid="demo-tour-close" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[#F5D28F]">
              <Sparkles className="w-4 h-4" />
              <div className="overline">{step.eyebrow}</div>
            </div>
            <div className="font-display text-white text-lg mt-1 leading-tight">{step.title}</div>
          </div>
          <div className="p-5">
            <p className="text-sm text-slate-700 leading-relaxed">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1">
                {STEPS.map((_, k) => (
                  <span key={k}
                    className={`w-1.5 h-1.5 rounded-full ${k === i ? "bg-[#4a2a5a]" : "bg-slate-300"}`} />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => close(true)}
                  className="text-xs text-slate-500 hover:text-[#4a2a5a] px-2 py-1"
                  data-testid="demo-tour-skip">
                  Skip
                </button>
                <button onClick={next}
                  className="rounded-full text-white text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1"
                  style={{ background: "linear-gradient(120deg, #4a2a5a, #B76E79)" }}
                  data-testid="demo-tour-next">
                  {i === STEPS.length - 1 ? "Done" : step.cta} <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Anchor the tour card near the spotlight without overflowing the viewport. */
function cardPositionFor(rect) {
  const cardW = 380, cardH = 190, gap = 14;
  const vw = window.innerWidth, vh = window.innerHeight;
  // Prefer below the anchor; fall back above; then to the side if near bottom.
  let top = rect.top + rect.height + gap;
  let left = Math.min(vw - cardW - 12, Math.max(12, rect.left));
  if (top + cardH > vh - 12) {
    // Try above
    const above = rect.top - cardH - gap;
    if (above > 12) top = above;
    else top = Math.max(12, vh - cardH - 12);
  }
  return { top, left };
}

export function hasSeenDemoTour() {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}
export function resetDemoTour() {
  try { localStorage.removeItem(KEY); } catch {}
}
