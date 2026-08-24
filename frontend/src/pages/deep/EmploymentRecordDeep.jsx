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
import { Briefcase, Plus, Trash2, ClipboardList, FileText } from "lucide-react";
import { toast } from "sonner";
import HubLDTG from "@/components/HubLDTG";

const APP_STATUS = ["applied","interviewing","offered","hired","closed","rejected","withdrawn"];

export default function EmploymentRecordDeep() {
  const [jobs, setJobs] = useState([]);
  const [income, setIncome] = useState([]);
  const [apps, setApps] = useState([]);
  const [resumes, setResumes] = useState([]);

  const [jOpen, setJOpen] = useState(false);
  const [iOpen, setIOpen] = useState(false);
  const [aOpen, setAOpen] = useState(false);
  const [rOpen, setROpen] = useState(false);
  const [j, setJ] = useState({ employer: "", job_title: "", supervisor: "", employer_address: "", start_date: "", end_date: "", status: "active", hours_per_week: "", pay_rate: "", pay_frequency: "hourly", salary_or_hourly: "hourly", notes: "" });
  const [inc, setInc] = useState({ job_id: "", pay_date: "", gross_pay: "", taxes: "", deductions: "", net_pay: "", hours: "", notes: "" });
  const [a, setA] = useState({ company: "", role: "", applied_at: "", status: "applied", source: "", location: "", notes: "" });
  const [r, setR] = useState({ title: "", summary: "" });

  const load = async () => {
    const [J, I, A, R] = await Promise.all([
      api.get("/employment/jobs"), api.get("/employment/income"),
      api.get("/employment/applications"), api.get("/employment/resumes"),
    ]);
    setJobs(J.data); setIncome(I.data); setApps(A.data); setResumes(R.data);
  };
  useEffect(() => { load(); }, []);

  const saveJob = async (e) => { e.preventDefault();
    const p = {...j, hours_per_week: j.hours_per_week ? Number(j.hours_per_week) : null, pay_rate: j.pay_rate ? Number(j.pay_rate) : null};
    await api.post("/employment/jobs", p); toast.success("Job saved"); setJOpen(false);
    setJ({ employer: "", job_title: "", supervisor: "", employer_address: "", start_date: "", end_date: "", status: "active", hours_per_week: "", pay_rate: "", pay_frequency: "hourly", salary_or_hourly: "hourly", notes: "" });
    await load();
  };
  const saveInc = async (e) => { e.preventDefault();
    const nums = {}; ["gross_pay","taxes","deductions","net_pay","hours"].forEach((k) => { nums[k] = inc[k] === "" ? null : Number(inc[k]); });
    await api.post("/employment/income", {...inc, ...nums}); toast.success("Pay logged"); setIOpen(false);
    setInc({ job_id: "", pay_date: "", gross_pay: "", taxes: "", deductions: "", net_pay: "", hours: "", notes: "" });
    await load();
  };
  const saveApp = async (e) => { e.preventDefault(); await api.post("/employment/applications", a); toast.success("Application logged"); setAOpen(false); setA({ company: "", role: "", applied_at: "", status: "applied", source: "", location: "", notes: "" }); await load(); };
  const saveRes = async (e) => { e.preventDefault(); await api.post("/employment/resumes", r); toast.success("Resume saved"); setROpen(false); setR({ title: "", summary: "" }); await load(); };

  const rm = async (path, id) => { await api.delete(`${path}/${id}`); await load(); };

  const totalGross = income.reduce((s, x) => s + (x.gross_pay || 0), 0);
  const totalNet = income.reduce((s, x) => s + (x.net_pay || 0), 0);

  return (
    <div className="space-y-8" data-testid="employment-record">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Briefcase className="w-6 h-6" /></div>
          <div>
            <div className="overline">Employment & Income Record</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Your work history — you control what's shared.</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">Employers, pay, taxes, hours, and job applications. Nothing here is exposed to anyone unless you explicitly grant a sharing permission.</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bmb-card p-4"><div className="overline">Active jobs</div><div className="font-display text-3xl text-[#1B1033]">{jobs.filter(x=>x.status==="active").length}</div></div>
          <div className="bmb-card p-4"><div className="overline">Applications</div><div className="font-display text-3xl text-[#1B1033]">{apps.length}</div></div>
          <div className="bmb-card p-4"><div className="overline">Gross logged</div><div className="font-display text-3xl text-[#1B1033]">${totalGross.toFixed(2)}</div></div>
          <div className="bmb-card p-4"><div className="overline">Net logged</div><div className="font-display text-3xl text-[#1B1033]">${totalNet.toFixed(2)}</div></div>
        </div>
      </div>

      <HubLDTG
        eyebrow="For your employment"
        learn={[
          { title: "Resume for fair-chance employers", description: "Format basics + language that works.", route: "/app/library" },
          { title: "Interview Basics", description: "Common questions + answering about your record.", route: "/app/library" },
          { title: "Personal Budgeting 101", description: "Fixed vs variable, 50/30/20 starter.", route: "/app/library" },
        ]}
        doActions={[
          { label: "Scan / upload employment doc", route: "/app/documents/scan", testId: "ldtg-emp-scan" },
          { label: "Add employer / job", onClick: () => setJOpen(true), testId: "ldtg-emp-add-job" },
          { label: "Log pay", onClick: () => setIOpen(true), testId: "ldtg-emp-log-pay" },
          { label: "Log application", onClick: () => setAOpen(true), testId: "ldtg-emp-log-app" },
          { label: "Employment Readiness", route: "/app/section/employment-readiness", testId: "ldtg-emp-readiness" },
        ]}
        track={[
          { label: "Active jobs", value: jobs.filter(x=>x.status==="active").length },
          { label: "Applications", value: apps.length },
          { label: "Pay logged", value: `$${totalGross.toFixed(2)}`, hint: `${income.length} entries` },
          { label: "Resumes", value: resumes.length },
        ]}
        help={[
          { label: "Approved workforce resources", route: "/app/section/independent-living" },
          { label: "Ask Bridge about work", route: "/app" },
        ]}
      />

      <Tabs defaultValue="jobs">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="jobs" data-testid="tab-jobs">Employers</TabsTrigger>
          <TabsTrigger value="pay" data-testid="tab-pay">Pay & hours</TabsTrigger>
          <TabsTrigger value="apps" data-testid="tab-apps">Applications</TabsTrigger>
          <TabsTrigger value="resumes" data-testid="tab-resumes">Resumes</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-6">
          <Section eyebrow="Work history" title="Employers"
            action={
              <Dialog open={jOpen} onOpenChange={setJOpen}>
                <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-job-btn"><Plus className="w-4 h-4" /> Add job</Button></DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader><DialogTitle>Add employer</DialogTitle></DialogHeader>
                  <form onSubmit={saveJob} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Employer</Label><Input value={j.employer} onChange={(e) => setJ({...j, employer: e.target.value})} required data-testid="job-employer" /></div>
                      <div><Label>Job title</Label><Input value={j.job_title} onChange={(e) => setJ({...j, job_title: e.target.value})} required /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Supervisor</Label><Input value={j.supervisor} onChange={(e) => setJ({...j, supervisor: e.target.value})} /></div>
                      <div><Label>Address</Label><Input value={j.employer_address} onChange={(e) => setJ({...j, employer_address: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Start</Label><Input type="date" value={j.start_date} onChange={(e) => setJ({...j, start_date: e.target.value})} /></div>
                      <div><Label>End</Label><Input type="date" value={j.end_date} onChange={(e) => setJ({...j, end_date: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Status</Label>
                        <Select value={j.status} onValueChange={(v) => setJ({...j, status: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{["active","ended","applied","interviewing","offered"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Hours/wk</Label><Input value={j.hours_per_week} onChange={(e) => setJ({...j, hours_per_week: e.target.value})} /></div>
                      <div><Label>Pay</Label><Input value={j.pay_rate} onChange={(e) => setJ({...j, pay_rate: e.target.value})} /></div>
                    </div>
                    <div><Label>Notes</Label><Textarea value={j.notes} onChange={(e) => setJ({...j, notes: e.target.value})} /></div>
                    <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white">Save</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.length === 0 && <EmptyHint>No jobs added.</EmptyHint>}
              {jobs.map((x) => (
                <div key={x.id} className="bmb-card p-5" data-testid={`job-${x.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="overline">{x.status}</div>
                      <div className="font-display text-lg text-[#1B1033] mt-1">{x.employer}</div>
                      <div className="text-sm text-slate-600">{x.job_title}</div>
                    </div>
                    <button onClick={() => rm("/employment/jobs", x.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="mt-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
                    <div>Start: {x.start_date || "—"}</div>
                    <div>End: {x.end_date || "—"}</div>
                    <div>Hours/wk: {x.hours_per_week ?? "—"}</div>
                    <div>Pay: {x.pay_rate ? `$${x.pay_rate}` : "—"}</div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="pay" className="mt-6">
          <Section eyebrow="Paychecks" title="Pay & hours"
            action={
              <Dialog open={iOpen} onOpenChange={setIOpen}>
                <DialogTrigger asChild><Button className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white gap-2" data-testid="add-income-btn"><Plus className="w-4 h-4" /> Log paycheck</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log paycheck</DialogTitle></DialogHeader>
                  <form onSubmit={saveInc} className="space-y-3">
                    <div><Label>Job</Label>
                      <Select value={inc.job_id} onValueChange={(v) => setInc({...inc, job_id: v})}>
                        <SelectTrigger><SelectValue placeholder="Choose employer" /></SelectTrigger>
                        <SelectContent>{jobs.map((x) => <SelectItem key={x.id} value={x.id}>{x.employer}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Pay date</Label><Input type="date" value={inc.pay_date} onChange={(e) => setInc({...inc, pay_date: e.target.value})} required /></div>
                      <div><Label>Hours</Label><Input value={inc.hours} onChange={(e) => setInc({...inc, hours: e.target.value})} /></div>
                      <div><Label>Gross</Label><Input value={inc.gross_pay} onChange={(e) => setInc({...inc, gross_pay: e.target.value})} required /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Taxes</Label><Input value={inc.taxes} onChange={(e) => setInc({...inc, taxes: e.target.value})} /></div>
                      <div><Label>Deductions</Label><Input value={inc.deductions} onChange={(e) => setInc({...inc, deductions: e.target.value})} /></div>
                      <div><Label>Net</Label><Input value={inc.net_pay} onChange={(e) => setInc({...inc, net_pay: e.target.value})} /></div>
                    </div>
                    <DialogFooter><Button type="submit" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white">Save</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          >
            <div className="bmb-card overflow-hidden">
              <div className="divide-y divide-slate-100">
                {income.length === 0 && <div className="p-6"><EmptyHint>No paychecks logged.</EmptyHint></div>}
                {income.map((x) => {
                  const j = jobs.find(y => y.id === x.job_id);
                  return (
                    <div key={x.id} className="px-5 py-3 flex items-center gap-3" data-testid={`inc-${x.id}`}>
                      <div className="w-24 text-sm text-slate-500">{x.pay_date}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1B1033]">{j?.employer || "—"}</div>
                        <div className="text-[11px] text-slate-400">{x.hours ? `${x.hours} hrs · ` : ""}Taxes ${(x.taxes || 0).toFixed(2)} · Ded ${(x.deductions || 0).toFixed(2)}</div>
                      </div>
                      <div className="text-right"><div className="text-xs text-slate-400">gross ${x.gross_pay?.toFixed(2)}</div><div className="text-[#1B1033] font-display text-lg">${(x.net_pay ?? x.gross_pay ?? 0).toFixed(2)}</div></div>
                      <button onClick={() => rm("/employment/income", x.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="apps" className="mt-6">
          <Section eyebrow="Job search" title="Applications"
            action={
              <Dialog open={aOpen} onOpenChange={setAOpen}>
                <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-app-btn"><Plus className="w-4 h-4" /> Log application</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Log job application</DialogTitle></DialogHeader>
                  <form onSubmit={saveApp} className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label>Company</Label><Input value={a.company} onChange={(e) => setA({...a, company: e.target.value})} required data-testid="app-company" /></div>
                      <div><Label>Role</Label><Input value={a.role} onChange={(e) => setA({...a, role: e.target.value})} required /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div><Label>Applied</Label><Input type="date" value={a.applied_at} onChange={(e) => setA({...a, applied_at: e.target.value})} /></div>
                      <div><Label>Status</Label>
                        <Select value={a.status} onValueChange={(v) => setA({...a, status: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{APP_STATUS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Source</Label><Input value={a.source} onChange={(e) => setA({...a, source: e.target.value})} /></div>
                    </div>
                    <div><Label>Notes</Label><Textarea value={a.notes} onChange={(e) => setA({...a, notes: e.target.value})} /></div>
                    <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white">Save</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apps.length === 0 && <EmptyHint>No applications yet.</EmptyHint>}
              {apps.map((x) => (
                <div key={x.id} className="bmb-card p-4 flex items-start gap-3" data-testid={`app-${x.id}`}>
                  <div className="w-9 h-9 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><ClipboardList className="w-4 h-4" /></div>
                  <div className="flex-1">
                    <div className="text-xs uppercase tracking-widest text-slate-400">{x.status}</div>
                    <div className="text-sm font-medium text-[#1B1033]">{x.company}</div>
                    <div className="text-xs text-slate-500">{x.role} · {x.applied_at || "—"}{x.source ? ` · ${x.source}` : ""}</div>
                  </div>
                  <button onClick={() => rm("/employment/applications", x.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="resumes" className="mt-6">
          <Section eyebrow="Resumes" title="My resumes"
            action={
              <Dialog open={rOpen} onOpenChange={setROpen}>
                <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-resume-btn"><Plus className="w-4 h-4" /> Add resume</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Add resume</DialogTitle></DialogHeader>
                  <form onSubmit={saveRes} className="space-y-3">
                    <div><Label>Title</Label><Input value={r.title} onChange={(e) => setR({...r, title: e.target.value})} required /></div>
                    <div><Label>Summary / notes</Label><Textarea value={r.summary} onChange={(e) => setR({...r, summary: e.target.value})} rows={6} /></div>
                    <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white">Save</Button></DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            }
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.length === 0 && <EmptyHint>No resumes yet. Upload the file in the Document Center too.</EmptyHint>}
              {resumes.map((x) => (
                <div key={x.id} className="bmb-card p-5" data-testid={`resume-${x.id}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="overline">Resume</div>
                      <div className="font-display text-lg text-[#1B1033] mt-1">{x.title}</div>
                      {x.summary && <div className="text-sm text-slate-600 mt-2 line-clamp-3">{x.summary}</div>}
                    </div>
                    <button onClick={() => rm("/employment/resumes", x.id)} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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
