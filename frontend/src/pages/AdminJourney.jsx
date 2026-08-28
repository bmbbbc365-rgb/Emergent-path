import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Award, Trophy, CheckCircle2, RotateCcw, Plus, Search,
  Sparkles, Compass, Star, Flag,
} from "lucide-react";
import JourneyKey from "@/components/journey/JourneyKey";

const STAGE_BADGE = {
  enter:    { label: "01 Enter",    bg: "bg-[#F3E1D8]",  text: "text-[#8E4E5A]" },
  build:    { label: "02 Build",    bg: "bg-[#EED2E0]",  text: "text-[#4a2a5a]" },
  graduate: { label: "03 Graduate", bg: "bg-[#DCEDE8]",  text: "text-[#2B5F5A]" },
  unlock:   { label: "04 Unlock",   bg: "bg-[#F5E4B8]",  text: "text-[#6A4E1B]" },
  expand:   { label: "05 Expand",   bg: "bg-[#CDE5EE]",  text: "text-[#1B4A5A]" },
};

const MILESTONE_TEMPLATES = [
  { key: "release_requirements_organized", label: "Release requirements organized" },
  { key: "identity_documents_secured", label: "Identity documents secured" },
  { key: "stable_housing", label: "Stable housing established" },
  { key: "employment_secured", label: "Employment secured" },
  { key: "education_enrolled", label: "Education or training enrolled" },
  { key: "recovery_support_connected", label: "Recovery support connected" },
  { key: "benefits_activated", label: "Benefits activated" },
  { key: "program_completion", label: "Program completion recognized" },
];

