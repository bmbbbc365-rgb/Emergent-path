import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import {
  ArrowLeft, ArrowRight, Lightbulb, MapPin, Bookmark, BookmarkCheck,
  ExternalLink, ShieldAlert, Phone,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Batch B — Category deep pages
 * Route: /app/resources/category/:category
 * Surfaces LEARN resources for a category + a clear Find Support CTA into the
 * matching Arkansas 211 / national support rail. No dead ends.
 */
const CATEGORIES = {
  emergency: {
    label: "Emergency & Safety",
    eyebrow: "If life is at risk, call 911. If in crisis, call 988.",
    hero_body:
      "Learn basic first aid, build a 72-hour go-bag, and know exactly who to call before you need them.",
    gradient: "linear-gradient(135deg, #7A1F2B 0%, #B85A4B 100%)",
    accent: "#B85A4B",
    findhelp_bucket: "emergency",
  },
  financial: {
    label: "Financial Wellness",
    eyebrow: "Money you understand is money you can grow.",
    hero_body:
      "Budgets, banking, credit repair, taxes, identity theft, and free HUD housing counselors — plain-language guides only.",
    gradient: "linear-gradient(135deg, #6A4E1B 0%, #B5851F 100%)",
    accent: "#B5851F",
    findhelp_bucket: "benefits",
  },
  health: {
    label: "Health & Wellness",
    eyebrow: "Your health is not optional — it is how you keep going.",
    hero_body:
      "Coverage basics, immunizations, chronic-condition self-care, and free mental-health screening tools.",
    gradient: "linear-gradient(135deg, #2B5F5A 0%, #4E8C86 100%)",
    accent: "#4E8C86",
    findhelp_bucket: "healthcare",
  },
  recovery: {
    label: "Recovery",
    eyebrow: "Recovery is a health condition, not a character flaw.",
    hero_body:
      "Evidence-based recovery basics, harm reduction, peer community, and the crisis lines that are open right now.",
    gradient: "linear-gradient(135deg, #4a2a5a 0%, #7C4E80 100%)",
    accent: "#7C4E80",
    findhelp_bucket: "recovery",
  },
  employment: {
    label: "Career & Employment",
    eyebrow: "Fair-chance jobs are real. So is the work of getting one.",
    hero_body:
      "Resumes and interviews, career finders, apprenticeships, and reentry-specific federal + Arkansas workforce help.",
    gradient: "linear-gradient(135deg, #1B4A5A 0%, #3B7A8A 100%)",
    accent: "#3B7A8A",
    findhelp_bucket: "employment",
  },
  technology: {
    label: "Technology & Digital Life",
    eyebrow: "The internet is not optional anymore. It is teachable.",
    hero_body:
      "Free digital-literacy courses, scam avoidance, self-checks for your skills, and Google/Microsoft certificate paths.",
    gradient: "linear-gradient(135deg, #2E5266 0%, #5F8CA5 100%)",
    accent: "#5F8CA5",
    findhelp_bucket: null, // no dedicated 211 bucket; still show 211 CTA
  },
};

export default function CategoryHub() {
  const { category } = useParams();
  const nav = useNavigate();
  const meta = CATEGORIES[category];
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    if (!meta) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await api.get("/resources", { params: { category, limit: 100 } });
      setRows(data.resources || []);
    } catch { toast.error("Could not load resources"); }
    finally { setLoading(false); }
  })(); }, [category, meta]);

  if (!meta) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center" data-testid="category-hub-unknown">
        <p className="text-slate-500">Unknown category.</p>
        <Link to="/app/resources" className="text-sm text-[#4a2a5a] underline mt-3 inline-block">
          Back to Resources
        </Link>
      </div>
    );
  }

  const learn = rows.filter((r) => r.kind === "learn");
  const support = rows.filter((r) => r.kind === "support");

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6" data-testid={`category-hub-${category}`}>
      <button onClick={() => nav("/app/resources")}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4"
        data-testid="category-back">
        <ArrowLeft className="w-4 h-4" /> Resources
      </button>

      {/* Hero */}
      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: meta.gradient }}>
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }} />
        <div className="text-[10px] uppercase tracking-[0.18em] font-medium"
          style={{ color: "rgba(243,225,216,0.85)" }}>
          A Path Forward · {meta.label}
        </div>
        <h1 className="font-display text-2xl md:text-4xl text-white mt-1 leading-tight">
          {meta.label}
        </h1>
        <p className="text-[#F3E1D8]/90 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
          {meta.hero_body}
        </p>
        {meta.eyebrow && (
          <p className="text-white/80 italic text-xs md:text-sm mt-2 max-w-2xl">{meta.eyebrow}</p>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => nav("/app/find-help" + (meta.findhelp_bucket ? `?focus=${meta.findhelp_bucket}` : ""))}
            className="rounded-full bg-white/95 text-[#4a2a5a] px-4 py-2 text-sm font-medium inline-flex items-center gap-2 hover:bg-white"
            data-testid="category-find-support">
            <MapPin className="w-4 h-4" /> Find local support in Arkansas
          </button>
          <a href="tel:211"
            className="rounded-full bg-white/20 text-white px-4 py-2 text-sm font-medium inline-flex items-center gap-2 border border-white/40 hover:bg-white/30"
            data-testid="category-call-211">
            <Phone className="w-4 h-4" /> Call 211
          </a>
        </div>
      </div>

      {loading && <div className="mt-6 text-slate-500 text-sm">Loading…</div>}

      {/* Learn cards */}
      {!loading && learn.length > 0 && (
        <section className="mt-8" data-testid="category-learn">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: `${meta.accent}22`, color: meta.accent }}>
              <Lightbulb className="w-4 h-4" />
            </div>
            <div>
              <div className="overline" style={{ color: meta.accent }}>Learn</div>
              <div className="font-display text-lg text-[#1B1033] leading-tight">
                Plain-language guides you can actually use
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {learn.map((r) => <LearnCard key={r.id} r={r} accent={meta.accent} />)}
          </div>
        </section>
      )}

      {/* Support rail */}
      {!loading && support.length > 0 && (
        <section className="mt-8" data-testid="category-support">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#B76E79]/20 text-[#B76E79]">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="overline text-[#B76E79]">Find support</div>
              <div className="font-display text-lg text-[#1B1033] leading-tight">
                Verified places to call, apply, or walk in
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {support.map((r) => <SupportCard key={r.id} r={r} />)}
          </div>
        </section>
      )}

      {!loading && learn.length === 0 && support.length === 0 && (
        <div className="mt-8 text-slate-500 text-sm italic">
          Nothing yet in this category. Try <Link to="/app/find-help" className="text-[#4a2a5a] underline">local help via 211</Link>.
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-10 rounded-2xl border border-[#E4CDBF] bg-[#FBF3E9] p-4 md:p-5 text-sm text-slate-700 leading-relaxed">
        <span className="font-medium text-[#8E4E5A]">Reminder: </span>
        A Path Forward provides education and resource navigation. Nothing here replaces a doctor, lawyer,
        clinician, or licensed professional. For emergencies call 911. For mental-health crisis call or text 988.
        For statewide help, call 211.
      </div>
    </div>
  );
}

function LearnCard({ r, accent }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(`/app/resources/${r.id}`)}
      className="text-left rounded-2xl p-4 md:p-5 bg-white border-l-4 hover:-translate-y-0.5 transition-transform"
      style={{ borderLeftColor: accent, boxShadow: "0 1px 3px rgba(27,16,51,0.06)" }}
      data-testid={`category-learn-${r.id}`}>
      <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full"
        style={{ background: `${accent}18`, color: accent }}>
        <Lightbulb className="w-3 h-3" /> Learn
      </div>
      <div className="font-display text-base md:text-lg text-[#1B1033] leading-snug mt-2">{r.title}</div>
      {r.summary && <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">{r.summary}</p>}
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span className="truncate">{r.source}</span>
        <span className="inline-flex items-center gap-1" style={{ color: accent }}>
          Open <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </button>
  );
}

