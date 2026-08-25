import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { API } from "@/lib/api";

/**
 * Public, unauthenticated emergency view.
 * Renders ONLY fields the participant explicitly allowed.
 * If disabled/revoked, shows a neutral notice — never leaks status.
 */
export default function PublicEmergency() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/e/${slug}`);
        if (r.status === 410) { setStatus("disabled"); return; }
        if (!r.ok) { setStatus("notfound"); return; }
        const j = await r.json();
        setData(j.profile || {}); setStatus("ok");
      } catch { setStatus("notfound"); }
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#1B1033] text-white p-6" data-testid="public-emergency">
      <div className="max-w-sm mx-auto">
        <div className="text-xs uppercase tracking-widest opacity-70 mb-1">Emergency Information</div>
        <div className="font-display text-3xl mb-4">A Path Forward</div>
        {status === "loading" && <div className="opacity-70 text-sm">Loading…</div>}
        {status === "notfound" && <div className="opacity-80 text-sm">This emergency card is not available.</div>}
        {status === "disabled" && <div className="opacity-80 text-sm">This person has disabled emergency access.</div>}
        {status === "ok" && data && Object.keys(data).length === 0 &&
          <div className="opacity-80 text-sm">No fields have been authorized to display.</div>}
        {status === "ok" && data && Object.keys(data).length > 0 && (
          <div className="space-y-3 mt-4">
            {Object.entries(data).map(([k, v]) => (
              <div key={k} className="bg-white/5 rounded-lg p-3">
                <div className="text-[11px] uppercase tracking-wider opacity-60">{k.replace(/_/g, " ")}</div>
                <div className="text-sm mt-1">{Array.isArray(v) ? v.map((x, i) => <div key={i}>{typeof x === "string" ? x : JSON.stringify(x)}</div>) : (typeof v === "object" ? JSON.stringify(v) : String(v))}</div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6 text-[10px] opacity-50">
          Only fields explicitly authorized by the participant are visible. Everything else in their account remains private.
          For medical emergencies call 911.
        </div>
      </div>
    </div>
  );
}
