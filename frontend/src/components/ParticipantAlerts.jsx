import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Bell, Clock, X, MessageSquareLock } from "lucide-react";

/** Compact panel used inside Dashboard + Blueprint. Shows the 5 most-imminent
 * non-dismissed reminders + a transparency banner if staff have internal notes.
 */
export default function ParticipantAlerts() {
  const nav = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [mine, setMine] = useState({ notes: [], internal_notes_exist: false, internal_notes_count: 0 });

  const load = async () => {
    try {
      await api.post("/reminders/refresh");
    } catch {}
    try {
      const [r, m] = await Promise.all([api.get("/reminders"), api.get("/notes/mine")]);
      setReminders(r.data || []);
      setMine(m.data || { notes: [], internal_notes_exist: false, internal_notes_count: 0 });
    } catch {}
  };
  useEffect(() => { load(); }, []);

  const dismiss = async (id) => {
    await api.patch(`/reminders/${id}`, { status: "dismissed" });
    setReminders((rs) => rs.filter((r) => r.id !== id));
  };

  const nextFive = reminders.slice(0, 5);
  return (
    <div className="space-y-3" data-testid="participant-alerts">
      {mine.internal_notes_exist && (
        <div className="bmb-card p-3 flex items-start gap-2 bg-slate-50 border-slate-200 text-xs" data-testid="internal-notes-indicator">
          <MessageSquareLock className="w-4 h-4 text-slate-500 mt-0.5" />
          <div>
            <div className="font-medium text-[#1B1033]">Your consultant keeps {mine.internal_notes_count} staff-only note(s).</div>
            <div className="text-slate-500">Content is not shown here. This banner exists so you always know when internal notes exist.</div>
          </div>
        </div>
      )}
      {mine.notes.length > 0 && (
        <div className="bmb-card p-4" data-testid="shared-notes">
          <div className="overline">From your consultant</div>
          <div className="mt-2 space-y-2">
            {mine.notes.slice(0, 3).map((n) => (
              <div key={n.id} className="border-l-2 border-[#4a2a5a] pl-3 text-sm">
                <div className="text-slate-800 whitespace-pre-wrap">{n.body}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {n.visibility === "shared" ? "Shared" : "Sent to you"} · {(n.created_at || "").slice(0, 10)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {nextFive.length > 0 && (
        <div className="bmb-card p-4" data-testid="reminders-panel">
          <div className="overline flex items-center gap-2"><Bell className="w-3.5 h-3.5" /> Reminders</div>
          <div className="mt-2 space-y-2">
            {nextFive.map((r) => (
              <div key={r.id} className="flex items-start gap-2 text-sm" data-testid={`reminder-${r.id}`}>
                <Clock className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-[#1B1033]">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.body} · {(r.fire_at || "").slice(0, 10)}</div>
                </div>
                <button onClick={() => dismiss(r.id)} className="text-slate-400 hover:text-red-500" data-testid={`dismiss-${r.id}`}><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
