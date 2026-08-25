import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, PlayCircle, Copy, Check, FileCode2 } from "lucide-react";
import HubLDTG from "@/components/HubLDTG";
import api from "@/lib/api";
import { DOORWAYS, ACCENT } from "@/lib/doorways";
import { toast } from "sonner";

/** JSON-driven doorway renderer. One route → many destinations, all real.
 *  Extended to render `videos` above Learn and `templates` below Do.
 */
export default function Doorway() {
  const { slug } = useParams();
  const nav = useNavigate();
  const config = DOORWAYS[slug];

  useEffect(() => {
    if (!config) return;
    api.post("/hub-visits", { key: slug, label: config.title, route: `/app/doorway/${slug}` }).catch(() => {});
  }, [slug, config]);

  if (!config) {
    return (
      <div className="max-w-xl mx-auto p-8" data-testid="doorway-not-found">
        <div className="bmb-card p-6">
          <div className="overline">Not found</div>
          <div className="font-display text-xl text-[#1B1033] mt-1">That doorway does not exist yet.</div>
          <button onClick={() => nav("/app")}
            className="mt-4 text-sm text-[#4a2a5a] hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  const color = ACCENT[categoryOf(config)] || ACCENT.identity;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6" data-testid={`doorway-${slug}`}>
      <button onClick={() => nav(-1)}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4"
        data-testid="doorway-back">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)`, borderLeft: `4px solid ${color}` }}>
        <div className="overline" style={{ color }}>{config.eyebrow}</div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033] mt-1">{config.title}</h1>
        {config.lead && <p className="text-sm md:text-base text-slate-700 mt-3 max-w-2xl leading-relaxed">{config.lead}</p>}
      </div>

      {config.videos?.length > 0 && <VideoPlaceholders videos={config.videos} color={color} />}

      <div className="mt-6">
        <HubLDTG
          eyebrow="Learn → Do → Track → Get help"
          learn={config.learn || []}
          doActions={(config.doActions || []).map((a) => a.external
            ? { ...a, onClick: () => window.open(a.route, "_blank", "noopener,noreferrer") }
            : a)}
          track={config.track || []}
          help={config.help || []}
        />
      </div>

      {config.templates?.length > 0 && <TemplateGallery templates={config.templates} color={color} />}
    </div>
  );
}

function VideoPlaceholders({ videos, color }) {
  return (
    <div className="mt-6 space-y-3" data-testid="doorway-videos">
      <div className="overline">Videos</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {videos.map((v, i) => (
          <div key={i}
            className="rounded-2xl p-4 flex gap-3 items-start bg-white border-l-4"
            style={{ borderLeftColor: color }}
            data-testid={`doorway-video-${i}`}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}18`, color }}>
              <PlayCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm text-[#1B1033]">{v.title}</div>
              {v.note && <div className="text-[11px] text-slate-500 mt-1 leading-relaxed">{v.note}</div>}
              <span className="inline-block mt-2 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ background: `${color}18`, color }}>Placeholder</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateGallery({ templates, color }) {
  return (
    <div className="mt-8" data-testid="doorway-templates">
      <div className="overline">Templates you can copy</div>
      <div className="mt-3 space-y-3">
        {templates.map((t, i) => <TemplateCard key={i} idx={i} t={t} color={color} />)}
      </div>
    </div>
  );
}

function TemplateCard({ t, idx, color }) {
  const [copied, setCopied] = useState(false);
  const fullText = (t.subject ? `Subject: ${t.subject}\n\n` : "") + (t.body || "");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success(`Copied “${t.name}”`);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Copy failed — long-press the text to select and copy");
    }
  };
  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden"
      data-testid={`template-${idx}`}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: `${color}12` }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${color}20`, color }}>
            <FileCode2 className="w-4 h-4" />
          </div>
          <div className="font-medium text-sm text-[#1B1033] truncate">{t.name}</div>
        </div>
        <button onClick={copy}
          className="flex-shrink-0 inline-flex items-center gap-1 rounded-full bg-white border border-slate-200 hover:border-[#4a2a5a] px-3 py-1 text-xs text-[#1B1033]"
          data-testid={`template-copy-${idx}`}>
          {copied
            ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</>
            : <><Copy className="w-3.5 h-3.5" /> Copy</>}
        </button>
      </div>
      {t.subject && (
        <div className="px-4 pt-3 text-xs">
          <span className="text-slate-500">Subject: </span>
          <span className="text-[#1B1033] font-medium">{t.subject}</span>
        </div>
      )}
      <pre className="px-4 py-3 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700 font-sans"
        data-testid={`template-body-${idx}`}>{t.body}</pre>
    </div>
  );
}

function categoryOf(cfg) {
  const s = cfg.section || "";
  if (s.includes("digital")) return "digital";
  if (s.includes("document")) return "documents";
  if (s.includes("home")) return "housing";
  if (s.includes("health") || s.includes("wellness")) return s.includes("wellness") ? "wellness" : "health";
  if (s.includes("employment")) return "employment";
  if (s.includes("benefits")) return "benefits";
  if (s.includes("support")) return "support";
  if (s.includes("compliance") || s.includes("requirement")) return "compliance";
  if (s.includes("life")) return "life";
  return "identity";
}
