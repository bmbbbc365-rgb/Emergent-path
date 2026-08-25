import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Check, HelpCircle, MinusCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const META = [
  { key: "dont_know", label: "I don't know", icon: HelpCircle },
  { key: "not_applicable", label: "Not applicable", icon: MinusCircle },
  { key: "later", label: "Later", icon: Clock },
];

export default function Onboarding() {
  const nav = useNavigate();
  const [schema, setSchema] = useState([]);
  const [answers, setAnswers] = useState({});
  const [progress, setProgress] = useState({ pct: 0, current_section: null, completed_at: null });
  const [sectionIdx, setSectionIdx] = useState(0);

  useEffect(() => { (async () => {
    const [s, st] = await Promise.all([api.get("/onboarding/schema"), api.get("/onboarding/state")]);
    setSchema(s.data.sections);
    setProgress(st.data.progress);
    const map = {};
    (st.data.answers || []).forEach((a) => { map[`${a.section}.${a.key}`] = a; });
    setAnswers(map);
    if (st.data.progress?.current_section) {
      const i = s.data.sections.findIndex((x) => x.id === st.data.progress.current_section);
      if (i >= 0) setSectionIdx(i);
    }
  })(); }, []);

  const section = schema[sectionIdx];
  const answered = useMemo(() => Object.values(answers).length, [answers]);
  const total = useMemo(() => schema.reduce((s, x) => s + x.questions.length, 0), [schema]);

  const put = async (q, value, meta) => {
    const payload = { section: section.id, key: q.key, value, meta };
    setAnswers((prev) => ({ ...prev, [`${section.id}.${q.key}`]: { ...payload, updated_at: new Date().toISOString() } }));
    try { await api.put("/onboarding/answer", payload); } catch { toast.error("Save failed"); }
  };

  const next = async () => {
    if (sectionIdx < schema.length - 1) setSectionIdx(sectionIdx + 1);
    else {
      const { data } = await api.post("/onboarding/complete");
      toast.success("Blueprint ready");
      nav("/app/blueprint");
    }
  };

  if (!section) return <div className="p-8 text-slate-500">Loading…</div>;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="max-w-2xl mx-auto p-6" data-testid="onboarding-page">
      <div className="mb-6">
        <div className="overline">Onboarding Blueprint</div>
        <h1 className="font-display text-3xl text-[#1B1033]">{section.title}</h1>
        <Progress value={pct} className="mt-3 h-2" />
        <div className="text-xs text-slate-500 mt-1">{answered} of {total} answered · {pct}%</div>
      </div>

      <div className="space-y-5">
        {section.questions.map((q) => {
          const cur = answers[`${section.id}.${q.key}`];
          const currentVal = cur?.value ?? null;
          const currentMeta = cur?.meta ?? null;
          return (
            <div key={q.key} className="bmb-card p-4" data-testid={`q-${q.key}`}>
              <div className="font-medium text-[#1B1033]">{q.label}</div>
              {q.type === "yes_no_unsure" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {["yes","no","unsure"].map((v) => (
                    <button key={v} onClick={() => put(q, v, null)}
                      className={`px-3 py-1.5 text-sm rounded-full border ${currentVal===v && !currentMeta ? "bg-[#1B1033] text-white border-[#1B1033]" : "border-slate-300 hover:border-[#1B1033]"}`}
                      data-testid={`ans-${q.key}-${v}`}>{v}</button>
                  ))}
                </div>
              )}
              {q.type === "choice" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {q.options.map((v) => (
                    <button key={v} onClick={() => put(q, v, null)}
                      className={`px-3 py-1.5 text-sm rounded-full border ${currentVal===v && !currentMeta ? "bg-[#1B1033] text-white border-[#1B1033]" : "border-slate-300 hover:border-[#1B1033]"}`}>
                      {v}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "text_short" && (
                <Input className="mt-3" value={(!currentMeta && currentVal) || ""} onBlur={(e) => put(q, e.target.value, null)} onChange={(e) => setAnswers((p) => ({...p, [`${section.id}.${q.key}`]: {...cur, value: e.target.value, meta: null}}))} data-testid={`ans-${q.key}-text`} />
              )}
              {q.type === "text_long" && (
                <Textarea className="mt-3" rows={3} value={(!currentMeta && currentVal) || ""} onBlur={(e) => put(q, e.target.value, null)} onChange={(e) => setAnswers((p) => ({...p, [`${section.id}.${q.key}`]: {...cur, value: e.target.value, meta: null}}))} />
              )}
              <div className="mt-3 flex flex-wrap gap-1">
                {META.map((m) => {
                  const Icon = m.icon;
                  const active = currentMeta === m.key;
                  return (
                    <button key={m.key} onClick={() => put(q, null, m.key)}
                      className={`text-[11px] px-2 py-1 rounded-full border inline-flex items-center gap-1 ${active ? "bg-slate-200 border-slate-300 text-slate-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                      data-testid={`meta-${q.key}-${m.key}`}>
                      <Icon className="w-3 h-3" /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" disabled={sectionIdx===0} onClick={() => setSectionIdx(sectionIdx-1)}>Back</Button>
        <Button onClick={next} data-testid="onb-next">
          {sectionIdx === schema.length - 1 ? "Finish & see my Blueprint" : "Next"} <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
