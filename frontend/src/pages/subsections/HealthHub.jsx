import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pill, CalendarClock, ShieldCheck, ClipboardList } from "lucide-react";

const KINDS = [
  { v: "medication", l: "Medication", icon: Pill },
  { v: "condition", l: "Condition", icon: ClipboardList },
  { v: "appointment", l: "Appointment", icon: CalendarClock },
  { v: "insurance", l: "Insurance", icon: ShieldCheck },
  { v: "record", l: "Health record", icon: ClipboardList },
];

export function GenericHub({ hub, title, eyebrow, kinds, description }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [it, setIt] = useState({ hub, kind: kinds[0].v, name: "", details: {}, date: "" });
  const [detailsText, setDetailsText] = useState("");

  const load = async () => setItems((await api.get("/hub-items", { params: { hub } })).data);
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [hub]);

  const save = async (e) => {
    e.preventDefault();
    let details = {};
    if (detailsText.trim()) { try { details = JSON.parse(detailsText); } catch { details = { note: detailsText }; } }
    await api.post("/hub-items", { ...it, details, date: it.date || null });
    setIt({ hub, kind: kinds[0].v, name: "", details: {}, date: "" }); setDetailsText("");
    setOpen(false); await load();
  };
  const remove = async (id) => { await api.delete(`/hub-items/${id}`); await load(); };

  return (
    <Section eyebrow={eyebrow} title={title}
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033] gap-2" data-testid={`add-${hub}-btn`}><Plus className="w-4 h-4" /> Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to {title}</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <Select value={it.kind} onValueChange={(v) => setIt({ ...it, kind: v })}>
                    <SelectTrigger data-testid={`${hub}-kind`}><SelectValue /></SelectTrigger>
                    <SelectContent>{kinds.map((k) => <SelectItem key={k.v} value={k.v}>{k.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Date (optional)</Label><Input type="date" value={it.date} onChange={(e) => setIt({ ...it, date: e.target.value })} data-testid={`${hub}-date`} /></div>
              </div>
              <div><Label>Name / title</Label><Input value={it.name} onChange={(e) => setIt({ ...it, name: e.target.value })} required data-testid={`${hub}-name`} /></div>
              <div><Label>Details (free text or JSON)</Label><Input value={detailsText} onChange={(e) => setDetailsText(e.target.value)} placeholder="e.g. Every morning, 10mg" data-testid={`${hub}-details`} /></div>
              <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid={`${hub}-save-btn`}>Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      {description && <p className="text-xs text-slate-500 mb-3">{description}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.length === 0 && <EmptyHint>No items yet.</EmptyHint>}
        {items.map((x) => {
          const KIcon = (kinds.find((k) => k.v === x.kind) || {}).icon || ClipboardList;
          return (
            <div key={x.id} className="bmb-card p-4 flex items-start gap-3" data-testid={`${hub}-item-${x.id}`}>
              <div className="w-9 h-9 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><KIcon className="w-4 h-4" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest text-slate-400">{x.kind}</div>
                <div className="text-sm font-medium text-[#1B1033]">{x.name}</div>
                {x.date && <div className="text-[11px] text-slate-500">Date: {x.date}</div>}
                {x.details && Object.keys(x.details).length > 0 && (
                  <div className="text-[11px] text-slate-500 mt-1">{Object.entries(x.details).map(([k,v]) => `${k}: ${v}`).join(" · ")}</div>
                )}
              </div>
              <button onClick={() => remove(x.id)} className="text-slate-300 hover:text-red-500" data-testid={`delete-${hub}-${x.id}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

export default function HealthHub() {
  return (
    <GenericHub
      hub="health"
      eyebrow="Health, organized privately"
      title="Health Hub"
      kinds={KINDS}
      description="Educational and organizational only. Not medical advice, diagnosis, or treatment."
    />
  );
}
