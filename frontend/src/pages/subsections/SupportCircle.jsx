import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Phone, Mail, MessageSquare, Users2, Plus, Trash2 } from "lucide-react";

const CATEGORIES = [
  { v: "recovery", l: "Recovery support" },
  { v: "transportation", l: "Transportation" },
  { v: "employment", l: "Employment" },
  { v: "family", l: "Family / children" },
  { v: "practical", l: "Practical help" },
  { v: "financial", l: "Financial emergency" },
  { v: "professional", l: "Professional support" },
];

const METHOD_ICONS = { phone: Phone, text: MessageSquare, email: Mail, "in-person": Users2 };

export default function SupportCircle() {
  const [contacts, setContacts] = useState([]);
  const [open, setOpen] = useState(false);
  const [c, setC] = useState({ name: "", role: "", category: "practical", contact_method: "phone", contact_value: "", when_to_contact: "", notes: "" });

  const load = async () => setContacts((await api.get("/support-circle")).data);
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api.post("/support-circle", c);
    setC({ name: "", role: "", category: "practical", contact_method: "phone", contact_value: "", when_to_contact: "", notes: "" });
    setOpen(false); await load();
  };
  const remove = async (id) => { await api.delete(`/support-circle/${id}`); await load(); };

  const grouped = CATEGORIES.map((cat) => ({ ...cat, items: contacts.filter((x) => x.category === cat.v) }));

  return (
    <Section
      eyebrow="Your trusted people"
      title="Support Circle"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033] gap-2" data-testid="add-contact-btn"><Plus className="w-4 h-4" /> Add person</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add to your Support Circle</DialogTitle></DialogHeader>
            <form onSubmit={save} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Name</Label><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} required data-testid="contact-name" /></div>
                <div><Label>Role</Label><Input value={c.role} onChange={(e) => setC({ ...c, role: e.target.value })} placeholder="Sponsor, aunt, case worker…" data-testid="contact-role" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Category</Label>
                  <Select value={c.category} onValueChange={(v) => setC({ ...c, category: v })}>
                    <SelectTrigger data-testid="contact-category"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((x) => <SelectItem key={x.v} value={x.v}>{x.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Contact method</Label>
                  <Select value={c.contact_method} onValueChange={(v) => setC({ ...c, contact_method: v })}>
                    <SelectTrigger data-testid="contact-method"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="phone">Phone</SelectItem>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="in-person">In-person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Contact info</Label><Input value={c.contact_value} onChange={(e) => setC({ ...c, contact_value: e.target.value })} required data-testid="contact-value" /></div>
              <div><Label>When to reach them</Label><Textarea value={c.when_to_contact} onChange={(e) => setC({ ...c, when_to_contact: e.target.value })} data-testid="contact-when" /></div>
              <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="contact-save-btn">Save</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {grouped.map((g) => (
          <div key={g.v} className="bmb-card p-5">
            <div className="overline">{g.l}</div>
            <div className="mt-3 space-y-3">
              {g.items.length === 0 && <div className="text-xs text-slate-400">No one added yet.</div>}
              {g.items.map((x) => {
                const Icon = METHOD_ICONS[x.contact_method] || Phone;
                return (
                  <div key={x.id} className="flex items-start gap-3 border-t border-slate-100 pt-3" data-testid={`contact-${x.id}`}>
                    <div className="w-9 h-9 rounded-full bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Icon className="w-4 h-4" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[#1B1033]">{x.name} <span className="text-slate-400 font-normal">· {x.role}</span></div>
                      <div className="text-xs text-slate-500 truncate">{x.contact_value}</div>
                      {x.when_to_contact && <div className="text-[11px] text-slate-400 mt-0.5">When: {x.when_to_contact}</div>}
                    </div>
                    <button onClick={() => remove(x.id)} className="text-slate-300 hover:text-red-500" data-testid={`delete-contact-${x.id}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
