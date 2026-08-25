import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2, NotebookPen, Mic } from "lucide-react";
import { toast } from "sonner";
import VoiceInput from "@/components/VoiceInput";

/** Private participant journal — supports typing OR voice dictation.
 *  Content is never exposed to staff. Only the participant can see or edit their entries.
 */
export default function Journal() {
  const nav = useNavigate();
  const [entries, setEntries] = useState([]);
  const [draft, setDraft] = useState("");
  const [mood, setMood] = useState(null);
  const [busy, setBusy] = useState(false);
  const [interim, setInterim] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/journal/entries");
      setEntries(data.entries || []);
    } catch { toast.error("Could not load your journal"); }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    try {
      await api.post("/journal/entries", { body, mood });
      setDraft(""); setMood(null); setInterim("");
      toast.success("Saved");
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save");
    } finally { setBusy(false); }
  };

  const del = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try { await api.delete(`/journal/entries/${id}`); await load(); }
    catch { toast.error("Could not delete"); }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" data-testid="journal-page">
      <button onClick={() => nav(-1)}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-3xl p-6 md:p-7 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #FBF3E9 0%, #EED2E0 100%)", border: "1px solid #E4CDBF" }}>
        <div className="flex items-center gap-2 text-[#8E4E5A]">
          <NotebookPen className="w-4 h-4" />
          <div className="overline">Personal journal · private to you</div>
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033] mt-1">
          What's on your mind today?
        </h1>
        <p className="text-sm text-slate-600 mt-2 max-w-xl">
          Type it or tap the mic. Staff cannot see the content — this space is for you.
          Writing for even five minutes lowers stress and sharpens decisions.
        </p>
      </div>

      <div className="bmb-card p-5 mt-6">
        <Textarea
          rows={6}
          value={draft + (interim ? ` ${interim}` : "")}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Start writing, or press the mic and speak…"
          className="text-sm"
          data-testid="journal-textarea"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <VoiceInput
            disabled={busy}
            onInterim={(t) => setInterim(t)}
            onTranscript={(text) => {
              setInterim("");
              setDraft((cur) => (cur ? cur.trim() + " " : "") + text);
            }}
          />
          <div className="flex items-center gap-2 text-xs text-slate-500 ml-auto">
            <span>Mood:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n}
                onClick={() => setMood(n === mood ? null : n)}
                className={`w-7 h-7 rounded-full border text-xs font-medium ${
                  mood === n
                    ? "bg-[#4a2a5a] text-white border-[#4a2a5a]"
                    : "border-slate-200 hover:border-[#4a2a5a] text-slate-500"
                }`}
                data-testid={`journal-mood-${n}`}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={save} disabled={busy || !draft.trim()}
            className="bg-[#4a2a5a] hover:bg-[#3a1e4a]" data-testid="journal-save">
            Save entry
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <div className="overline mb-3">Your entries</div>
        {entries.length === 0 && (
          <div className="text-sm text-slate-500 italic">No entries yet. Write your first when you're ready.</div>
        )}
        <div className="space-y-3">
          {entries.map((e) => (
            <div key={e.id} className="bmb-card p-4" data-testid={`journal-entry-${e.id}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-[11px] text-slate-400 uppercase tracking-wider">
                  {new Date(e.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                  {e.mood != null && <span className="ml-2 text-[#8E4E5A]">· mood {e.mood}/5</span>}
                </div>
                <button onClick={() => del(e.id)}
                  className="text-slate-300 hover:text-rose-500 p-1"
                  data-testid={`journal-delete-${e.id}`}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-2 whitespace-pre-wrap text-sm text-slate-700 leading-relaxed">
                {e.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
