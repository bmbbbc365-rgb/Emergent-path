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
import { HandCoins, Plus, Trash2, Info, LifeBuoy, GraduationCap } from "lucide-react";
import { toast } from "sonner";

const KINDS = ["health","dental","vision","life","disability","critical","accident","medicaid","medicare","auto","renters","other"];
const EDUCATION = [
  { key: "how-health-works", title: "How health insurance works", body: "Premiums are what you pay every month. A deductible is what you pay before coverage starts. A copay is a fixed amount for a visit. Coinsurance is your share of a bill after the deductible. An out-of-pocket max caps what you'll pay in a plan year." },
  { key: "hmo-vs-ppo", title: "HMO vs PPO", body: "An HMO is usually lower cost, requires a primary care doctor and referrals for specialists, and works only in-network. A PPO is usually more expensive but lets you see specialists directly and use out-of-network care at a higher cost." },
  { key: "medicaid", title: "Medicaid basics", body: "Medicaid provides low-cost or no-cost health coverage for eligible people based on income and household. Rules vary by state. Coverage often includes doctor visits, hospitals, mental health, and prescriptions." },
  { key: "dental-vision", title: "Dental & vision", body: "These are usually separate from health insurance. Preventive care (cleanings, exams) is often covered fully. Major work (crowns, glasses) usually has waiting periods and cost-sharing." },
  { key: "life", title: "Life insurance", body: "Term life pays a benefit if you die within a set number of years and is usually the lowest cost. Whole life is permanent and more expensive. Name a beneficiary and keep it updated." },
  { key: "disability", title: "Disability coverage", body: "Short-term disability may replace part of your income for a few weeks/months. Long-term disability covers longer periods. Employer coverage is common; individual policies exist too." },
  { key: "beneficiaries", title: "Beneficiaries", body: "The person or people who receive a benefit when you die. Review beneficiaries at every life change (marriage, divorce, new child, job change)." },
  { key: "claims", title: "Claim basics", body: "A claim is how you ask an insurer to pay. Keep dates, providers, and receipts. Ask if the provider files for you or you file directly. Save the EOB (explanation of benefits) statements." },
];

