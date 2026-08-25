import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Users, Trash2, Send } from "lucide-react";
import { toast } from "sonner";

const VIS = [
  { key: "participant", label: "Send to participant", desc: "Written directly to the participant.", icon: Send },
  { key: "shared", label: "Shared planning note", desc: "Visible to participant AND staff.", icon: Users },
  { key: "internal", label: "Internal only", desc: "Staff-only. Participant is told internal notes exist, but not the content.", icon: EyeOff },
];

export default function StaffNotes({ enrollmentId }) {
  const [notes, setNotes] = useState([]);
  const [body, setBody] = useState("");
  const [vis, setVis] = useState("shared");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get(`/staff/participants/${enrollmentId}/notes`);
      setNotes(data || []);
    } catch { setNotes([]); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [enrollmentId]);

  const post = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api.post(`/staff/participants/${enrollmentId}/notes`, { body, visibility: vis });
      setBody("");
      await load();
      toast.success("Note saved");
    } catch (e) { toast.error("Save failed"); }
    finally { setBusy(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this note?")) return;
    await api.delete(`/staff/notes/${id}`);
    await load();
  };

  return (
    <div className="bmb-card p-5" data-testid="staff-notes">
      <div className="overline">Planning notes</div>
      <div className="mt-3 space-y-2">
        <Textarea rows={3} placeholder="Write a note…" value={body} onChange={(e) => setBody(e.target.value)} data-testid="staff-note-body" />
        <div className="flex flex-wrap gap-2">
          {VIS.map((v) => {
            const Icon = v.icon;
            const active = vis === v.key;
            return (
              <button key={v.key} onClick={() => setVis(v.key)}
                className={`text-left border rounded-lg p-2 text-xs flex-1 min-w-[180px] ${active ? "border-[#1B1033] bg-[#1B1033]/5" : "border-slate-200"}`}
                data-testid={`note-vis-${v.key}`}>
                <div className="font-medium text-[#1B1033] flex items-center gap-1"><Icon className="w-3 h-3" /> {v.label}</div>
                <div className="text-slate-500 mt-0.5">{v.desc}</div>
              </button>
            );
          })}
        </div>
        <Button onClick={post} disabled={busy || !body.trim()} data-testid="staff-note-save">Save note</Button>
      </div>
      <div className="mt-4 space-y-2">
        {notes.length === 0 && <div className="text-xs text-slate-500 italic">No notes yet.</div>}
        {notes.map((n) => (
          <div key={n.id} className={`border rounded-lg p-3 text-sm ${
            n.visibility === "internal" ? "bg-slate-50 border-slate-200" :
            n.visibility === "shared" ? "bg-indigo-50/40 border-indigo-100" :
            "bg-rose-50/40 border-rose-100"
          }`} data-testid={`note-${n.id}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-wider text-slate-500">
                {n.visibility === "internal" && <><EyeOff className="w-3 h-3 inline mr-1" /> Internal (staff-only)</>}
                {n.visibility === "shared" && <><Users className="w-3 h-3 inline mr-1" /> Shared with participant</>}
                {n.visibility === "participant" && <><Send className="w-3 h-3 inline mr-1" /> Sent to participant</>}
              </div>
              <button onClick={() => remove(n.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
            <div className="mt-1 text-slate-800 whitespace-pre-wrap">{n.body}</div>
            <div className="mt-1 text-[10px] text-slate-400">{(n.created_at || "").slice(0, 19).replace("T", " ")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
