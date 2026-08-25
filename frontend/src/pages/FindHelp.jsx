import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "@/lib/api";
import {
  ArrowLeft, ShieldAlert, ExternalLink, Phone, MapPin, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const NEEDS = [
  { key: "food",         label: "Food",             tags: ["food", "snap", "pantry", "wic"] },
  { key: "housing",      label: "Housing / Shelter", tags: ["housing", "shelter", "rent"] },
  { key: "utilities",    label: "Utilities",        tags: ["liheap", "utility", "utilities"] },
  { key: "transport",    label: "Transportation",   tags: ["transport", "bus", "ride"] },
  { key: "benefits",     label: "Benefits",         tags: ["benefits", "medicaid", "snap", "tea"] },
  { key: "legal",        label: "Legal Help",       tags: ["legal", "expungement", "public-defender"] },
  { key: "employment",   label: "Employment",       tags: ["workforce", "jobs", "joblink"] },
  { key: "healthcare",   label: "Healthcare",       tags: ["clinics", "medicaid", "arkansas-health"] },
  { key: "mental",       label: "Mental Health",    tags: ["mental-health", "988"] },
  { key: "recovery",     label: "Recovery",         tags: ["samhsa", "recovery", "naloxone"] },
  { key: "family",       label: "Family",           tags: ["family", "children", "parenting"] },
  { key: "veterans",     label: "Veterans",         tags: ["veterans", "va"] },
  { key: "emergency",    label: "Emergency",        tags: ["emergency", "988", "911", "crisis"] },
];

const CRISIS_FIRST = ["988 Suicide & Crisis Lifeline", "911 — Life-threatening emergencies", "SAMHSA National Helpline"];

export default function FindHelp() {
  const nav = useNavigate();
  const [byNeed, setByNeed] = useState({});
  const [crisis, setCrisis] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try {
      const { data } = await api.get("/resources", { params: { region: "arkansas", limit: 200 } });
      const rows = data.resources || [];
      // Bucket by need using tag matching
      const bucket = {};
      NEEDS.forEach((n) => { bucket[n.key] = []; });
      rows.forEach((r) => {
        NEEDS.forEach((n) => {
          if (n.tags.some((t) => (r.tags || []).includes(t))) bucket[n.key].push(r);
        });
      });
      setByNeed(bucket);

      // Crisis rail: use is_crisis flag and exclude in-app tools so we only
      // surface real call-first destinations (988, 911, SAMHSA).
      const c = await api.get("/resources", { params: { is_crisis: true, limit: 10 } })
                          .then(r => (r.data.resources || []).filter((x) => x.kind !== "tool"))
                          .catch(() => []);
      setCrisis(c);
    } catch { toast.error("Could not load Arkansas help resources"); }
    finally { setLoading(false); }
  })(); }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" data-testid="find-help">
      <button onClick={() => nav("/app/resources")}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Resources
      </button>

      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #4a2a5a 0%, #B85A4B 100%)" }}>
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }} />
        <div className="flex items-center gap-2" style={{ color: "rgba(243,225,216,0.9)" }}>
          <MapPin className="w-4 h-4" />
          <div className="text-[10px] uppercase tracking-[0.18em] font-medium" style={{ color: "rgba(243,225,216,0.85)" }}>Arkansas · community help</div>
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-white mt-1">Find local help</h1>
        <p className="text-[#F3E1D8]/90 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
          Arkansas 211 is one call for food, housing, utilities, benefits, legal, healthcare, mental health,
          recovery, family, veterans, and emergency needs.
        </p>
        <a href="tel:211"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/95 hover:bg-white text-[#4a2a5a] px-4 py-2 text-sm font-medium"
          data-testid="call-211">
          <Phone className="w-4 h-4" /> Call 211
        </a>
        <a href="https://arkansas211.org/" target="_blank" rel="noopener noreferrer"
          className="ml-2 inline-flex items-center gap-2 rounded-full bg-white/20 hover:bg-white/30 text-white px-4 py-2 text-sm border border-white/40">
          Open Arkansas 211 <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Crisis rail */}
      {crisis.length > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-4" data-testid="find-help-crisis">
          <div className="flex items-center gap-2 text-rose-700">
            <ShieldAlert className="w-4 h-4" />
            <div className="overline text-rose-700">If it's an emergency</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            {crisis.slice(0, 3).map((r) => (
              <a key={r.id} href={r.url || "#"} target={r.url?.startsWith("tel:") ? undefined : "_blank"}
                rel="noopener noreferrer"
                className="rounded-xl bg-white border border-rose-200 p-3 hover:border-rose-400 transition"
                data-testid={`fh-crisis-${r.id}`}>
                <div className="font-medium text-sm text-[#1B1033]">{r.title}</div>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{r.summary}</p>
              </a>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="mt-6 text-slate-500 text-sm">Loading Arkansas resources…</div>}

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {NEEDS.map((n) => {
          const items = byNeed[n.key] || [];
          if (items.length === 0) return null;
          return (
            <div key={n.key} className="bmb-card p-4" data-testid={`need-${n.key}`}>
              <div className="font-display text-base text-[#1B1033]">{n.label}</div>
              <ul className="mt-2 space-y-1.5">
                {items.slice(0, 4).map((r) => (
                  <li key={r.id}>
                    <Link to={`/app/resources/${r.id}`}
                      className="text-sm text-[#4a2a5a] hover:underline inline-flex items-center gap-1"
                      data-testid={`need-item-${r.id}`}>
                      {r.title} <ArrowRight className="w-3 h-3" />
                    </Link>
                    {r.summary && <div className="text-[11px] text-slate-500 line-clamp-1">{r.summary}</div>}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-2xl border border-[#E4CDBF] bg-[#FBF3E9] p-4 text-xs text-slate-700 leading-relaxed">
        <span className="font-medium text-[#8E4E5A]">Reminder: </span>
        A Path Forward provides education and resource navigation. For emergencies call 911. For mental-health crisis
        call or text 988. For statewide help, call 211.
      </div>
    </div>
  );
}
