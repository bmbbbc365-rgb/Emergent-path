import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, HelpCircle, MinusCircle, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

const META = [
  { key: "dont_know", label: "I don't know", icon: HelpCircle },
  { key: "not_applicable", label: "Not applicable", icon: MinusCircle },
  { key: "later", label: "Later", icon: Clock },
];

/** Full Path Forward Blueprint (30 questions).
 *  Separate from the Quick Check-In. Autosaves. Resumable. */
export default function FullBlueprintIntake() {
  const nav = useNavigate();
  const [schema, setSchema] = useState([]);
  const [answers, setAnswers] = useState({});
  const [progress, setProgress] = useState({ pct: 0, current_section: null, completed_at: null });
  const [sectionIdx, setSectionIdx] = useState(0);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const loadBlueprint = async () => {
    setError("");
    try {
      const [sch, st] = await Promise.all([
        api.get("/blueprint-intake/schema"),
        api.get("/blueprint-intake/state"),
      ]);
      setSchema(sch.data.sections || []);
      setProgress(st.data.progress);
      const map = {};
      (st.data.answers || []).forEach((a) => { map[`${a.section}.${a.key}`] = a; });
      setAnswers(map);
      if (st.data.progress?.current_section) {
        const i = (sch.data.sections || []).findIndex((x) => x.id === st.data.progress.current_section);
        if (i >= 0) setSectionIdx(i);
      }
    } catch (e) {
      setError(e?.response?.data?.detail || "Your Blueprint could not be loaded.");
      toast.error("Could not load your Full Blueprint");
    }
  };
  useEffect(() => { loadBlueprint(); }, []);

  const section = schema[sectionIdx];
  const total = useMemo(() => schema.reduce((s, x) => s + x.questions.length, 0), [schema]);
  const answered = useMemo(() => Object.values(answers).filter(
    (a) => a?.value !== null && a?.value !== undefined && a?.value !== "" || a?.meta
  ).length, [answers]);
  const pct = total ? Math.round((answered / total) * 100) : 0;

  const put = async (q, value, meta = null) => {
    const key = `${section.id}.${q.key}`;
    setAnswers((prev) => ({ ...prev, [key]: { section: section.id, key: q.key, value, meta, updated_at: new Date().toISOString() } }));
    try { await api.put("/blueprint-intake/answer", { section: section.id, key: q.key, value, meta }); }
    catch { toast.error("Save failed — check your connection"); }
  };

  const next = async () => {
    if (sectionIdx < schema.length - 1) {
      setSectionIdx(sectionIdx + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const { data } = await api.post("/blueprint-intake/complete");
      setSummary(data.summary);
      toast.success("Your Full Path Forward Blueprint is ready");
    }
  };

  if (summary) return <SummaryView summary={summary} onReturn={() => nav("/app/blueprint")} />;
  if (error) return <div className="max-w-xl mx-auto bmb-card p-8"><h1 className="font-display text-2xl text-[#1B1033]">We could not load your Blueprint.</h1><p className="text-slate-600 mt-2">{error}</p><Button className="mt-5 bg-[#4a2a5a] hover:bg-[#3a1e4a]" onClick={loadBlueprint}>Try again</Button></div>;
  if (!section) return <div className="p-8 text-slate-500">Loading your Blueprint…</div>;

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" data-testid="full-blueprint-intake">
      <div className="mb-6">
        <div className="overline">Full Path Forward Blueprint</div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033]">{section.title}</h1>
        {section.eyebrow && <div className="text-sm text-slate-500 mt-1">{section.eyebrow}</div>}
        <Progress value={pct} className="mt-3 h-2" />
        <div className="text-xs text-slate-500 mt-1">
          Section {sectionIdx + 1} of {schema.length} · {answered} of {total} answered · {pct}%
        </div>
      </div>

      <div className="space-y-4">
        {section.questions.map((q) => (
          <QuestionCard key={q.key}
            q={q}
            current={answers[`${section.id}.${q.key}`]}
            onChange={(val, meta) => put(q, val, meta)}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-between">
        <Button variant="ghost" disabled={sectionIdx === 0}
          onClick={() => setSectionIdx(sectionIdx - 1)}
          data-testid="bp-back-btn">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button onClick={next} data-testid="bp-next-btn"
          className="bg-[#4a2a5a] hover:bg-[#3a1e4a]">
          {sectionIdx === schema.length - 1 ? "Finish & see my Blueprint" : "Next"}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
      <div className="mt-3 text-[11px] text-slate-500 text-center">
        Progress saves automatically. Come back anytime.
      </div>
    </div>
  );
}

function QuestionCard({ q, current, onChange }) {
  const curVal = current?.value ?? null;
  const curMeta = current?.meta ?? null;

  return (
    <div className="bmb-card p-4" data-testid={`fbp-q-${q.key}`}>
      <div className="font-medium text-[#1B1033]">{q.label}</div>
      {q.hint && <div className="text-xs text-slate-500 mt-0.5">{q.hint}</div>}

      {q.type === "yes_no_unsure" && (
        <ChipGroup value={curVal} meta={curMeta}
          options={[{v: "yes", l: "Yes"}, {v: "no", l: "No"}, {v: "unsure", l: "Unsure"}]}
          onPick={(v) => onChange(v, null)} testId={q.key} />
      )}
      {q.type === "yes_no" && (
        <ChipGroup value={curVal} meta={curMeta}
          options={[{v: "yes", l: "Yes"}, {v: "no", l: "No"}]}
          onPick={(v) => onChange(v, null)} testId={q.key} />
      )}
      {q.type === "choice" && (
        <ChipGroup value={curVal} meta={curMeta}
          options={q.options.map(o => ({v: o, l: o}))}
          onPick={(v) => onChange(v, null)} testId={q.key} />
      )}
      {q.type === "multi_select" && (
        <MultiChips values={Array.isArray(curVal) ? curVal : []}
          options={q.options}
          onToggle={(v) => {
            const arr = Array.isArray(curVal) ? [...curVal] : [];
            const idx = arr.indexOf(v);
            if (idx >= 0) arr.splice(idx, 1); else arr.push(v);
            onChange(arr, null);
          }} testId={q.key} />
      )}
      {q.type === "multi_select_max_6" && (
        <>
          <MultiChips values={Array.isArray(curVal) ? curVal : []}
            options={q.options}
            onToggle={(v) => {
              const arr = Array.isArray(curVal) ? [...curVal] : [];
              const idx = arr.indexOf(v);
              if (idx >= 0) arr.splice(idx, 1); else if (arr.length < 6) arr.push(v);
              onChange(arr, null);
            }} testId={q.key} />
          <div className="text-[11px] text-slate-400 mt-1">Choose up to 6.</div>
        </>
      )}
      {q.type === "scale_1_5" && (
        <div className="mt-3 flex gap-2" data-testid={`fbp-scale-${q.key}`}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n}
              onClick={() => onChange(n, null)}
              className={`w-11 h-11 rounded-full border font-medium text-sm ${
                curVal === n
                  ? "bg-[#4a2a5a] text-white border-[#4a2a5a]"
                  : "border-slate-200 text-slate-600 hover:border-[#4a2a5a]"
              }`}
              data-testid={`fbp-scale-${q.key}-${n}`}>{n}</button>
          ))}
        </div>
      )}
      {q.type === "text_short" && (
        <Input className="mt-3"
          defaultValue={curVal || ""}
          onBlur={(e) => e.target.value !== (curVal || "") && onChange(e.target.value, null)}
          data-testid={`fbp-text-${q.key}`} />
      )}
      {q.type === "text_long" && (
        <Textarea className="mt-3" rows={3}
          defaultValue={curVal || ""}
          onBlur={(e) => e.target.value !== (curVal || "") && onChange(e.target.value, null)} />
      )}
      {q.type === "rank_top_3" && (
        <RankTop3 value={Array.isArray(curVal) ? curVal : []} options={q.options}
          onChange={(v) => onChange(v, null)} testId={q.key} />
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {META.map((m) => {
          const Icon = m.icon;
          const active = curMeta === m.key;
          return (
            <button key={m.key} onClick={() => onChange(null, m.key)}
              className={`text-[11px] px-2 py-1 rounded-full border inline-flex items-center gap-1 ${
                active ? "bg-slate-200 border-slate-300 text-slate-700" : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}
              data-testid={`fbp-meta-${q.key}-${m.key}`}>
              <Icon className="w-3 h-3" /> {m.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChipGroup({ value, meta, options, onPick, testId }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map(({v, l}) => (
        <button key={v} onClick={() => onPick(v)}
          className={`px-3 py-1.5 text-sm rounded-full border ${
            value === v && !meta
              ? "bg-[#4a2a5a] text-white border-[#4a2a5a]"
              : "border-slate-300 hover:border-[#4a2a5a]"
          }`}
          data-testid={`fbp-${testId}-${String(v).toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9-]/g,"")}`}>{l}</button>
      ))}
    </div>
  );
}

function MultiChips({ values, options, onToggle, testId }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((o) => {
        const active = values.includes(o);
        return (
          <button key={o} onClick={() => onToggle(o)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              active ? "bg-[#4a2a5a] text-white border-[#4a2a5a]" : "border-slate-300 hover:border-[#4a2a5a]"
            }`}
            data-testid={`fbp-multi-${testId}-${o.toLowerCase().replace(/[^a-z0-9]/g,"-")}`}>{o}</button>
        );
      })}
    </div>
  );
}