function SupportCard({ r }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(`/app/resources/${r.id}`)}
      className="text-left rounded-2xl p-4 md:p-5 bg-white border-l-4 hover:-translate-y-0.5 transition-transform"
      style={{ borderLeftColor: "#B76E79", boxShadow: "0 1px 3px rgba(27,16,51,0.06)" }}
      data-testid={`category-support-${r.id}`}>
      <div className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-[#B76E79]/18 text-[#B76E79]">
        <MapPin className="w-3 h-3" /> Find support
      </div>
      <div className="font-display text-base md:text-lg text-[#1B1033] leading-snug mt-2">{r.title}</div>
      {r.summary && <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">{r.summary}</p>}
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <div className="flex items-center gap-1">
          {r.region === "arkansas" && (
            <span className="px-1.5 py-0.5 bg-[#B85A4B]/12 text-[#8E4E5A] rounded-full">Arkansas</span>
          )}
          {r.is_crisis && (
            <span className="inline-flex items-center gap-0.5 text-rose-600">
              <ShieldAlert className="w-3 h-3" /> Crisis
            </span>
          )}
        </div>
        <span className="text-[#B76E79] inline-flex items-center gap-1">Open <ArrowRight className="w-3 h-3" /></span>
      </div>
    </button>
  );
}

export const CATEGORY_META = CATEGORIES;
