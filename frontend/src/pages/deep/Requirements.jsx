import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint, ProgressBar } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Shield, DollarSign, Gavel, CalendarClock, User2, ClipboardList, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import HubLDTG from "@/components/HubLDTG";
import RequirementEvidence from "@/components/RequirementEvidence";

const TYPES = [
  { v: "supervision_officer", l: "Supervision officer (contact)", icon: User2 },
  { v: "check_in", l: "Check-in", icon: CalendarClock },
  { v: "drug_test", l: "Drug testing", icon: ClipboardList },
  { v: "ankle_monitor", l: "Ankle monitor", icon: Shield },
  { v: "class", l: "Required class/program", icon: ClipboardList },
  { v: "community_service", l: "Community service", icon: ClipboardList },
  { v: "court_date", l: "Court date / hearing", icon: Gavel },
  { v: "restitution", l: "Restitution", icon: DollarSign },
  { v: "fees", l: "Fines / fees", icon: DollarSign },
  { v: "curfew", l: "Curfew", icon: CalendarClock },
  { v: "residence", l: "Residence", icon: Shield },
  { v: "employment", l: "Employment requirement", icon: ClipboardList },
  { v: "other", l: "Other", icon: ClipboardList },
];
const RECURR = ["one-time", "daily", "weekly", "biweekly", "monthly", "random"];
const STATUSES = ["open", "in_progress", "done", "waived"];

