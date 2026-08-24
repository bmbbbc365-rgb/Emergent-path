import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { SECTIONS } from "@/lib/sections";
import { Lock, Plus, Trash2, ShieldCheck } from "lucide-react";

export default function Privacy() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [s, setS] = useState({ section: "requirements", shared_with_email: "", shared_with_role: "program-partner", permission_level: "view", note: "" });

  const load = async () => setItems((await api.get("/sharing")).data);
  useEffect(() => { load(); }, []);

  const save = async (e) => { e.preventDefault(); await api.post("/sharing", s); setOpen(false); await load(); };
  const revoke = async (id) => { await api.delete(`/sharing/${id}`); await load(); };

  return (
    <div className="space-y-8" data-testid="privacy-page">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#B76E79]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Lock className="w-6 h-6" /></div>
          <div>
            <div className="overline">Privacy first</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Your journey. Your information. You control what is shared.</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">Nothing in your Blueprint becomes visible to employers, sponsors, family, or programs unless you grant explicit permission. This is not surveillance software.</p>
          </div>
        </div>
      </div>

      <Section eyebrow="What you've shared" title="Sharing permissions"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033] gap-2" data-testid="add-share-btn"><Plus className="w-4 h-4" /> Grant access</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Grant access to a section</DialogTitle></DialogHeader>
              <form onSubmit={save} className="space-y-3">
                <div><Label>Section</Label>
                  <Select value={s.section} onValueChange={(v) => setS({ ...s, section: v })}>
                    <SelectTrigger data-testid="share-section"><SelectValue /></SelectTrigger>
                    <SelectContent>{SECTIONS.map((x) => <SelectItem key={x.key} value={x.key}>{x.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Recipient email</Label><Input type="email" value={s.shared_with_email} onChange={(e) => setS({ ...s, shared_with_email: e.target.value })} required data-testid="share-email" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Role</Label>
                    <Select value={s.shared_with_role} onValueChange={(v) => setS({ ...s, shared_with_role: v })}>
                      <SelectTrigger data-testid="share-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="program-partner">Program partner</SelectItem>
                        <SelectItem value="employer">Employer</SelectItem>
                        <SelectItem value="sponsor">Sponsor</SelectItem>
                        <SelectItem value="family">Family</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Level</Label>
                    <Select value={s.permission_level} onValueChange={(v) => setS({ ...s, permission_level: v })}>
                      <SelectTrigger data-testid="share-level"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">View only</SelectItem>
                        <SelectItem value="verify">Verify progress</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Note (why you're sharing)</Label><Textarea value={s.note} onChange={(e) => setS({ ...s, note: e.target.value })} data-testid="share-note" /></div>
                <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="share-save-btn">Grant access</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.length === 0 && <EmptyHint>No sharing granted. Everything in your Blueprint is private to you.</EmptyHint>}
          {items.map((x) => (
            <div key={x.id} className="bmb-card p-5" data-testid={`share-${x.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="overline">{x.shared_with_role} · {x.permission_level}</div>
                  <div className="font-display text-lg text-[#1B1033] mt-1">{x.shared_with_email}</div>
                  <div className="text-xs text-slate-500 mt-1">Section: {x.section}</div>
                  {x.note && <div className="text-xs text-slate-500 mt-2 italic">"{x.note}"</div>}
                </div>
                <button onClick={() => revoke(x.id)} className="text-slate-300 hover:text-red-500" data-testid={`revoke-share-${x.id}`}><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="mt-3 text-[11px] text-slate-400 inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> You can revoke access anytime.</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