function RankTop3({ value, options, onChange, testId }) {
  const picked = value.slice(0, 3);
  const remaining = options.filter((o) => !picked.includes(o));
  const add = (o) => picked.length < 3 && onChange([...picked, o]);
  const remove = (o) => onChange(picked.filter((x) => x !== o));
  return (
    <div className="mt-3 space-y-2" data-testid={`fbp-rank-${testId}`}>
      <div className="flex flex-wrap gap-2">
        {picked.map((o, i) => (
          <button key={o} onClick={() => remove(o)}
            className="px-3 py-1.5 text-sm rounded-full bg-[#4a2a5a] text-white border border-[#4a2a5a]">
            {i + 1}. {o} ✕
          </button>
        ))}
        {picked.length === 0 && <div className="text-xs text-slate-500">Tap options below in the order you want.</div>}
      </div>
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
        {remaining.map((o) => (
          <button key={o} onClick={() => add(o)}
            disabled={picked.length >= 3}
            className="px-3 py-1.5 text-sm rounded-full border border-slate-300 hover:border-[#4a2a5a] disabled:opacity-50">
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function SummaryView({ summary, onReturn }) {
  return (
    <div className="max-w-2xl mx-auto p-6" data-testid="fbp-summary">
      <div className="bmb-card p-6">
        <div className="overline">Your Full Blueprint</div>
        <h1 className="font-display text-3xl text-[#1B1033] mt-1 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#B76E79]" /> Here's where you stand today
        </h1>
      </div>
      {summary.strengths?.length > 0 && (
        <Panel title="What you already have going for you">
          <ul className="space-y-1 text-sm text-slate-700">
            {summary.strengths.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </Panel>
      )}
      {summary.immediate?.length > 0 && (
        <Panel title="Right now — these come first">
          <ul className="space-y-1 text-sm text-slate-700">
            {summary.immediate.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </Panel>
      )}
      {summary.priorities?.length > 0 && (
        <Panel title="What deserves your attention next">
          <ul className="space-y-1 text-sm text-slate-700">
            {summary.priorities.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </Panel>
      )}
      {summary.participant_ranked_top3?.length > 0 && (
        <Panel title="Your ranked focus areas">
          <ul className="space-y-1 text-sm text-slate-700">
            {summary.participant_ranked_top3.map((s, i) => <li key={i}>• {s}</li>)}
          </ul>
        </Panel>
      )}
      <div className="mt-6">
        <Button onClick={onReturn} data-testid="fbp-return" className="bg-[#4a2a5a] hover:bg-[#3a1e4a]">
          Open my Living Blueprint <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="bmb-card p-5 mt-4">
      <div className="overline">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
