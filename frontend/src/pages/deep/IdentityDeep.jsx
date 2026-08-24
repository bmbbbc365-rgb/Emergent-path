import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Section, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Plus, Trash2, Star, Trophy } from "lucide-react";
import { toast } from "sonner";

function ChipList({ label, items, onChange, testIdPrefix }) {
  const [input, setInput] = useState("");
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 mt-1">
        {(items || []).map((v, i) => (
          <span key={i} className="bmb-pill bg-[#1B1033]/5 text-[#1B1033]" data-testid={`${testIdPrefix}-chip-${i}`}>
            {v}
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="ml-1 text-slate-400 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2 mt-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder={`Add ${label.toLowerCase()}…`} data-testid={`${testIdPrefix}-input`} />
        <Button type="button" onClick={() => { if (input.trim()) { onChange([...(items || []), input.trim()]); setInput(""); } }} className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white">Add</Button>
      </div>
    </div>
  );
}

export default function IdentityDeep() {
  const [p, setP] = useState(null);
  const [win, setWin] = useState("");

  const load = async () => setP((await api.get("/profile/personal")).data);
  useEffect(() => { load(); }, []);

  const save = async () => { await api.put("/profile/personal", p); toast.success("Profile saved"); await load(); };

  if (!p) return <div className="text-slate-500">Loading…</div>;

  const addWin = () => {
    if (!win.trim()) return;
    setP({...p, wins: [...(p.wins || []), { label: win.trim(), at: new Date().toISOString().slice(0,10) }]});
    setWin("");
  };

  return (
    <div className="space-y-8" data-testid="identity-page">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Sparkles className="w-6 h-6" /></div>
          <div>
            <div className="overline">Identity, Confidence & Rebuilding</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Who you are, on your terms.</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">Strengths, values, interests, and small wins that build momentum. Bridge uses this — with your permission — to personalize suggestions.</p>
          </div>
        </div>
      </div>

      <Section eyebrow="Personal profile" title="Strengths, values & interests">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bmb-card p-5 space-y-4">
            <ChipList label="Strengths" items={p.strengths} onChange={(v) => setP({...p, strengths: v})} testIdPrefix="strengths" />
            <ChipList label="Values" items={p.values} onChange={(v) => setP({...p, values: v})} testIdPrefix="values" />
            <ChipList label="Skills" items={p.skills} onChange={(v) => setP({...p, skills: v})} testIdPrefix="skills" />
          </div>
          <div className="bmb-card p-5 space-y-4">
            <ChipList label="Interests" items={p.interests} onChange={(v) => setP({...p, interests: v})} testIdPrefix="interests" />
            <ChipList label="Career interests" items={p.career_interests} onChange={(v) => setP({...p, career_interests: v})} testIdPrefix="careers" />
            <ChipList label="Motivators" items={p.motivators} onChange={(v) => setP({...p, motivators: v})} testIdPrefix="motivators" />
            <div><Label>Work preferences</Label><Textarea value={p.work_preferences || ""} onChange={(e) => setP({...p, work_preferences: e.target.value})} placeholder="Day shift, team environment…" data-testid="work-prefs" /></div>
          </div>
        </div>

        <div className="bmb-card p-5 mt-5">
          <Label>My story</Label>
          <Textarea rows={5} value={p.story || ""} onChange={(e) => setP({...p, story: e.target.value})} placeholder="Optional. Only you (and Bridge, when you allow it) will see this." />
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={save} className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="save-profile-btn">Save profile</Button>
        </div>
      </Section>

      <Section eyebrow="Wins journal" title="Small wins add up.">
        <div className="bmb-card p-5">
          <div className="flex gap-2">
            <Input value={win} onChange={(e) => setWin(e.target.value)} placeholder="Signed lease · First paycheck · Called sponsor" data-testid="win-input" />
            <Button onClick={addWin} className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white gap-2" data-testid="add-win-btn"><Plus className="w-4 h-4" /> Add</Button>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {(p.wins || []).length === 0 && <EmptyHint>Add your first win. Even a small one counts.</EmptyHint>}
            {(p.wins || []).map((w, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-[#B76E79]/5 border border-[#EBD3D0] p-3" data-testid={`win-${i}`}>
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#B76E79]"><Trophy className="w-4 h-4" /></div>
                <div className="flex-1"><div className="text-sm text-[#1B1033]">{w.label}</div><div className="text-[11px] text-slate-500">{w.at}</div></div>
                <button onClick={() => setP({...p, wins: p.wins.filter((_, j) => j !== i)})} className="text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button onClick={save} className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white">Save</Button>
          </div>
        </div>
      </Section>
    </div>
  );
}
