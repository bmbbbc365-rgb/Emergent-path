import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Search, ExternalLink,
  Compass, ShieldAlert, Sparkles, PlayCircle, MapPin, Lightbulb, Wrench, Phone,
} from "lucide-react";
import { toast } from "sonner";

/* ============================================================
 * Batch A — Universal Resource Registry UI
 *  /app/resources                → hub (pathways + search + kind filters)
 *  /app/resources/browse         → results
 *  /app/resources/saved          → my saved
 *  /app/resources/:id            → detail with disclaimer + external link
 *  /app/find-help                → Arkansas 211-forward crisis + community rail
 * ============================================================ */

const KIND_META = {
  learn:   { label: "LEARN",        icon: Lightbulb,  color: "#4a2a5a" },
  tool:    { label: "USE A TOOL",   icon: Wrench,     color: "#2E5266" },
  support: { label: "FIND SUPPORT", icon: MapPin,     color: "#B76E79" },
};

const DISCLAIMER_TEXT = {
  legal:     "General educational information and referral support. This is not legal advice.",
  health:    "Educational information only and not a substitute for professional medical care.",
  mental:    "A Path Forward provides education and resource navigation, not diagnosis or treatment.",
  financial: "General financial education, not individualized financial, investment or tax advice.",
  insurance: "General insurance education. Individual coverage recommendations may require a licensed insurance professional.",
  safety:    "Educational readiness material. Completion does not represent an OSHA, CPR, First-Aid or other third-party certification unless explicitly identified as an authorized credential.",
  none:      "",
};

function KindBadge({ kind }) {
  const meta = KIND_META[kind] || KIND_META.support;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full"
      style={{ background: `${meta.color}18`, color: meta.color }}
      data-testid={`kind-badge-${kind}`}>
      <Icon className="w-3 h-3" /> {meta.label}
    </span>
  );
}

