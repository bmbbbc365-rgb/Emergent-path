import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pill, ClipboardList, CalendarClock, Activity, ShieldAlert, Plus, Trash2, HeartPulse } from "lucide-react";
import { toast } from "sonner";

function ListItemCard({ icon: Icon, title, subtitle, meta, onDelete, testId }) {
  return (
    <div className="bmb-card p-4 flex items-start gap-3" data-testid={testId}>
      <div className="w-9 h-9 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Icon className="w-4 h-4" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[#1B1033]">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
        {meta && <div className="text-[11px] text-slate-500 mt-1">{meta}</div>}
      </div>
      <button onClick={onDelete} className="text-slate-300 hover:text-red-500" data-testid={testId ? `${testId}-delete` : undefined}><Trash2 className="w-4 h-4" /></button>
    </div>
  );
}

function AddDialog({ title, testId, children, open, setOpen, onSubmit, submitLabel = "Save" }) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid={testId}><Plus className="w-4 h-4" /> Add</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={onSubmit} className="space-y-3">
          {children}
          <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white">{submitLabel}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function HealthHubDeep() {
  const [meds, setMeds] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [appts, setAppts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [ep, setEp] = useState({ enabled: false, allergies: [], emergency_contacts: [] });

  // dialogs
  const [medOpen, setMedOpen] = useState(false);
  const [condOpen, setCondOpen] = useState(false);
  const [apptOpen, setApptOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [med, setMed] = useState({ name: "", generic_name: "", dose: "", frequency: "", times: "", provider: "", reason: "", started_at: "", notes: "" });
  const [cond, setCond] = useState({ name: "", diagnosed_at: "", provider: "", plan: "", notes: "" });
  const [appt, setAppt] = useState({ provider: "", location: "", scheduled_at: "", purpose: "", notes: "" });
  const [wl, setWl] = useState({ kind: "sleep", value: "", unit: "", note: "" });

  const load = async () => {
    const [m, c, a, l, e] = await Promise.all([
      api.get("/health/medications"), api.get("/health/conditions"),
      api.get("/health/appointments"), api.get("/health/wellness-logs"),
      api.get("/health/emergency-profile"),
    ]);
    setMeds(m.data); setConditions(c.data); setAppts(a.data); setLogs(l.data); setEp(e.data || {enabled: false, allergies: [], emergency_contacts: []});
  };
  useEffect(() => { load(); }, []);

  const saveMed = async (e) => { e.preventDefault();
    const payload = {...med, times: med.times ? med.times.split(",").map(s=>s.trim()).filter(Boolean) : []};
    await api.post("/health/medications", payload); toast.success("Medication added"); setMedOpen(false);
    setMed({ name: "", generic_name: "", dose: "", frequency: "", times: "", provider: "", reason: "", started_at: "", notes: "" });
    await load();
  };
  const saveCond = async (e) => { e.preventDefault(); await api.post("/health/conditions", cond); toast.success("Condition added"); setCondOpen(false); setCond({name:"",diagnosed_at:"",provider:"",plan:"",notes:""}); await load(); };
  const saveAppt = async (e) => { e.preventDefault(); await api.post("/health/appointments", appt); toast.success("Appointment added"); setApptOpen(false); setAppt({provider:"",location:"",scheduled_at:"",purpose:"",notes:""}); await load(); };
  const saveLog = async (e) => { e.preventDefault(); await api.post("/health/wellness-logs", {...wl, value: Number(wl.value), logged_at: new Date().toISOString()}); toast.success("Logged"); setLogOpen(false); setWl({kind:"sleep",value:"",unit:"",note:""}); await load(); };

  const saveEP = async () => { await api.put("/health/emergency-profile", ep); toast.success("Emergency profile saved"); await load(); };

  return (
    <div className="space-y-8" data-testid="health-hub">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><HeartPulse className="w-6 h-6" /></div>
          <div>
            <div className="overline">Health Hub</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Your health, organized privately.</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">Educational and organizational only. Bridge does not diagnose or treat. In emergencies call 911.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="meds">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="meds" data-testid="tab-meds">Medications</TabsTrigger>
          <TabsTrigger value="conditions" data-testid="tab-conditions">Conditions</TabsTrigger>
          <TabsTrigger value="appts" data-testid="tab-appts">Appointments</TabsTrigger>
          <TabsTrigger value="wellness" data-testid="tab-wellness">Wellness tracking</TabsTrigger>
          <TabsTrigger value="emergency" data-testid="tab-emergency">Emergency Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="meds" className="mt-6">
          <Section eyebrow="Prescriptions & supplements" title="Medications"
            action={<AddDialog title="Add medication" testId="add-med-btn" open={medOpen} setOpen={setMedOpen} onSubmit={saveMed}>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={med.name} onChange={(e) => setMed({...med, name: e.target.value})} required data-testid="med-name" /></div>
                <div><Label>Generic</Label><Input value={med.generic_name} onChange={(e) => setMed({...med, generic_name: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Dose</Label><Input value={med.dose} onChange={(e) => setMed({...med, dose: e.target.value})} placeholder="10 mg" data-testid="med-dose" /></div>
                <div><Label>Frequency</Label><Input value={med.frequency} onChange={(e) => setMed({...med, frequency: e.target.value})} placeholder="1x daily" /></div>
                <div><Label>Times (comma)</Label><Input value={med.times} onChange={(e) => setMed({...med, times: e.target.value})} placeholder="08:00, 20:00" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provider</Label><Input value={med.provider} onChange={(e) => setMed({...med, provider: e.target.value})} /></div>
                <div><Label>Started</Label><Input type="date" value={med.started_at} onChange={(e) => setMed({...med, started_at: e.target.value})} /></div>
              </div>
              <div><Label>Reason</Label><Input value={med.reason} onChange={(e) => setMed({...med, reason: e.target.value})} /></div>
              <div><Label>Notes</Label><Textarea value={med.notes} onChange={(e) => setMed({...med, notes: e.target.value})} /></div>
            </AddDialog>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {meds.length === 0 && <EmptyHint>No medications added yet.</EmptyHint>}
              {meds.map((m) => (
                <ListItemCard key={m.id} icon={Pill} testId={`med-${m.id}`}
                  title={`${m.name} ${m.dose || ""}`}
                  subtitle={m.frequency ? `${m.frequency}${m.times?.length ? ` · ${m.times.join(", ")}` : ""}` : ""}
                  meta={`Prescriber: ${m.provider || "—"}${m.reason ? ` · ${m.reason}` : ""}`}
                  onDelete={async () => { await api.delete(`/health/medications/${m.id}`); await load(); }}
                />
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="conditions" className="mt-6">
          <Section eyebrow="Diagnoses" title="Conditions I manage"
            action={<AddDialog title="Add condition" testId="add-cond-btn" open={condOpen} setOpen={setCondOpen} onSubmit={saveCond}>
              <div><Label>Condition</Label><Input value={cond.name} onChange={(e) => setCond({...cond, name: e.target.value})} required data-testid="cond-name" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Diagnosed</Label><Input type="date" value={cond.diagnosed_at} onChange={(e) => setCond({...cond, diagnosed_at: e.target.value})} /></div>
                <div><Label>Provider</Label><Input value={cond.provider} onChange={(e) => setCond({...cond, provider: e.target.value})} /></div>
              </div>
              <div><Label>Care plan</Label><Textarea value={cond.plan} onChange={(e) => setCond({...cond, plan: e.target.value})} /></div>
              <div><Label>Notes</Label><Textarea value={cond.notes} onChange={(e) => setCond({...cond, notes: e.target.value})} /></div>
            </AddDialog>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {conditions.length === 0 && <EmptyHint>No conditions listed.</EmptyHint>}
              {conditions.map((c) => (
                <ListItemCard key={c.id} icon={ClipboardList} testId={`cond-${c.id}`}
                  title={c.name} subtitle={c.plan}
                  meta={`Diagnosed ${c.diagnosed_at || "—"}${c.provider ? ` · ${c.provider}` : ""}`}
                  onDelete={async () => { await api.delete(`/health/conditions/${c.id}`); await load(); }} />
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="appts" className="mt-6">
          <Section eyebrow="Upcoming & past" title="Appointments"
            action={<AddDialog title="Add appointment" testId="add-appt-btn" open={apptOpen} setOpen={setApptOpen} onSubmit={saveAppt}>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Provider</Label><Input value={appt.provider} onChange={(e) => setAppt({...appt, provider: e.target.value})} required data-testid="appt-provider" /></div>
                <div><Label>Location</Label><Input value={appt.location} onChange={(e) => setAppt({...appt, location: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>When</Label><Input type="datetime-local" value={appt.scheduled_at} onChange={(e) => setAppt({...appt, scheduled_at: e.target.value})} required data-testid="appt-when" /></div>
                <div><Label>Purpose</Label><Input value={appt.purpose} onChange={(e) => setAppt({...appt, purpose: e.target.value})} /></div>
              </div>
              <div><Label>Notes</Label><Textarea value={appt.notes} onChange={(e) => setAppt({...appt, notes: e.target.value})} /></div>
            </AddDialog>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appts.length === 0 && <EmptyHint>No appointments scheduled.</EmptyHint>}
              {appts.map((a) => (
                <ListItemCard key={a.id} icon={CalendarClock} testId={`appt-${a.id}`}
                  title={a.purpose || "Visit"} subtitle={`${a.provider}${a.location ? ` · ${a.location}` : ""}`}
                  meta={a.scheduled_at?.replace("T", " ").slice(0, 16)}
                  onDelete={async () => { await api.delete(`/health/appointments/${a.id}`); await load(); }} />
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="wellness" className="mt-6">
          <Section eyebrow="Track what matters" title="Wellness tracking"
            action={<AddDialog title="Log a wellness entry" testId="add-log-btn" open={logOpen} setOpen={setLogOpen} onSubmit={saveLog}>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Kind</Label>
                  <Select value={wl.kind} onValueChange={(v) => setWl({...wl, kind: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["sleep","mood","stress","weight","bp_sys","bp_dia","activity","hydration","nutrition","custom"].map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Value</Label><Input value={wl.value} onChange={(e) => setWl({...wl, value: e.target.value})} required data-testid="log-value" /></div>
                <div><Label>Unit</Label><Input value={wl.unit} onChange={(e) => setWl({...wl, unit: e.target.value})} placeholder="hours, mg, 1-10" /></div>
              </div>
              <div><Label>Note</Label><Textarea value={wl.note} onChange={(e) => setWl({...wl, note: e.target.value})} /></div>
            </AddDialog>}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {logs.length === 0 && <EmptyHint>No wellness logs yet.</EmptyHint>}
              {logs.map((l) => (
                <ListItemCard key={l.id} icon={Activity} testId={`log-${l.id}`}
                  title={`${l.kind}: ${l.value}${l.unit ? " " + l.unit : ""}`}
                  subtitle={l.note}
                  meta={(l.logged_at || "").replace("T", " ").slice(0, 16)}
                  onDelete={async () => { await api.delete(`/health/wellness-logs/${l.id}`); await load(); }} />
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="emergency" className="mt-6">
          <div className="bmb-card p-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-[#5B1A3A]/10 flex items-center justify-center text-[#5B1A3A]"><ShieldAlert className="w-5 h-5" /></div>
              <div className="flex-1">
                <div className="overline">Emergency Profile</div>
                <h2 className="font-display text-2xl text-[#1B1033]">Rapid-access info you choose to expose.</h2>
                <p className="text-xs text-slate-500 mt-1">Only shown when you explicitly enable this profile. QR access is a future feature.</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Enable</span>
                <Switch checked={!!ep.enabled} onCheckedChange={(v) => setEp({...ep, enabled: v})} data-testid="ep-enabled" />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><Label>Name</Label><Input value={ep.name || ""} onChange={(e) => setEp({...ep, name: e.target.value})} data-testid="ep-name" /></div>
              <div><Label>Date of birth</Label><Input type="date" value={ep.dob || ""} onChange={(e) => setEp({...ep, dob: e.target.value})} /></div>
              <div><Label>Blood type</Label><Input value={ep.blood_type || ""} onChange={(e) => setEp({...ep, blood_type: e.target.value})} placeholder="O+, A-, unknown" /></div>
              <div><Label>Allergies (comma)</Label><Input value={(ep.allergies || []).join(", ")} onChange={(e) => setEp({...ep, allergies: e.target.value.split(",").map(s=>s.trim()).filter(Boolean)})} data-testid="ep-allergies" /></div>
              <div className="md:col-span-2"><Label>Medications summary</Label><Textarea value={ep.medications_summary || ""} onChange={(e) => setEp({...ep, medications_summary: e.target.value})} /></div>
              <div className="md:col-span-2"><Label>Conditions summary</Label><Textarea value={ep.conditions_summary || ""} onChange={(e) => setEp({...ep, conditions_summary: e.target.value})} /></div>
              <div><Label>Organ donor</Label><Select value={String(ep.organ_donor ?? "")} onValueChange={(v) => setEp({...ep, organ_donor: v === "true"})}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div>
              <div><Label>DNR on file</Label><Select value={String(ep.dnr ?? "")} onValueChange={(v) => setEp({...ep, dnr: v === "true"})}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent></Select></div>
              <div className="md:col-span-2"><Label>Healthcare proxy / POA</Label><Input value={ep.healthcare_proxy?.name || ""} onChange={(e) => setEp({...ep, healthcare_proxy: {...(ep.healthcare_proxy||{}), name: e.target.value}})} placeholder="Name" /></div>
              <div className="md:col-span-2"><Label>Communication / accessibility needs</Label><Textarea value={ep.communication_needs || ""} onChange={(e) => setEp({...ep, communication_needs: e.target.value})} /></div>
            </div>

            <div className="mt-5">
              <Button onClick={saveEP} className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="ep-save-btn">Save Emergency Profile</Button>
              {ep.qr_slug && <span className="ml-3 text-xs text-slate-500">QR access token: <span className="font-mono">{ep.qr_slug}</span></span>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
