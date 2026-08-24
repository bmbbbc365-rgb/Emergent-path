import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { House, Plus, Trash2, Zap, Wrench, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const UKINDS = ["electricity","water","gas","internet","trash","phone","other"];

export default function HomeHubDeep() {
  const [housing, setHousing] = useState([]);
  const [utils, setUtils] = useState([]);
  const [hOpen, setHOpen] = useState(false);
  const [uOpen, setUOpen] = useState(false);
  const [h, setH] = useState({ status: "transitional", type: "", address: "", move_in: "", lease_start: "", lease_end: "", rent: "", landlord_name: "", landlord_contact: "", insurance: "", notes: "" });
  const [u, setU] = useState({ kind: "electricity", provider: "", account_number: "", monthly_estimate: "", autopay: false, notes: "" });

  const load = async () => {
    const [hh, uu] = await Promise.all([api.get("/housing/records"), api.get("/housing/utilities")]);
    setHousing(hh.data); setUtils(uu.data);
  };
  useEffect(() => { load(); }, []);

  const saveH = async (e) => { e.preventDefault();
    const payload = {...h, rent: h.rent === "" ? null : Number(h.rent)};
    await api.post("/housing/records", payload); toast.success("Housing saved"); setHOpen(false);
    setH({ status: "transitional", type: "", address: "", move_in: "", lease_start: "", lease_end: "", rent: "", landlord_name: "", landlord_contact: "", insurance: "", notes: "" });
    await load();
  };
  const saveU = async (e) => { e.preventDefault();
    const payload = {...u, monthly_estimate: u.monthly_estimate === "" ? null : Number(u.monthly_estimate)};
    await api.post("/housing/utilities", payload); toast.success("Utility saved"); setUOpen(false);
    setU({ kind: "electricity", provider: "", account_number: "", monthly_estimate: "", autopay: false, notes: "" });
    await load();
  };
  const rmH = async (id) => { await api.delete(`/housing/records/${id}`); await load(); };
  const rmU = async (id) => { await api.delete(`/housing/utilities/${id}`); await load(); };

  const totalMonthly = utils.reduce((s, x) => s + (x.monthly_estimate || 0), 0);

  return (
    <div className="space-y-8" data-testid="home-hub">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><House className="w-6 h-6" /></div>
          <div>
            <div className="overline">Home Hub</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Getting back on your feet.</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">Track housing, utilities, and household basics needed for stability. This is the re-entry-focused view of the larger Build My Blueprint Home Hub.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="housing">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="housing" data-testid="tab-housing">Housing</TabsTrigger>
          <TabsTrigger value="utilities" data-testid="tab-utilities">Utilities</TabsTrigger>
          <TabsTrigger value="safety" data-testid="tab-safety">Safety & maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="housing" className="mt-6">
          <Section eyebrow="Where I live" title="Housing records"
            action={
              <Dialog open={hOpen} onOpenChange={setHOpen}>
                <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-housing-btn"><Plus className="w-4 h-4" /> Add housing</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add housing record</DialogTitle></DialogHeader>
                  <form onSubmit={saveH} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Status</Label>
                        <Select value={h.status} onValueChange={(v) => setH({...h, status: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["searching","transitional","renting","owning","staying with family","shelter","other"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Type</Label><Input value={h.type} onChange={(e) => setH({...h, type: e.target.value})} placeholder="Apartment, room, house…" /></div>
                    </div>
                    <div><Label>Address</Label><Input value={h.address} onChange={(e) => setH({...h, address: e.target.value})} data-testid="housing-address" /></div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Move in</Label><Input type="date" value={h.move_in} onChange={(e) => setH({...h, move_in: e.target.value})} /></div>
                      <div><Label>Lease start</Label><Input type="date" value={h.lease_start} onChange={(e) => setH({...h, lease_start: e.target.value})} /></div>
                      <div><Label>Lease end</Label><Input type="date" value={h.lease_end} onChange={(e) => setH({...h, lease_end: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Rent</Label><Input value={h.rent} onChange={(e) => setH({...h, rent: e.target.value})} placeholder="$" /></div>
                      <div><Label>Landlord</Label><Input value={h.landlord_name} onChange={(e) => setH({...h, landlord_name: e.target.value})} /></div>
                      <div><Label>Contact</Label><Input value={h.landlord_contact} onChange={(e) => setH({...h, landlord_contact: e.target.value})} /></div>
                    </div>
                    <div><Label>Renters insurance</Label><Input value={h.insurance} onChange={(e) => setH({...h, insurance: e.target.value})} /></div>
                    <div><Label>Notes</Label><Textarea value={h.notes} onChange={(e) => setH({...h, notes: e.target.value})} /></div>
                    <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white">Save</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {housing.length === 0 && <EmptyHint>No housing record yet.</EmptyHint>}
              {housing.map((r) => (
                <div key={r.id} className="bmb-card p-5" data-testid={`housing-${r.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="overline">{r.status}</div>
                      <div className="font-display text-lg text-[#1B1033] mt-1">{r.type || "Home"}</div>
                      <div className="text-xs text-slate-500">{r.address}</div>
                    </div>
                    <button onClick={() => rmH(r.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
                    {r.rent !== null && r.rent !== undefined && <div>Rent: <span className="text-[#1B1033]">${r.rent}</span></div>}
                    {r.move_in && <div>Move in: {r.move_in}</div>}
                    {r.lease_end && <div>Lease ends: {r.lease_end}</div>}
                    {r.landlord_name && <div>Landlord: {r.landlord_name}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="utilities" className="mt-6">
          <Section eyebrow="Services & accounts" title={`Utilities · ~$${totalMonthly.toFixed(0)}/mo estimated`}
            action={
              <Dialog open={uOpen} onOpenChange={setUOpen}>
                <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-util-btn"><Plus className="w-4 h-4" /> Add utility</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add a utility</DialogTitle></DialogHeader>
                  <form onSubmit={saveU} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Kind</Label>
                        <Select value={u.kind} onValueChange={(v) => setU({...u, kind: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{UKINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Provider</Label><Input value={u.provider} onChange={(e) => setU({...u, provider: e.target.value})} required data-testid="util-provider" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Account #</Label><Input value={u.account_number} onChange={(e) => setU({...u, account_number: e.target.value})} /></div>
                      <div><Label>Monthly $</Label><Input value={u.monthly_estimate} onChange={(e) => setU({...u, monthly_estimate: e.target.value})} /></div>
                    </div>
                    <div><Label>Notes</Label><Textarea value={u.notes} onChange={(e) => setU({...u, notes: e.target.value})} /></div>
                    <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white">Save</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {utils.length === 0 && <EmptyHint>No utilities yet.</EmptyHint>}
              {utils.map((x) => (
                <div key={x.id} className="bmb-card p-4 flex items-start gap-3" data-testid={`util-${x.id}`}>
                  <div className="w-9 h-9 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Zap className="w-4 h-4" /></div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest text-slate-400">{x.kind}</div>
                    <div className="text-sm font-medium text-[#1B1033]">{x.provider}</div>
                    <div className="text-[11px] text-slate-500">{x.account_number ? `Acct ${x.account_number} · ` : ""}~${x.monthly_estimate || 0}/mo</div>
                  </div>
                  <button onClick={() => rmU(x.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="safety" className="mt-6">
          <Section eyebrow="Household basics" title="Safety, maintenance & reminders">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {icon: ShieldAlert, t: "Test smoke & CO detectors", d: "Test monthly. Replace batteries at least once a year."},
                {icon: Wrench, t: "Change HVAC filters", d: "Every 90 days for most units."},
                {icon: ShieldAlert, t: "Know how to shut off water & power", d: "Locate the main water valve and breaker box."},
                {icon: Wrench, t: "Emergency kit basics", d: "Flashlight, batteries, water, first-aid, phone charger."},
              ].map((x, i) => (
                <div key={i} className="bmb-card p-5 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><x.icon className="w-4 h-4" /></div>
                  <div>
                    <div className="font-display text-lg text-[#1B1033]">{x.t}</div>
                    <div className="text-sm text-slate-600 mt-1">{x.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