function ResourceCard({ r, onNav }) {
  const kindMeta = KIND_META[r.kind] || KIND_META.support;
  return (
    <button
      onClick={() => onNav(`/app/resources/${r.id}`)}
      className="group w-full text-left rounded-2xl p-4 md:p-5 bg-white border-l-4 hover:-translate-y-0.5 transition-transform"
      style={{ borderLeftColor: kindMeta.color, boxShadow: "0 1px 3px rgba(27,16,51,0.06)" }}
      data-testid={`resource-card-${r.id}`}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <KindBadge kind={r.kind} />
        {r.saved && <BookmarkCheck className="w-4 h-4 text-[#B76E79]" />}
      </div>
      <div className="font-display text-base md:text-lg text-[#1B1033] leading-snug">{r.title}</div>
      {r.summary && <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed">{r.summary}</p>}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-500">
        {r.region === "arkansas" && <span className="px-1.5 py-0.5 bg-[#B85A4B]/12 text-[#8E4E5A] rounded-full">Arkansas</span>}
        {r.source && <span className="truncate">· {r.source}</span>}
        {r.is_crisis && <span className="ml-auto text-rose-600 font-medium inline-flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" />Crisis</span>}
      </div>
    </button>
  );
}

/* -------------------- RESOURCES HUB -------------------- */
export function ResourcesHub() {
  const nav = useNavigate();
  const [pathways, setPathways] = useState([]);
  const [crisis, setCrisis] = useState([]);
  const [saved, setSaved] = useState([]);
  const [q, setQ] = useState("");

  useEffect(() => { (async () => {
    try {
      const [p, c, s] = await Promise.all([
        api.get("/resources/pathways").then(r => r.data.pathways),
        api.get("/resources", { params: { is_crisis: true, limit: 5 } }).then(r => r.data.resources || [])
          .catch(() => []),
        api.get("/resources/saved").then(r => r.data.resources).catch(() => []),
      ]);
      setPathways(p || []); setCrisis(c || []); setSaved(s || []);
    } catch { toast.error("Could not load resources"); }
  })(); }, []);

  const goSearch = () => {
    if (!q.trim()) return;
    nav(`/app/resources/browse?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6" data-testid="resources-hub">
      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #2B1440 0%, #4a2a5a 50%, #B76E79 100%)" }}>
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(255,255,255,0.18) 0%, transparent 70%)" }} />
        <div className="text-[10px] uppercase tracking-[0.18em] font-medium" style={{ color: "rgba(243,225,216,0.85)" }}>A Path Forward · Resources</div>
        <h1 className="font-display text-2xl md:text-3xl text-white mt-1">Learn, use a tool, or find support</h1>
        <p className="text-[#F3E1D8]/90 text-sm md:text-base mt-2 max-w-2xl leading-relaxed">
          Every card leads somewhere real — plain-language education, an interactive tool you can save, or a
          verified Arkansas or national support line.
        </p>
        <div className="mt-5 flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goSearch()}
              placeholder="Search: SNAP, resume, 211, credit, naloxone…"
              className="pl-9 bg-white/95 border-0"
              data-testid="resources-search" />
          </div>
          <Button onClick={goSearch}
            className="bg-white text-[#4a2a5a] hover:bg-slate-50"
            data-testid="resources-search-btn">Search</Button>
        </div>
      </div>

      {/* CRISIS RAIL — always visible, top of page */}
      {crisis.length > 0 && (
        <div className="mt-6 rounded-2xl border-2 border-rose-200 bg-rose-50/60 p-4 md:p-5" data-testid="crisis-rail">
          <div className="flex items-center gap-2 text-rose-700">
            <ShieldAlert className="w-4 h-4" />
            <div className="overline text-rose-700">If you're in crisis — call these first</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
            {crisis.slice(0, 3).map((r) => (
              <a key={r.id} href={r.url || "#"} target="_blank" rel="noopener noreferrer"
                className="rounded-xl bg-white border border-rose-200 p-3 hover:border-rose-400 transition"
                data-testid={`crisis-item-${r.id}`}>
                <div className="font-medium text-sm text-[#1B1033]">{r.title}</div>
                <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{r.summary}</p>
                <div className="text-[11px] text-rose-700 font-medium mt-2 inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" /> Open
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Kind quick-filters */}
      <div className="mt-6 flex flex-wrap gap-2" data-testid="kind-filter-row">
        {["learn", "tool", "support"].map((k) => {
          const meta = KIND_META[k];
          const Icon = meta.icon;
          return (
            <button key={k} onClick={() => nav(`/app/resources/browse?kind=${k}`)}
              className="rounded-full px-4 py-2 text-sm bg-white border hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2"
              style={{ borderColor: `${meta.color}55`, color: meta.color }}
              data-testid={`filter-kind-${k}`}>
              <Icon className="w-4 h-4" /> {meta.label}
            </button>
          );
        })}
        <button onClick={() => nav("/app/resources/saved")}
          className="rounded-full px-4 py-2 text-sm bg-white border border-slate-200 hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2 text-[#4a2a5a]"
          data-testid="filter-saved">
          <Bookmark className="w-4 h-4" /> My Saved {saved.length > 0 && `(${saved.length})`}
        </button>
        <Link to="/app/find-help"
          className="rounded-full px-4 py-2 text-sm bg-[#4a2a5a] text-white hover:-translate-y-0.5 transition-transform inline-flex items-center gap-2"
          data-testid="find-help-cta">
          <MapPin className="w-4 h-4" /> Find local help
        </Link>
      </div>

      {/* Pathways */}
      <div className="mt-6">
        <div className="overline mb-3">Follow the reentry pathways</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {pathways.map((p) => (
            <Link key={p.key} to={`/app/resources/browse?pathway=${p.key}`}
              className="rounded-2xl p-4 md:p-5 bg-white border-l-4 hover:-translate-y-0.5 transition-transform"
              style={{ borderLeftColor: p.accent, boxShadow: "0 1px 3px rgba(27,16,51,0.06)" }}
              data-testid={`pathway-${p.key}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${p.accent}18`, color: p.accent }}>
                <Compass className="w-5 h-5" />
              </div>
              <div className="font-display text-base text-[#1B1033] mt-2">{p.label}</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{p.blurb}</p>
              <div className="mt-2 text-xs inline-flex items-center gap-1" style={{ color: p.accent }}>
                Explore <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Category deep pages — Batch B */}
      <div className="mt-8" data-testid="category-strip">
        <div className="overline mb-3">Deep dives · Learn + Find Support</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {[
            { key: "emergency",  label: "Emergency & Safety",  blurb: "First aid, go-bag, disaster prep.",             accent: "#B85A4B" },
            { key: "financial",  label: "Financial Wellness",  blurb: "Budgets, credit, taxes, housing counselors.",   accent: "#B5851F" },
            { key: "health",     label: "Health & Wellness",   blurb: "Coverage, chronic care, mental screenings.",    accent: "#4E8C86" },
            { key: "recovery",   label: "Recovery",            blurb: "Science, harm reduction, peer community.",      accent: "#7C4E80" },
            { key: "employment", label: "Career & Employment", blurb: "Resumes, fair-chance jobs, apprenticeships.",   accent: "#3B7A8A" },
            { key: "technology", label: "Technology & Digital",blurb: "Free digital literacy, scam-proofing.",         accent: "#5F8CA5" },
          ].map((c) => (
            <Link key={c.key} to={`/app/resources/category/${c.key}`}
              className="rounded-2xl p-4 md:p-5 bg-white border-l-4 hover:-translate-y-0.5 transition-transform"
              style={{ borderLeftColor: c.accent, boxShadow: "0 1px 3px rgba(27,16,51,0.06)" }}
              data-testid={`category-card-${c.key}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${c.accent}18`, color: c.accent }}>
                <Lightbulb className="w-5 h-5" />
              </div>
              <div className="font-display text-base text-[#1B1033] mt-2">{c.label}</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{c.blurb}</p>
              <div className="mt-2 text-xs inline-flex items-center gap-1" style={{ color: c.accent }}>
                Open <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Saved shortcut */}
      {saved.length > 0 && (
        <div className="mt-8" data-testid="dash-saved">
          <div className="flex items-center justify-between mb-3">
            <div className="overline">Recently saved</div>
            <Link to="/app/resources/saved" className="text-xs text-[#4a2a5a] hover:underline">See all →</Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {saved.slice(0, 3).map((r) => <ResourceCard key={r.id} r={r} onNav={nav} />)}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------- BROWSE (filter results) -------------------- */
export function ResourcesBrowse() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => { (async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/resources", { params: Object.fromEntries(params) });
      setRows(data.resources || []);
    } catch { toast.error("Could not search resources"); }
    finally { setLoading(false); }
  })(); }, [params]);

  const label = params.get("q") ? `Results for “${params.get("q")}”`
              : params.get("pathway") ? `Pathway: ${params.get("pathway").replace(/-/g, " ")}`
              : params.get("kind") ? KIND_META[params.get("kind")]?.label || "Filter"
              : params.get("category") ? `Category: ${params.get("category")}`
              : "All resources";

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" data-testid="resources-browse">
      <button onClick={() => nav("/app/resources")}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Resources
      </button>
      <div className="overline">{label}</div>
      <div className="text-sm text-slate-500 mt-1">{loading ? "Searching…" : `${rows.length} matches`}</div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => <ResourceCard key={r.id} r={r} onNav={nav} />)}
      </div>
      {!loading && rows.length === 0 && (
        <div className="mt-8 text-center text-slate-500 text-sm">
          No matches yet. Try a broader term, or <Link to="/app/find-help" className="text-[#4a2a5a] underline">find local help via 211</Link>.
        </div>
      )}
    </div>
  );
}

/* -------------------- SAVED -------------------- */
export function ResourcesSaved() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const load = async () => {
    try {
      const { data } = await api.get("/resources/saved");
      setRows(data.resources || []);
    } catch { toast.error("Could not load saved resources"); }
  };
  useEffect(() => { load(); }, []);
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6" data-testid="resources-saved">
      <button onClick={() => nav("/app/resources")}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Resources
      </button>
      <div className="rounded-2xl p-5 border-l-4 bg-white" style={{ borderLeftColor: "#B76E79" }}>
        <div className="overline">Saved for later</div>
        <h1 className="font-display text-xl text-[#1B1033] mt-1">My Resources</h1>
        <p className="text-xs text-slate-500 mt-1">Resources you tapped the bookmark on. Private to you.</p>
      </div>
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        {rows.map((r) => <ResourceCard key={r.id} r={r} onNav={nav} />)}
        {rows.length === 0 && (
          <div className="col-span-2 text-slate-500 text-sm italic">
            Nothing saved yet. Tap the bookmark on any resource to keep it here.
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------- DETAIL -------------------- */
export function ResourceDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [r, setR] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    try {
      const { data } = await api.get(`/resources/${id}`);
      setR(data);
    } catch {
      toast.error("Resource not found");
      nav(-1);
    }
  })(); }, [id, nav]);

  if (!r) return <div className="p-8 text-slate-500">Loading…</div>;

  const kindMeta = KIND_META[r.kind] || KIND_META.support;
  const disclaimer = DISCLAIMER_TEXT[r.disclaimer_type] || "";

  const toggleSave = async () => {
    setBusy(true);
    try {
      if (r.saved) {
        await api.delete(`/resources/${id}/save`);
        setR({ ...r, saved: false });
      } else {
        await api.post(`/resources/${id}/save`);
        setR({ ...r, saved: true });
      }
    } catch { toast.error("Could not update saved"); }
    finally { setBusy(false); }
  };

  const openLink = () => {
    if (r.tool_route) return nav(r.tool_route);
    if (r.url) window.open(r.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" data-testid={`resource-detail-${id}`}>
      <button onClick={() => nav(-1)}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${kindMeta.color}18, ${kindMeta.color}08)`,
                 borderLeft: `4px solid ${kindMeta.color}` }}>
        <div className="flex items-center gap-2">
          <KindBadge kind={r.kind} />
          {r.region === "arkansas" && (
            <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-[#B85A4B]/12 text-[#8E4E5A]">Arkansas</span>
          )}
          {r.is_crisis && <span className="text-[10px] uppercase tracking-wider font-medium px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" />Crisis</span>}
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033] mt-2">{r.title}</h1>
        {r.summary && <p className="text-sm md:text-base text-slate-700 mt-3 max-w-2xl leading-relaxed">{r.summary}</p>}
        {r.source && <div className="text-[11px] text-slate-500 mt-3">Source: {r.source}</div>}
      </div>

      {r.description && (
        <div className="bmb-card p-5 mt-4">
          <div className="overline">More detail</div>
          <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap leading-relaxed">{r.description}</p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button onClick={openLink}
          className="bg-[#4a2a5a] hover:bg-[#3a1e4a]"
          data-testid="resource-open">
          {r.tool_route
            ? <>Open the tool <ArrowRight className="w-4 h-4 ml-1" /></>
            : <>Visit official site <ExternalLink className="w-4 h-4 ml-1" /></>}
        </Button>
        <Button variant="outline" onClick={toggleSave} disabled={busy}
          data-testid="resource-save-btn">
          {r.saved
            ? <><BookmarkCheck className="w-4 h-4 mr-1" /> Saved</>
            : <><Bookmark className="w-4 h-4 mr-1" /> Save for later</>}
        </Button>
      </div>

      {disclaimer && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-[#FBF3E9] p-4 text-xs text-slate-700 leading-relaxed"
          data-testid="resource-disclaimer">
          <span className="font-medium text-[#8E4E5A]">Important: </span>{disclaimer}
        </div>
      )}

      {r.credential_pathway && (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800">
          <span className="font-medium">Authorized credential pathway.</span> Completing this may lead to an official third-party certificate.
        </div>
      )}

      {r.tags?.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-1.5">
          {r.tags.map((t) => (
            <span key={t} className="text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
