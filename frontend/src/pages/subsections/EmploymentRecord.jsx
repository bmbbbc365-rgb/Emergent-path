import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Briefcase } from "lucide-react";

export default function EmploymentRecord() {
  const [jobs, setJobs] = useState([]);
  const [income, setIncome] = useState([]);
  const [jobOpen, setJobOpen] = useState(false);
  const [incOpen, setIncOpen] = useState(false);
  const [job, setJob] = useState({ employer: "", job_title: "", start_date: "", end_date: "", status: "active", hours_per_week: "", pay_rate: "", pay_frequency: "hourly", notes: "" });
  const [inc, setInc] = useState({ job_id: "", pay_date: "", amount: "", hours: "", notes: "" });

  const load = async () => {
    const [j, i] = await Promise.all([api.get("/employment/jobs"), api.get("/employment/income")]);
    setJobs(j.data); setIncome(i.data);
  };
  useEffect(() => { load(); }, []);

  const saveJob = async (e) => {
    e.preventDefault();
    const body = { ...job, hours_per_week: job.hours_per_week ? Number(job.hours_per_week) : null, pay_rate: job.pay_rate ? Number(job.pay_rate) : null };
    await api.post("/employment/jobs", body);
    setJob({ employer: "", job_title: "", start_date: "", end_date: "", status: "active", hours_per_week: "", pay_rate: "", pay_frequency: "hourly", notes: "" });
    setJobOpen(false); await load();
  };
  const saveInc = async (e) => {
    e.preventDefault();
    await api.post("/employment/income", { ...inc, amount: Number(inc.amount), hours: inc.hours ? Number(inc.hours) : null });
    setInc({ job_id: "", pay_date: "", amount: "", hours: "", notes: "" });
    setIncOpen(false); await load();
  };
  const removeJob = async (id) => { await api.delete(`/employment/jobs/${id}`); await load(); };
  const removeInc = async (id) => { await api.delete(`/employment/income/${id}`); await load(); };

  const totalYTD = income.reduce((s, x) => s + (x.amount || 0), 0);

  return (
    <div className="space-y-8">
      <Section
        eyebrow="Employers"
        title="Your work history"
        action={
          <Dialog open={jobOpen} onOpenChange={setJobOpen}>
            <DialogTrigger asChild><Button className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033] gap-2" data-testid="add-job-btn"><Plus className="w-4 h-4" /> Add job</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add employer</DialogTitle></DialogHeader>
              <form onSubmit={saveJob} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Employer</Label><Input value={job.employer} onChange={(e) => setJob({ ...job, employer: e.target.value })} required data-testid="job-employer" /></div>
                  <div><Label>Job title</Label><Input value={job.job_title} onChange={(e) => setJob({ ...job, job_title: e.target.value })} required data-testid="job-title" /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Start date</Label><Input type="date" value={job.start_date} onChange={(e) => setJob({ ...job, start_date: e.target.value })} data-testid="job-start" /></div>
                  <div><Label>End date</Label><Input type="date" value={job.end_date} onChange={(e) => setJob({ ...job, end_date: e.target.value })} data-testid="job-end" /></div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Status</Label>
                    <Select value={job.status} onValueChange={(v) => setJob({ ...job, status: v })}>
                      <SelectTrigger data-testid="job-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="ended">Ended</SelectItem>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Hours/wk</Label><Input value={job.hours_per_week} onChange={(e) => setJob({ ...job, hours_per_week: e.target.value })} data-testid="job-hours" /></div>
                  <div><Label>Pay rate</Label><Input value={job.pay_rate} onChange={(e) => setJob({ ...job, pay_rate: e.target.value })} data-testid="job-pay" /></div>
                </div>
                <DialogFooter><Button type="submit" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="job-save-btn">Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {jobs.length === 0 && <EmptyHint>No jobs added yet.</EmptyHint>}
          {jobs.map((j) => (
            <div key={j.id} className="bmb-card p-5" data-testid={`job-${j.id}`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="overline">{j.status}</div>
                  <div className="font-display text-lg text-[#1B1033]">{j.employer}</div>
                  <div className="text-sm text-slate-600">{j.job_title}</div>
                </div>
                <button onClick={() => removeJob(j.id)} className="text-slate-300 hover:text-red-500" data-testid={`delete-job-${j.id}`}><Trash2 className="w-4 h-4" /></button>
              </div>
              <div className="mt-3 text-xs text-slate-500 grid grid-cols-2 gap-2">
                <div>Start: {j.start_date || "—"}</div>
                <div>End: {j.end_date || "—"}</div>
                <div>Hours/wk: {j.hours_per_week ?? "—"}</div>
                <div>Pay: {j.pay_rate ? `$${j.pay_rate}` : "—"}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Pay & hours"
        title="Income log"
        action={
          <Dialog open={incOpen} onOpenChange={setIncOpen}>
            <DialogTrigger asChild><Button className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white gap-2" data-testid="add-income-btn"><Plus className="w-4 h-4" /> Log paycheck</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Log a paycheck</DialogTitle></DialogHeader>
              <form onSubmit={saveInc} className="space-y-3">
                <div><Label>Job</Label>
                  <Select value={inc.job_id} onValueChange={(v) => setInc({ ...inc, job_id: v })}>
                    <SelectTrigger data-testid="inc-job"><SelectValue placeholder="Choose employer" /></SelectTrigger>
                    <SelectContent>{jobs.map((j) => <SelectItem key={j.id} value={j.id}>{j.employer}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div><Label>Pay date</Label><Input type="date" value={inc.pay_date} onChange={(e) => setInc({ ...inc, pay_date: e.target.value })} required data-testid="inc-date" /></div>
                  <div><Label>Amount</Label><Input value={inc.amount} onChange={(e) => setInc({ ...inc, amount: e.target.value })} required data-testid="inc-amount" /></div>
                  <div><Label>Hours</Label><Input value={inc.hours} onChange={(e) => setInc({ ...inc, hours: e.target.value })} data-testid="inc-hours" /></div>
                </div>
                <DialogFooter><Button type="submit" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033]" data-testid="inc-save-btn">Save</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="bmb-card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-500">Total logged: <span className="text-[#1B1033] font-medium">${totalYTD.toFixed(2)}</span></div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> Participant-controlled record</div>
          </div>
          <div className="divide-y divide-slate-100">
            {income.length === 0 && <div className="p-6"><EmptyHint>No paychecks logged yet.</EmptyHint></div>}
            {income.map((i) => {
              const j = jobs.find((x) => x.id === i.job_id);
              return (
                <div key={i.id} className="px-5 py-3 flex items-center gap-3" data-testid={`income-${i.id}`}>
                  <div className="w-24 text-sm text-slate-500">{i.pay_date}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#1B1033]">{j?.employer || "—"}</div>
                    <div className="text-[11px] text-slate-400">{i.hours ? `${i.hours} hrs` : ""}</div>
                  </div>
                  <div className="text-[#1B1033] font-display text-lg">${Number(i.amount).toFixed(2)}</div>
                  <button onClick={() => removeInc(i.id)} className="text-slate-300 hover:text-red-500" data-testid={`delete-income-${i.id}`}><Trash2 className="w-4 h-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
}