export default function Requirements() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: "check_in", description: "", agency: "", person: "", start_date: "", due_date: "", recurrence: "one-time",
    status: "open", amount_due: "", amount_paid: "", appointment_at: "", notes: "", reminder_days_before: 1 });

  const load = async () => setItems((await api.get("/requirements")).data);
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const payload = {...f};
    ["amount_due","amount_paid"].forEach((k)=>{ payload[k] = payload[k] === "" ? null : Number(payload[k]); });
    await api.post("/requirements", payload);
    toast.success("Requirement saved");
    setOpen(false); setF({ type: "check_in", description: "", agency: "", person: "", start_date: "", due_date: "", recurrence: "one-time",
      status: "open", amount_due: "", amount_paid: "", appointment_at: "", notes: "", reminder_days_before: 1 });
    await load();
  };
  const updateStatus = async (id, status) => { await api.patch(`/requirements/${id}`, { status }); await load(); };
  const remove = async (id) => { await api.delete(`/requirements/${id}`); await load(); };
  const logPayment = async (r) => {
    const amt = Number(prompt(`Log a payment for "${r.description}"`, ""));
    if (!amt || amt <= 0) return;
    await api.patch(`/requirements/${r.id}`, { amount_paid: (r.amount_paid || 0) + amt });
    toast.success("Payment logged"); await load();
  };

  const totalDue = items.reduce((s, r) => s + (r.amount_due || 0), 0);
  const totalPaid = items.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const owed = Math.max(0, totalDue - totalPaid);
  const balancePct = totalDue > 0 ? Math.round(totalPaid / totalDue * 100) : 0;

  const byType = TYPES.map((t) => ({ ...t, items: items.filter((x) => x.type === t.v) })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-8" data-testid="requirements-page">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Shield className="w-6 h-6" /></div>
          <div className="flex-1">
            <div className="overline">Release Requirements & Supervision</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Organize what's required.</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">This is your private record. A Path Forward does not determine legal requirements and does not replace probation, parole, courts, or supervising agencies — you record and organize information you've received.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bmb-card p-4"><div className="overline">Total records</div><div className="font-display text-3xl text-[#1B1033]">{items.length}</div></div>
          <div className="bmb-card p-4"><div className="overline">Balance owed</div><div className="font-display text-3xl text-[#1B1033]">${owed.toFixed(2)}</div></div>
          <div className="bmb-card p-4"><div className="overline">Paid to date</div><div className="font-display text-3xl text-[#1B1033]">${totalPaid.toFixed(2)}</div></div>
          <div className="bmb-card p-4"><div className="overline">Payment progress</div><ProgressBar pct={balancePct} /><div className="text-xs text-slate-500 mt-2">{balancePct}%</div></div>
        </div>
      </div>

      <HubLDTG
        eyebrow="For your requirements"
        learn={[
          { title: "Decision-Making Framework", description: "Pause → name → weigh → choose. Great for tough calls with supervision or court.", courseId: undefined, route: "/app/library" },
          { title: "Handling Rejection & Setbacks", description: "Reset routine + Support Circle path.", route: "/app/library" },
          { title: "Recognizing Scams & Manipulation", description: "Common red flags for fees, calls, or 'quick fix' offers.", route: "/app/library" },
        ]}
        doActions={[
          { label: "Scan / upload evidence", route: "/app/documents/scan", testId: "ldtg-req-scan" },
          { label: "Open Support Circle", route: "/app/section/support-circle", testId: "ldtg-req-support" },
          { label: "Open Documents", route: "/app/section/documents", testId: "ldtg-req-docs" },
        ]}
        track={[
          { label: "Requirement records", value: items.length, route: undefined },
          { label: "Balance owed", value: `$${owed.toFixed(2)}`, hint: `${balancePct}% paid` },
          { label: "Paid to date", value: `$${totalPaid.toFixed(2)}` },
        ]}
        help={[
          { label: "Suicide & Crisis Lifeline", phone: "988", hint: "Free, confidential, 24/7." },
          { label: "SAMHSA National Helpline", phone: "1-800-662-4357", hint: "Substance use / mental health." },
          { label: "Approved re-entry resources", route: "/app/section/independent-living" },
          { label: "Ask Bridge for help", route: "/app" },
        ]}
      />

      <Section eyebrow="Add a record" title="Requirement records"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-req-btn"><Plus className="w-4 h-4" /> Add requirement</Button></DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Add requirement</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Type</Label>
                    <Select value={f.type} onValueChange={(v) => setF({...f, type: v})}>
                      <SelectTrigger data-testid="req-type"><SelectValue /></SelectTrigger>
                      <SelectContent>{TYPES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Status</Label>
                    <Select value={f.status} onValueChange={(v) => setF({...f, status: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Description</Label><Input value={f.description} onChange={(e) => setF({...f, description: e.target.value})} required data-testid="req-desc" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Agency</Label><Input value={f.agency} onChange={(e) => setF({...f, agency: e.target.value})} data-testid="req-agency" /></div>
                  <div><Label>Person</Label><Input value={f.person} onChange={(e) => setF({...f, person: e.target.value})} data-testid="req-person" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Start</Label><Input type="date" value={f.start_date} onChange={(e) => setF({...f, start_date: e.target.value})} /></div>
                  <div><Label>Due</Label><Input type="date" value={f.due_date} onChange={(e) => setF({...f, due_date: e.target.value})} data-testid="req-due" /></div>
                  <div><Label>Recurrence</Label>
                    <Select value={f.recurrence} onValueChange={(v) => setF({...f, recurrence: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RECURR.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Amount due</Label><Input value={f.amount_due} onChange={(e) => setF({...f, amount_due: e.target.value})} placeholder="$" /></div>
                  <div><Label>Amount paid</Label><Input value={f.amount_paid} onChange={(e) => setF({...f, amount_paid: e.target.value})} placeholder="$" /></div>
                  <div><Label>Appointment</Label><Input type="datetime-local" value={f.appointment_at} onChange={(e) => setF({...f, appointment_at: e.target.value})} /></div>
                </div>
                <div><Label>Notes</Label><Textarea value={f.notes} onChange={(e) => setF({...f, notes: e.target.value})} /></div>
                <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="req-save-btn">Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        {byType.length === 0 && <EmptyHint>No requirements yet. Add what you were told to complete after release.</EmptyHint>}
        <div className="space-y-6">
          {byType.map((g) => {
            const Icon = g.icon;
            return (
              <div key={g.v}>
                <div className="flex items-center gap-2 mb-3 text-[#1B1033]">
                  <Icon className="w-4 h-4" /><div className="overline">{g.l}</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {g.items.map((r) => {
                    const bal = Math.max(0, (r.amount_due || 0) - (r.amount_paid || 0));
                    return (
                      <div key={r.id} className="bmb-card p-5" data-testid={`req-${r.id}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">{r.status}</div>
                            <div className="font-display text-lg text-[#1B1033] mt-1">{r.description}</div>
                            {r.agency && <div className="text-xs text-slate-500 mt-0.5">{r.agency}{r.person ? ` · ${r.person}` : ""}</div>}
                          </div>
                          <button onClick={() => remove(r.id)} className="text-slate-300 hover:text-red-500" data-testid={`del-req-${r.id}`}><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <div className="mt-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
                          {r.due_date && <div>Due: <span className="text-[#1B1033]">{r.due_date}</span></div>}
                          {r.recurrence && <div>Recurrence: {r.recurrence}</div>}
                          {(r.amount_due || 0) > 0 && <div className="col-span-2">Paid: ${Number(r.amount_paid || 0).toFixed(2)} of ${Number(r.amount_due).toFixed(2)} (balance ${bal.toFixed(2)})</div>}
                          {r.appointment_at && <div className="col-span-2">Appointment: {r.appointment_at.replace("T", " ")}</div>}
                        </div>
                        {r.notes && <div className="mt-2 text-xs text-slate-500 italic">"{r.notes}"</div>}
                        <div className="mt-4 flex items-center gap-2">
                          {(r.amount_due || 0) > 0 && (
                            <Button onClick={() => logPayment(r)} className="rounded-full h-8 bg-[#B76E79] hover:bg-[#8E4E5A] text-white text-xs" data-testid={`pay-req-${r.id}`}>Log payment</Button>
                          )}
                          {r.status !== "done" && <Button onClick={() => updateStatus(r.id, "done")} className="rounded-full h-8 bg-[#1B1033] hover:bg-[#2A1848] text-white text-xs" data-testid={`done-req-${r.id}`}>Mark done</Button>}
                          {r.status === "done" && <Button onClick={() => updateStatus(r.id, "open")} className="rounded-full h-8 bg-white border border-slate-300 text-[#1B1033] text-xs">Reopen</Button>}
                        </div>
                        <RequirementEvidence requirement={r} onChanged={load} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <div className="bmb-card p-5 border-l-4 border-[#5B1A3A] flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#5B1A3A] mt-0.5" />
        <div className="text-xs text-slate-600">A Path Forward is education, organization, accountability, and opportunity — not a substitute for your PO, court, or attorney. Always follow the instructions given to you by supervising authorities.</div>
      </div>
    </div>
  );
}