export default function BenefitsHubDeep() {
  const [benefits, setBenefits] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selected, setSelected] = useState(null);
  const [open, setOpen] = useState(false);
  const [b, setB] = useState({ kind: "health", plan_name: "", carrier: "", member_id: "", group_id: "",
    deductible: "", copay: "", coinsurance: "", effective_date: "", renewal_date: "", monthly_premium: "",
    employer_provided: false, notes: "" });

  const load = async () => {
    const [x, s] = await Promise.all([api.get("/benefits"), api.get("/benefits/scenarios")]);
    setBenefits(x.data); setScenarios(s.data);
  };
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const payload = {...b};
    ["deductible","copay","coinsurance","monthly_premium"].forEach((k) => { payload[k] = payload[k] === "" ? null : Number(payload[k]); });
    await api.post("/benefits", payload); toast.success("Benefit saved"); setOpen(false);
    setB({ kind: "health", plan_name: "", carrier: "", member_id: "", group_id: "", deductible: "", copay: "", coinsurance: "", effective_date: "", renewal_date: "", monthly_premium: "", employer_provided: false, notes: "" });
    await load();
  };
  const remove = async (id) => { await api.delete(`/benefits/${id}`); await load(); };

  const scenarioBenefits = selected ? benefits.filter((x) => selected.relevant_kinds.includes(x.kind)) : [];

  return (
    <div className="space-y-8" data-testid="benefits-hub">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><HandCoins className="w-6 h-6" /></div>
          <div>
            <div className="overline">Benefits Hub</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Understand and use your coverage.</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">Add active benefits, learn how each type works, and get plain-language next steps for common life events. This is education — not eligibility or coverage guarantees.</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="active" data-testid="tab-active">My active benefits</TabsTrigger>
          <TabsTrigger value="when" data-testid="tab-when">When something happens</TabsTrigger>
          <TabsTrigger value="learn" data-testid="tab-learn">Learn about my benefits</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-6">
          <Section eyebrow="Coverage on file" title="Active benefits"
            action={
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-benefit-btn"><Plus className="w-4 h-4" /> Add benefit</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add a benefit</DialogTitle></DialogHeader>
                  <form onSubmit={save} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Type</Label>
                        <Select value={b.kind} onValueChange={(v) => setB({...b, kind: v})}>
                          <SelectTrigger data-testid="benefit-kind"><SelectValue /></SelectTrigger>
                          <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Plan name</Label><Input value={b.plan_name} onChange={(e) => setB({...b, plan_name: e.target.value})} required data-testid="benefit-plan" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Carrier</Label><Input value={b.carrier} onChange={(e) => setB({...b, carrier: e.target.value})} /></div>
                      <div><Label>Member ID</Label><Input value={b.member_id} onChange={(e) => setB({...b, member_id: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Deductible</Label><Input value={b.deductible} onChange={(e) => setB({...b, deductible: e.target.value})} placeholder="$" /></div>
                      <div><Label>Copay</Label><Input value={b.copay} onChange={(e) => setB({...b, copay: e.target.value})} placeholder="$" /></div>
                      <div><Label>Coinsurance %</Label><Input value={b.coinsurance} onChange={(e) => setB({...b, coinsurance: e.target.value})} placeholder="20" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Effective</Label><Input type="date" value={b.effective_date} onChange={(e) => setB({...b, effective_date: e.target.value})} /></div>
                      <div><Label>Renewal</Label><Input type="date" value={b.renewal_date} onChange={(e) => setB({...b, renewal_date: e.target.value})} /></div>
                    </div>
                    <div><Label>Monthly premium</Label><Input value={b.monthly_premium} onChange={(e) => setB({...b, monthly_premium: e.target.value})} placeholder="$" /></div>
                    <div><Label>Notes</Label><Textarea value={b.notes} onChange={(e) => setB({...b, notes: e.target.value})} /></div>
                    <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="benefit-save-btn">Save benefit</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {benefits.length === 0 && <EmptyHint>No benefits added yet. Start by adding your health coverage.</EmptyHint>}
              {benefits.map((x) => (
                <div key={x.id} className="bmb-card p-5" data-testid={`benefit-${x.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="overline">{x.kind}</div>
                      <div className="font-display text-lg text-[#1B1033] mt-1">{x.plan_name}</div>
                      <div className="text-xs text-slate-500">{x.carrier || "—"}</div>
                    </div>
                    <button onClick={() => remove(x.id)} className="text-slate-300 hover:text-red-500" data-testid={`del-benefit-${x.id}`}><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
                    {x.member_id && <div>ID: <span className="text-[#1B1033]">{x.member_id}</span></div>}
                    {x.deductible !== null && x.deductible !== undefined && <div>Deductible: ${x.deductible}</div>}
                    {x.copay !== null && x.copay !== undefined && <div>Copay: ${x.copay}</div>}
                    {x.coinsurance !== null && x.coinsurance !== undefined && <div>Coinsurance: {x.coinsurance}%</div>}
                    {x.monthly_premium !== null && x.monthly_premium !== undefined && <div>Premium: ${x.monthly_premium}/mo</div>}
                    {x.effective_date && <div>Effective: {x.effective_date}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="when" className="mt-6">
          <Section eyebrow="Guided help" title="When something happens" description="Pick a situation. We'll show which of your benefits may matter and general next steps to consider.">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {scenarios.map((sc) => (
                <button key={sc.id} onClick={() => setSelected(sc)} className={`rounded-xl px-4 py-3 text-sm text-left border transition ${selected?.id === sc.id ? "border-[#B76E79] bg-[#B76E79]/10 text-[#1B1033]" : "border-slate-200 bg-white hover:border-[#B76E79]/60"}`} data-testid={`scenario-${sc.id}`}>
                  <LifeBuoy className="w-4 h-4 mb-1.5 text-[#B76E79]" />
                  {sc.label}
                </button>
              ))}
            </div>
            {selected && (
              <div className="mt-6 bmb-card p-5">
                <div className="overline">Guidance</div>
                <h3 className="font-display text-xl text-[#1B1033] mt-1">{selected.label}</h3>
                <p className="text-sm text-slate-700 mt-2 leading-relaxed">{selected.guidance}</p>
                <div className="mt-4">
                  <div className="overline mb-2">Relevant benefits you've added</div>
                  {scenarioBenefits.length === 0 ? <EmptyHint>No matching benefits on file. Add them under "My active benefits".</EmptyHint> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {scenarioBenefits.map((x) => (
                        <div key={x.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
                          <div className="text-[11px] uppercase tracking-widest text-[#8E4E5A]">{x.kind}</div>
                          <div className="text-[#1B1033] font-medium">{x.plan_name}</div>
                          <div className="text-xs text-slate-500">{x.carrier}{x.member_id ? ` · ${x.member_id}` : ""}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 text-xs text-slate-500 flex items-start gap-2"><Info className="w-4 h-4 text-slate-400 mt-0.5" /> This is general guidance. Always confirm with your carrier, employer, or a qualified professional before making decisions.</div>
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="learn" className="mt-6">
          <Section eyebrow="Plain-language education" title="Learn about my benefits">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {EDUCATION.map((e) => (
                <div key={e.key} className="bmb-card p-5">
                  <div className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#B76E79]" /><div className="overline">Education</div></div>
                  <div className="font-display text-lg text-[#1B1033] mt-1">{e.title}</div>
                  <p className="text-sm text-slate-700 mt-2 leading-relaxed">{e.body}</p>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