export default function AdminJourney() {
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [openUser, setOpenUser] = useState(null);   // detail modal

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/journey");
      setRows(data.participants || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Not authorized");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (r.participant?.name || "").toLowerCase().includes(s)
      || (r.participant?.email || "").toLowerCase().includes(s)
      || (r.pathway_id || "").toLowerCase().includes(s);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="admin-journey">
      <div className="rounded-3xl px-6 md:px-8 py-6 md:py-8 relative overflow-hidden"
        style={{
          background:
            "radial-gradient(600px 220px at 90% -20%, #F5D28F55 0%, transparent 60%), " +
            "linear-gradient(135deg, #2B1440 0%, #4a2a5a 60%, #7C4E80 100%)",
        }}>
        <div className="flex items-center gap-3">
          <JourneyKey size={32} tone="gold" glow />
          <div className="overline text-[#F5D28F]">Program administration</div>
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-white mt-2">Graduation Journey</h1>
        <p className="text-[#F3E1D8] mt-2 max-w-2xl leading-relaxed text-sm">
          Track participant progress, add recognized milestones, and approve
          graduation when a participant is ready. Graduation cannot happen
          without your approval.
        </p>
      </div>

      <div className="bmb-card p-4 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
          <Input className="pl-8" placeholder="Search name, email, PathwayID"
            value={q} onChange={(e) => setQ(e.target.value)}
            data-testid="admin-journey-search" />
        </div>
        <div className="text-xs text-slate-500">{filtered.length} participant{filtered.length === 1 ? "" : "s"}</div>
      </div>

      <div className="bmb-card overflow-hidden">
        {loading && <div className="p-6 text-slate-500">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-slate-500 italic">No participants match your search.</div>
        )}
        {filtered.map((r) => {
          const badge = STAGE_BADGE[r.stage] || STAGE_BADGE.enter;
          return (
            <button
              key={r.user_id}
              onClick={() => setOpenUser(r)}
              className="w-full text-left flex items-center gap-4 p-4 border-t first:border-t-0 hover:bg-slate-50 transition"
              data-testid={`admin-journey-row-${r.user_id}`}>
              <div className="w-10 h-10 rounded-full bg-[#e8dbe4] text-[#4a2a5a] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1B1033] truncate">
                  {r.participant?.name || r.participant?.email}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {r.pathway_id || "—"} · {r.participant?.email}
                </div>
              </div>
              <div className="hidden md:flex gap-2 items-center">
                <MiniStat label="Blueprint" value={r.signals.blueprint_completed ? "✓" : `${r.signals.blueprint_pct}%`} done={r.signals.blueprint_completed} />
                <MiniStat label="Assess" value={`${r.signals.assessments_completed}/${r.signals.assessments_total}`} done={r.signals.assessments_completed >= r.signals.assessments_total} />
                <MiniStat label="E-Ready" value={`${r.signals.ereadiness_pct}%`} done={r.signals.ereadiness_pct >= 80} />
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${badge.bg} ${badge.text} shrink-0`}>
                {badge.label}
              </span>
            </button>
          );
        })}
      </div>

      <AdminDetail row={openUser} onClose={() => setOpenUser(null)} onChanged={load} />
    </div>
  );
}

function MiniStat({ label, value, done }) {
  return (
    <div className={`text-center rounded-lg px-2 py-1 border ${done ? "border-[#B5851F]/40 bg-[#FBF3E9]" : "border-slate-200 bg-white"}`}>
      <div className="text-[9px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-[#1B1033]">{value}</div>
    </div>
  );
}

function AdminDetail({ row, onClose, onChanged }) {
  const [detail, setDetail] = useState(null);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [mLabel, setMLabel] = useState("");
  const [mKey, setMKey] = useState("");
  const [mNote, setMNote] = useState("");
  const [gradNote, setGradNote] = useState("");

  useEffect(() => {
    if (!row) { setDetail(null); return; }
    (async () => {
      try {
        const { data } = await api.get(`/admin/journey/${row.user_id}`);
        setDetail(data);
      } catch { toast.error("Could not load detail"); }
    })();
  }, [row]);

  if (!row) return null;

  const graduate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/journey/${row.user_id}/graduate`, { note: gradNote || null });
      setDetail((d) => ({ ...d, ...data }));
      toast.success("Graduation approved.");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not approve graduation");
    } finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!confirm("Revoke graduation for this participant?")) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/journey/${row.user_id}/revoke-graduation`);
      setDetail((d) => ({ ...d, ...data }));
      toast("Graduation revoked.");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not revoke graduation");
    } finally { setBusy(false); }
  };
  const addMilestone = async () => {
    if (!mLabel.trim()) return toast.error("Please enter a milestone label.");
    setBusy(true);
    try {
      const { data } = await api.post(`/admin/journey/${row.user_id}/milestone`, {
        key: (mKey || mLabel).toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40),
        label: mLabel, note: mNote || null,
      });
      setDetail((d) => ({ ...d, ...data }));
      setMLabel(""); setMKey(""); setMNote(""); setAddOpen(false);
      toast.success("Milestone recorded.");
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not add milestone");
    } finally { setBusy(false); }
  };
  const removeMilestone = async (mid) => {
    if (!confirm("Remove this milestone?")) return;
    setBusy(true);
    try {
      const { data } = await api.delete(`/admin/journey/${row.user_id}/milestone/${mid}`);
      setDetail((d) => ({ ...d, ...data }));
      onChanged?.();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not remove milestone");
    } finally { setBusy(false); }
  };

  const state = detail?.state || {};
  const signals = detail?.signals || {};
  const grad = !!state.graduation_approved;
  const badge = STAGE_BADGE[detail?.stage] || STAGE_BADGE.enter;

  return (
    <Dialog open={!!row} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="admin-journey-detail">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-[#1B1033]">
            {row.participant?.name || row.participant?.email}
          </DialogTitle>
        </DialogHeader>

        {!detail ? <div className="text-slate-500">Loading…</div> : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
              {grad && (
                <span className="rounded-full bg-[#F5D28F] text-[#1B1033] px-3 py-1 text-xs font-semibold inline-flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" /> Graduated {state.graduation_date}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <SmallEvidence label="Blueprint" value={signals.blueprint_completed ? "Complete" : `${signals.blueprint_pct}%`} done={signals.blueprint_completed} icon={Compass} />
              <SmallEvidence label="Assessments" value={`${signals.assessments_completed}/${signals.assessments_total}`} done={signals.assessments_completed >= signals.assessments_total} icon={Star} />
              <SmallEvidence label="Employment" value={`${signals.ereadiness_pct}%`} done={signals.ereadiness_pct >= 80} icon={Award} />
              <SmallEvidence label="Actions" value={`${signals.action_items_completed}/${signals.action_items_total}`} done={signals.action_items_total > 0 && signals.action_items_completed >= signals.action_items_total} icon={Flag} />
            </div>

            {/* Transition status */}
            {grad && (
              <div className="rounded-xl p-3 bg-[#FBF3E9] border border-[#E4CDBF] text-xs text-[#5C3D48]">
                <div>Transition offered: {state.transition_offered_at ? "Yes" : "No"}</div>
                <div>Participant viewed: {state.transition_viewed ? "Yes" : "No"}</div>
                <div>Decision: {state.interested_in_continuing === true ? "Interested in continuing"
                  : state.interested_in_continuing === false ? "Not right now" : "Undecided"}</div>
              </div>
            )}

            {/* Milestones */}
            <div>
              <div className="flex items-center justify-between">
                <div className="overline text-[#8E4E5A]">Recognized milestones</div>
                <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}
                  data-testid="admin-add-milestone">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add
                </Button>
              </div>
              <div className="mt-2 space-y-2">
                {(state.milestones || []).length === 0 && (
                  <div className="text-xs text-slate-500 italic">No milestones yet.</div>
                )}
                {(state.milestones || []).map((m) => (
                  <div key={m.id} className="flex items-start gap-3 p-3 rounded-xl bg-white border">
                    <Trophy className="w-4 h-4 text-[#B5851F] mt-0.5 shrink-0" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-[#1B1033]">{m.label}</div>
                      {m.note && <div className="text-xs text-slate-600 mt-0.5">{m.note}</div>}
                      <div className="text-[10px] text-slate-400 mt-0.5">{new Date(m.added_at).toLocaleDateString()}</div>
                    </div>
                    <button className="text-xs text-rose-600 hover:underline"
                      onClick={() => removeMilestone(m.id)}
                      data-testid={`admin-remove-milestone-${m.id}`}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Graduation action */}
            <div className="rounded-xl p-4 border" style={{
              background: "linear-gradient(135deg, #FBF3E9 0%, #EED2E0 100%)",
              borderColor: "#E4CDBF",
            }}>
              <div className="overline text-[#8E4E5A]">Graduation</div>
              {!grad ? (
                <>
                  <p className="text-sm text-slate-700 mt-1">
                    Approving graduation unlocks the Build My Blueprint™ door for
                    this participant. This decision is yours — signals above are
                    evidence, not automation.
                  </p>
                  <Label className="text-xs mt-3 block">Optional note</Label>
                  <Textarea rows={2} value={gradNote} onChange={(e) => setGradNote(e.target.value)}
                    placeholder="e.g. Completed all program requirements, employment secured"
                    data-testid="admin-grad-note" />
                  <Button className="mt-3 rounded-full text-white"
                    style={{ background: "linear-gradient(120deg, #4a2a5a, #B76E79)" }}
                    disabled={busy} onClick={graduate}
                    data-testid="admin-graduate-btn">
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve graduation
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-700 mt-1">
                    Participant is graduated. The unlock door is active for them.
                  </p>
                  {state.graduation_note && (
                    <div className="text-xs text-slate-600 mt-1 italic">Note: {state.graduation_note}</div>
                  )}
                  <Button variant="outline" size="sm" className="mt-3"
                    disabled={busy} onClick={revoke}
                    data-testid="admin-revoke-btn">
                    <RotateCcw className="w-4 h-4 mr-1" /> Revoke graduation
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Add milestone dialog (nested) */}
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add milestone</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Recognition template</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {MILESTONE_TEMPLATES.map((template) => (
                    <button key={template.key} type="button" onClick={() => { setMKey(template.key); setMLabel(template.label); }}
                      className="rounded-full border border-[#D9C5B8] px-2.5 py-1 text-[11px] text-[#4a2a5a] hover:bg-[#FBF3E9]">
                      {template.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">Label</Label>
                <Input value={mLabel} onChange={(e) => setMLabel(e.target.value)}
                  placeholder="e.g. Employment secured"
                  data-testid="admin-milestone-label" />
              </div>
              <div>
                <Label className="text-xs">Key (optional)</Label>
                <Input value={mKey} onChange={(e) => setMKey(e.target.value)}
                  placeholder="employment_secured" />
              </div>
              <div>
                <Label className="text-xs">Note (optional)</Label>
                <Textarea rows={2} value={mNote} onChange={(e) => setMNote(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={addMilestone} disabled={busy}
                className="text-white"
                style={{ background: "linear-gradient(120deg, #4a2a5a, #B76E79)" }}
                data-testid="admin-milestone-save">Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function SmallEvidence({ label, value, done, icon: Icon }) {
  return (
    <div className={`rounded-lg p-2 border ${done ? "border-[#B5851F]/40 bg-[#FBF3E9]" : "border-slate-200 bg-white"}`}>
      <div className="flex items-center justify-between">
        <Icon className={`w-3.5 h-3.5 ${done ? "text-[#B5851F]" : "text-slate-400"}`} />
        {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#B5851F]" />}
      </div>
      <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-1">{label}</div>
      <div className="text-sm font-semibold text-[#1B1033]">{value}</div>
    </div>
  );
}
