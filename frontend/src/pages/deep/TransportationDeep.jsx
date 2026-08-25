import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import HubLDTG from "@/components/HubLDTG";
import { Bus, Car, MapPin, IdCard } from "lucide-react";

const STAGE_LABEL = { needs_attention: "Needs attention", getting_started: "Getting started", building: "Building stability", stable: "Stable" };

export default function TransportationDeep() {
  const nav = useNavigate();
  const [bp, setBp] = useState(null);
  const [intake, setIntake] = useState({});
  useEffect(() => {
    (async () => {
      const [b, s] = await Promise.all([api.get("/blueprint"), api.get("/onboarding/state")]);
      setBp(b.data);
      const map = {}; (s.data.answers || []).forEach(a => { map[`${a.section}.${a.key}`] = a; });
      setIntake(map);
    })();
  }, []);
  const domain = bp?.domains?.find(d => d.domain === "transportation");
  const hasDL = intake["identification.has_drivers_license"]?.value === "yes";
  const hasID = intake["identification.has_state_id"]?.value === "yes";

  return (
    <div className="space-y-6" data-testid="transportation-deep">
      <div className="bmb-card p-6">
        <div className="overline">Transportation</div>
        <h1 className="font-display text-3xl text-[#1B1033]">Getting from A to B</h1>
        {domain && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">{STAGE_LABEL[domain.stage]}</span>
            <span className="text-sm text-slate-600">{domain.reason}</span>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatusCard icon={IdCard} label="State ID / Driver's License"
          status={hasDL ? "Driver's license on file" : hasID ? "State ID on file" : "Not on file yet"}
          route="/app/section/documents" />
        <StatusCard icon={Car} label="Personal vehicle"
          status={intake["immediate.urgent_concern"]?.value ? "Update in onboarding" : "Add if you have one"}
          route="/app/onboarding" />
        <StatusCard icon={Bus} label="Local transit"
          status="Learn what's available near you" route="/app/library" />
      </div>

      <HubLDTG
        eyebrow="For your transportation"
        learn={[
          { title: "How to get an Arkansas driver's license", description: "Step-by-step: documents needed, tests, restrictions after conviction.", route: "/app/library" },
          { title: "Using local transit safely", description: "Routes, apps, and etiquette.", route: "/app/library" },
        ]}
        doActions={[
          { label: "Scan an ID document", route: "/app/documents/scan", testId: "transport-scan" },
          { label: "Check my Blueprint", route: "/app/blueprint", testId: "transport-blueprint" },
        ]}
        track={[
          { label: "Stage", value: STAGE_LABEL[domain?.stage || "needs_attention"] },
          { label: "Has DL?", value: hasDL ? "Yes" : "No" },
          { label: "Has state ID?", value: hasID ? "Yes" : "No" },
        ]}
        help={[
          { label: "Approved transportation resources", route: "/app/section/independent-living" },
          { label: "Ask Bridge about transportation", route: "/app" },
        ]}
      />
    </div>
  );
}

function StatusCard({ icon: Icon, label, status, route }) {
  const nav = useNavigate();
  return (
    <button onClick={() => nav(route)} className="bmb-card p-4 text-left hover:-translate-y-0.5 transition">
      <Icon className="w-5 h-5 text-[#4a2a5a]" />
      <div className="font-medium text-[#1B1033] mt-2">{label}</div>
      <div className="text-xs text-slate-500 mt-1">{status}</div>
    </button>
  );
}
