import React, { useEffect, useState } from "react";
import api, { API, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RefreshCw, Download, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const FIELDS = [
  { key: "name", label: "Name" },
  { key: "dob", label: "Date of birth" },
  { key: "blood_type", label: "Blood type" },
  { key: "allergies", label: "Allergies" },
  { key: "conditions_summary", label: "Relevant conditions" },
  { key: "medications_summary", label: "Medications summary" },
  { key: "emergency_contacts", label: "Emergency contacts" },
  { key: "healthcare_proxy", label: "Healthcare proxy" },
  { key: "communication_needs", label: "Communication needs" },
  { key: "advance_directive", label: "Advance directive" },
  { key: "organ_donor", label: "Organ donor" },
  { key: "dnr", label: "DNR" },
];

export default function EmergencySettings() {
  const [pub, setPub] = useState(null);
  const [scans, setScans] = useState([]);
  const [qrKey, setQrKey] = useState(0);

  const load = async () => {
    const [p, s] = await Promise.all([
      api.get("/emergency/public-profile"),
      api.get("/emergency/scan-history"),
    ]);
    setPub(p.data); setScans(s.data);
  };
  useEffect(() => { load(); }, []);

  const save = async (patch) => {
    const next = { enabled: patch.enabled ?? pub.enabled, allowed_fields: patch.allowed_fields ?? pub.allowed_fields ?? [] };
    const { data } = await api.put("/emergency/public-profile", next);
    setPub(data); setQrKey((k) => k + 1);
  };

  const toggleField = (key) => {
    const cur = new Set(pub.allowed_fields || []);
    if (cur.has(key)) cur.delete(key); else cur.add(key);
    save({ allowed_fields: Array.from(cur) });
  };

  const rotate = async () => {
    const { data } = await api.post("/emergency/rotate-slug");
    setPub(data); setQrKey((k) => k + 1);
    toast.success("New emergency link generated. Old QR is invalid.");
  };

  if (!pub) return <div className="p-8 text-slate-500">Loading…</div>;
  const publicUrl = pub.public_slug ? `${window.location.origin}/e/${pub.public_slug}` : null;
  const qrUrl = `${API}/emergency/qr?auth=${getToken() || ""}&t=${qrKey}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="emergency-settings">
      <div className="bmb-card p-6">
        <div className="overline">Emergency Hub</div>
        <h1 className="font-display text-3xl text-[#1B1033]">Emergency card</h1>
        <p className="text-slate-600 text-sm mt-1">If enabled, first responders can scan your QR to see only what you approve — nothing else in your account is exposed.</p>
        <div className="mt-4 flex items-center gap-3">
          <Switch checked={pub.enabled} onCheckedChange={(v) => save({ enabled: v })} data-testid="emergency-toggle" />
          <span className="text-sm">{pub.enabled ? "Emergency access is ON" : "Emergency access is OFF"}</span>
        </div>
      </div>

      <div className="bmb-card p-6">
        <div className="overline">Fields you approve to share</div>
        <div className="mt-3 grid sm:grid-cols-2 gap-2">
          {FIELDS.map((f) => {
            const on = (pub.allowed_fields || []).includes(f.key);
            return (
              <button key={f.key} onClick={() => toggleField(f.key)}
                className={`text-left border rounded-xl p-2 text-sm ${on ? "border-[#1B1033] bg-[#1B1033]/5" : "border-slate-200"}`}
                data-testid={`field-${f.key}`}>
                <div className="flex items-center gap-2">
                  <div className={`w-4 h-4 rounded border ${on ? "bg-[#1B1033] border-[#1B1033]" : "border-slate-300"}`} />
                  {f.label}
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-3">SSN, driver's-license number, and other sensitive identifiers are NEVER available here.</p>
      </div>

      <div className="bmb-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="overline">Your QR</div>
            <p className="text-xs text-slate-500 mt-1">Print for a wallet card, bracelet, or dog tag.</p>
          </div>
          <Button variant="outline" onClick={rotate} data-testid="rotate-slug">
            <RefreshCw className="w-4 h-4 mr-1" /> Rotate link
          </Button>
        </div>
        <div className="mt-4 flex items-center gap-6">
          {pub.enabled ? (
            <img src={qrUrl} alt="Emergency QR" className="w-48 h-48 border rounded-lg" data-testid="emergency-qr" />
          ) : (
            <div className="w-48 h-48 border border-dashed rounded-lg flex items-center justify-center text-xs text-slate-500 text-center p-3">
              Turn on Emergency access to generate a QR.
            </div>
          )}
          <div className="text-xs text-slate-500 break-all">
            {publicUrl && pub.enabled && (<>
              <div className="font-medium text-slate-700 mb-1">Public URL</div>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="underline text-[#4a2a5a]">{publicUrl}</a>
              <div className="mt-2">Scans: {pub.scan_count || 0}</div>
            </>)}
          </div>
        </div>
      </div>

      <div className="bmb-card p-6">
        <div className="overline flex items-center gap-2"><ShieldAlert className="w-3.5 h-3.5" /> Recent scans</div>
        {scans.length === 0
          ? <div className="text-xs text-slate-500 italic mt-2">Nothing yet.</div>
          : (
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              {scans.map((s) => (
                <div key={s.id} className="flex justify-between">
                  <span>{(s.after?.ip || "unknown")} · {(s.after?.ua || "").slice(0, 40)}…</span>
                  <span>{(s.created_at || "").slice(0, 19).replace("T", " ")}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
