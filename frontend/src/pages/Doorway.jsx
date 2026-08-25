import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import HubLDTG from "@/components/HubLDTG";
import api from "@/lib/api";
import { DOORWAYS, ACCENT } from "@/lib/doorways";

/** JSON-driven doorway renderer. One route → many destinations, all real. */
export default function Doorway() {
  const { slug } = useParams();
  const nav = useNavigate();
  const config = DOORWAYS[slug];

  useEffect(() => {
    if (!config) return;
    // Fire-and-forget so the dashboard "Continue where you left off" works.
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

      <div className="mt-6">
        <HubLDTG
          eyebrow="Learn → Do → Track → Get help"
          learn={config.learn || []}
          doActions={config.doActions || []}
          track={config.track || []}
          help={config.help || []}
        />
      </div>
    </div>
  );
}

function categoryOf(cfg) {
  const s = cfg.section || "";
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
