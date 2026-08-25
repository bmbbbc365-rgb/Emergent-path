import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Users, Search, ArrowRight, Shield, Check, CornerUpLeft, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import StaffNotes from "@/components/StaffNotes";

const STATUS_STYLES = {
  not_started: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  evidence_submitted: "bg-amber-50 text-amber-800",
  needs_review: "bg-amber-100 text-amber-900",
  verified: "bg-emerald-50 text-emerald-700",
  returned: "bg-rose-50 text-rose-700",
  not_applicable: "bg-slate-50 text-slate-500",
};

export function StaffCaseload() {
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/staff/caseload");
        setRows(data || []);
      } catch (e) {
        toast.error("Not authorized for staff view");
      } finally { setLoading(false); }
    })();
  }, []);
  const filtered = rows.filter(r => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.participant?.name || "").toLowerCase().includes(s)
      || (r.participant?.email || "").toLowerCase().includes(s)
      || (r.pathway_id || "").toLowerCase().includes(s);
  });
  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="staff-caseload">
      <div className="bmb-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="overline">Program staff</div>
            <h1 className="font-display text-3xl text-[#1B1033]">Your caseload</h1>
            <p className="text-slate-600 text-sm mt-1">Participants enrolled in programs you administer. You see what's needed to review evidence and support — not private journal, health, or Support Circle information.</p>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <Input className="pl-8 w-64" placeholder="Search name, email, PathwayID" value={q} onChange={(e) => setQ(e.target.value)} data-testid="staff-caseload-search" />
          </div>
        </div>
      </div>
      <div className="bmb-card overflow-hidden">
        {loading && <div className="p-6 text-slate-500">Loading…</div>}
        {!loading && filtered.length === 0 && <div className="p-6 text-slate-500 italic">No participants match.</div>}
        {filtered.map((r) => (
          <button
            key={r.enrollment.id}
            onClick={() => nav(`/staff/participants/${r.enrollment.id}`)}
            className="w-full text-left flex items-center gap-4 p-4 border-t first:border-t-0 hover:bg-slate-50"
            data-testid={`caseload-row-${r.enrollment.id}`}
          >
            <div className="w-10 h-10 rounded-full bg-[#e8dbe4] text-[#4a2a5a] flex items-center justify-center"><Users className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[#1B1033] truncate">{r.participant?.name || r.participant?.email || "Participant"}</div>
              <div className="text-xs text-slate-500 truncate">{r.pathway_id || "—"} · {r.participant?.email}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Needs review</div>
              <div className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${r.needs_review > 0 ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-600"}`}>
                {r.needs_review} / {r.requirements_total}
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

export function StaffParticipantDetail() {
  const { enrollmentId } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [openReq, setOpenReq] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [decision, setDecision] = useState("verified");
  const [reason, setReason] = useState("");

  const load = async () => {
    const { data } = await api.get(`/staff/participants/${enrollmentId}`);
    setData(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [enrollmentId]);

  const openEvidence = async (req) => {
    setOpenReq(req);
    try {
      const { data } = await api.get(`/staff/requirements/${req.id}/evidence`);
      setEvidence(data);
      setDecision("verified"); setReason("");
    } catch { toast.error("Cannot open evidence"); }
  };

  const submitDecision = async () => {
    try {
      await api.post(`/staff/requirements/${openReq.id}/verify`, { decision, reason: decision === "returned" ? reason : undefined });
      toast.success(`Marked ${decision.replace("_", " ")}`);
      setOpenReq(null); setEvidence(null);
      await load();
    } catch (e) {
      toast.error("Failed: " + (e.response?.data?.detail || e.message));
    }
  };

  if (!data) return <div className="p-6 text-slate-500">Loading…</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6" data-testid="staff-participant-detail">
      <button onClick={() => nav("/staff/caseload")} className="text-sm text-slate-500 hover:text-[#1B1033]">← Back to caseload</button>
      <div className="bmb-card p-6">
        <div className="overline">Participant</div>
        <h1 className="font-display text-3xl text-[#1B1033]">{data.participant?.name || data.participant?.email}</h1>
        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
          <span><Shield className="w-3.5 h-3.5 inline mr-1" />{data.pathway?.pathway_id || "—"}</span>
          <span>{data.participant?.email}</span>
          <span>Enrollment status: {data.enrollment.status}</span>
        </div>
        <div className="mt-3 text-xs text-slate-500 flex items-start gap-2">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5" />
          <span>Journal, Health Hub, Support Circle, and non-linked documents are participant-private and not visible here.</span>
        </div>
      </div>

      <div className="bmb-card">
        <div className="px-6 pt-5 pb-2 overline">Requirements</div>
        {data.requirements.length === 0 && <div className="px-6 pb-5 text-sm text-slate-500 italic">No requirements yet.</div>}
        {data.requirements.map((r) => {
          const v = r.verification || {};
          const st = v.status || "not_started";
          return (
            <div key={r.id} className="p-4 border-t flex items-start gap-3" data-testid={`staff-req-${r.id}`}>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1B1033]">{r.description || r.type}</div>
                <div className="text-xs text-slate-500 mt-0.5">{r.type}{r.due_date ? ` · due ${r.due_date}` : ""}{v.required ? " · verification required" : ""}</div>
              </div>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${STATUS_STYLES[st] || "bg-slate-100 text-slate-700"}`}>{st.replace(/_/g, " ")}</span>
              <Button size="sm" variant="outline" onClick={() => openEvidence(r)} data-testid={`review-${r.id}`}>Review</Button>
            </div>
          );
        })}
      </div>

      <StaffNotes enrollmentId={enrollmentId} />

      <Dialog open={!!openReq} onOpenChange={(o) => { if (!o) { setOpenReq(null); setEvidence(null); }}}>
        <DialogContent className="max-w-lg" data-testid="staff-review-dialog">
          <DialogHeader><DialogTitle>Review: {openReq?.description}</DialogTitle></DialogHeader>
          {!evidence ? <div className="text-sm text-slate-500">Loading…</div> : (
            <>
              <div className="text-xs text-slate-500 mb-2">Attached evidence (metadata only — sensitive extracted values are never shown to staff):</div>
              {evidence.documents.length === 0
                ? <div className="text-sm text-slate-500 italic">No evidence attached yet.</div>
                : evidence.documents.map((d) => (
                  <div key={d.id} className="flex items-center gap-2 border rounded-lg p-2 mb-2">
                    <FileText className="w-4 h-4 text-[#4a2a5a]" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{d.label || d.original_filename}</div>
                      <div className="text-[11px] text-slate-500">{d.document_type_label || "Document"} · uploaded {d.uploaded_at?.slice(0,10)}</div>
                    </div>
                  </div>
                ))}
              <div className="mt-3">
                <Label>Decision</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {["verified","returned","needs_review","not_applicable"].map((d) => (
                    <button key={d} onClick={() => setDecision(d)}
                      className={`px-3 py-1.5 text-xs rounded-full border ${decision===d ? "bg-[#1B1033] text-white border-[#1B1033]" : "border-slate-300 text-slate-600 hover:border-[#1B1033]"}`}
                      data-testid={`decision-${d}`}>
                      {d.replace(/_/g," ")}
                    </button>
                  ))}
                </div>
              </div>
              {decision === "returned" && (
                <div className="mt-3">
                  <Label>Return reason (visible to participant)</Label>
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} data-testid="staff-return-reason" />
                </div>
              )}
            </>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setOpenReq(null); setEvidence(null); }}>Cancel</Button>
            <Button onClick={submitDecision} data-testid="staff-submit-decision">
              {decision === "verified" ? <><Check className="w-4 h-4 mr-1" /> Verify</> :
               decision === "returned" ? <><CornerUpLeft className="w-4 h-4 mr-1" /> Return</> :
               `Mark ${decision.replace(/_/g," ")}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
