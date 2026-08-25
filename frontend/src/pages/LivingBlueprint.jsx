import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";

const STAGE_LABEL = { needs_attention: "Needs attention", getting_started: "Getting started", building: "Building stability", stable: "Stable" };
const STAGE_STYLE = {
  needs_attention: "bg-rose-50 text-rose-800 border-rose-200",
  getting_started: "bg-amber-50 text-amber-900 border-amber-200",
  building: "bg-indigo-50 text-indigo-800 border-indigo-200",
  stable: "bg-emerald-50 text-emerald-800 border-emerald-200",
};
const DOMAIN_LABEL = {
  safety_essentials: "Safety & essentials", identification: "Identification",
  housing: "Housing", transportation: "Transportation",
  employment_income: "Employment & income", education_training: "Education & training",
  health: "Health", wellness: "Wellness",
  compliance: "Legal & supervision", support_network: "Support network",
};
const DOMAIN_ROUTE = {
  safety_essentials: "/app/section/independent-living",
  identification: "/app/section/documents",
  housing: "/app/section/home-hub",
  transportation: "/app/section/independent-living",
  employment_income: "/app/section/employment-record",
  education_training: "/app/library",
  health: "/app/section/health-hub",
  wellness: "/app/section/wellness",
  compliance: "/app/section/requirements",
  support_network: "/app/section/support-circle",
};

export default function LivingBlueprint() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [actions, setActions] = useState([]);
  useEffect(() => { (async () => {
    const [b, a] = await Promise.all([api.get("/blueprint"), api.get("/action-map")]);
    setData(b.data); setActions(a.data);
  })(); }, []);

  const recompute = async () => {
    await api.post("/blueprint/recompute");
    await api.post("/action-map/regenerate");
    const [b, a] = await Promise.all([api.get("/blueprint"), api.get("/action-map")]);
    setData(b.data); setActions(a.data);
  };

  const setStatus = async (id, status) => {
    await api.patch(`/action-map/${id}`, { status });
    const [b, a] = await Promise.all([api.get("/blueprint"), api.get("/action-map")]);
    setData(b.data); setActions(a.data);
  };

  if (!data) return <div className="p-8 text-slate-500">Loading…</div>;

  const priority = actions.filter(a => !a.declined && a.status !== "completed" && a.priority >= 3).slice(0, 3);
  const others = actions.filter(a => !a.declined && a.status !== "completed" && a.priority < 3);

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="living-blueprint">
      <div className="bmb-card p-6 flex items-start justify-between">
        <div>
          <div className="overline">Living Blueprint</div>
          <h1 className="font-display text-3xl text-[#1B1033]">Where you stand today</h1>
          <p className="text-slate-600 text-sm mt-1">Small steps, real progress. Your Blueprint updates as your life does.</p>
        </div>
        <Button variant="outline" onClick={recompute} data-testid="bp-recompute">Refresh</Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" data-testid="bp-domains">
        {data.domains.map((d) => (
          <button
            key={d.domain}
            onClick={() => nav(DOMAIN_ROUTE[d.domain] || "/app")}
            className={`text-left border rounded-2xl p-4 hover:shadow-md transition ${STAGE_STYLE[d.stage]}`}
            data-testid={`domain-${d.domain}`}
          >
            <div className="text-xs uppercase tracking-wider opacity-70">{STAGE_LABEL[d.stage]}</div>
            <div className="font-display text-lg mt-1">{DOMAIN_LABEL[d.domain]}</div>
            <div className="text-xs opacity-80 mt-2 leading-snug">{d.reason}</div>
          </button>
        ))}
      </div>

      <div>
        <div className="overline mb-2">What needs attention</div>
        {priority.length === 0
          ? <div className="text-sm text-slate-500 italic bmb-card p-4">Nothing high-priority right now. Nice work.</div>
          : priority.map((a) => (
            <div key={a.id} className="bmb-card p-4 mb-2 flex items-start gap-3" data-testid={`action-${a.id}`}>
              <div className="flex-1">
                <div className="font-medium text-[#1B1033]">{a.title}</div>
                <div className="text-xs text-slate-500 mt-1">{a.why}</div>
              </div>
              {a.route && <Button size="sm" variant="outline" onClick={() => nav(a.route)}>Open</Button>}
              <Button size="sm" onClick={() => setStatus(a.id, "completed")} data-testid={`action-complete-${a.id}`}>Done</Button>
            </div>
          ))}
      </div>

      {others.length > 0 && (
        <div>
          <div className="overline mb-2">Other suggested steps</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {others.map((a) => (
              <div key={a.id} className="bmb-card p-3">
                <div className="font-medium text-sm">{a.title}</div>
                <div className="text-xs text-slate-500 mt-1">{a.why}</div>
                <div className="mt-2 flex gap-2">
                  {a.route && <Button size="sm" variant="ghost" onClick={() => nav(a.route)}>Open</Button>}
                  <Button size="sm" variant="outline" onClick={() => setStatus(a.id, "completed")}>Done</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(data.history || []).length > 0 && (
        <div>
          <div className="overline mb-2">Progress you can see</div>
          <div className="bmb-card p-4 text-sm space-y-1">
            {data.history.slice(-8).map((h) => (
              <div key={h.id} className="flex justify-between text-xs text-slate-600">
                <span>{DOMAIN_LABEL[h.domain]}: {STAGE_LABEL[h.prior_stage || "needs_attention"]} → <strong>{STAGE_LABEL[h.new_stage]}</strong></span>
                <span>{(h.created_at || "").slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
