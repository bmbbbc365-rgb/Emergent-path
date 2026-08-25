import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Sparkles, Check, Circle } from "lucide-react";
import { toast } from "sonner";

/** Assessments hub — lists the 4 assessments (Work Style, Values, Interests, Workforce). */
export function AssessmentsHub() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { (async () => {
    try {
      const { data } = await api.get("/assessments/catalog");
      setItems(data.assessments);
    } finally { setLoading(false); }
  })(); }, []);

  if (loading) return <div className="p-8 text-slate-500">Loading…</div>;

  const doneCount = items.filter((a) => a.completed_at).length;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6" data-testid="assessments-hub">
      <div className="bmb-card p-6">
        <div className="overline">Self-discovery · Employment direction</div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033]">Strengths, Values & Interests</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-xl">
          Four short assessments to help you understand how you work best, what matters to you, what interests you,
          and what a good job would look like. This is not a psychological test — it's for you.
        </p>
        <div className="mt-3 text-xs text-slate-500">Completed {doneCount} of {items.length}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
        {items.map((a) => (
          <Link key={a.id} to={`/app/assessments/${a.id}`}
            className="bmb-card p-5 block hover:-translate-y-0.5 transition-transform"
            data-testid={`assess-card-${a.id}`}>
            <div className="flex items-start justify-between">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                a.completed_at ? "bg-emerald-100 text-emerald-700" : "bg-[#4a2a5a]/10 text-[#4a2a5a]"
              }`}>
                {a.completed_at ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300" />
            </div>
            <div className="font-display text-lg text-[#1B1033] mt-3">{a.title}</div>
            <div className="text-xs text-slate-500 mt-1">{a.description}</div>
            <div className="text-[11px] text-slate-400 mt-3">
              {a.completed_at ? "Completed · tap to review" : `${a.question_count} questions · ~2 min`}
            </div>
          </Link>
        ))}
      </div>

      {doneCount === items.length && items.length > 0 && (
        <div className="mt-6">
          <Link to="/app/section/employment-readiness">
            <Button className="bg-[#4a2a5a] hover:bg-[#3a1e4a]" data-testid="assess-see-emp">
              See your Employment Readiness plan <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}


/** Single-assessment runner. */
export function AssessmentRunner() {
  const { id } = useParams();
  const nav = useNavigate();
  const [schema, setSchema] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  useEffect(() => { (async () => {
    try {
      const [s, st] = await Promise.all([
        api.get(`/assessments/schema/${id}`),
        api.get(`/assessments/state/${id}`),
      ]);
      setSchema(s.data);
      const m = {};
      (st.data.answers || []).forEach((a) => { m[a.key] = a.value; });
      setAnswers(m);
      if (st.data.result) setResult(st.data.result);
    } catch { toast.error("Assessment not found"); nav("/app/assessments"); }
  })(); }, [id, nav]);

  const answer = async (key, value) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    try { await api.put("/assessments/answer", { assessment_id: id, key, value }); }
    catch { toast.error("Save failed"); }
  };

  const complete = async () => {
    try {
      const { data } = await api.post(`/assessments/complete/${id}`);
      setResult(data.result);
      toast.success("Assessment complete");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Please answer every question first");
    }
  };

  if (!schema) return <div className="p-8 text-slate-500">Loading…</div>;

  if (result) {
    return (
      <div className="max-w-2xl mx-auto p-6" data-testid="assess-result">
        <button onClick={() => nav("/app/assessments")}
          className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to assessments
        </button>
        <div className="bmb-card p-6">
          <div className="overline">Result · {schema.title}</div>
          <h1 className="font-display text-2xl text-[#1B1033]">Here's what your answers suggest</h1>
        </div>
        <ResultBlock scoring={result.scoring} assessmentId={id} />
      </div>
    );
  }

  const allAnswered = schema.questions.every((q) => answers[q.key] !== undefined && answers[q.key] !== null && !(Array.isArray(answers[q.key]) && answers[q.key].length === 0));

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" data-testid="assess-runner">
      <button onClick={() => nav("/app/assessments")}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> All assessments
      </button>
      <div className="bmb-card p-6">
        <div className="overline">Assessment</div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033]">{schema.title}</h1>
        <p className="text-sm text-slate-600 mt-1">{schema.description}</p>
      </div>

      <div className="mt-4 space-y-3">
        {schema.questions.map((q) => (
          <AssessQuestion key={q.key} q={q} value={answers[q.key]} onChange={(v) => answer(q.key, v)} />
        ))}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={complete} disabled={!allAnswered}
          className="bg-[#4a2a5a] hover:bg-[#3a1e4a]" data-testid="assess-complete">
          See my results <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function AssessQuestion({ q, value, onChange }) {
  return (
    <div className="bmb-card p-4" data-testid={`assess-q-${q.key}`}>
      <div className="font-medium text-[#1B1033]">{q.label}</div>
      {q.hint && <div className="text-xs text-slate-500 mt-0.5">{q.hint}</div>}

      {q.type === "choice" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {q.options.map((o) => (
            <button key={o} onClick={() => onChange(o)}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                value === o
                  ? "bg-[#4a2a5a] text-white border-[#4a2a5a]"
                  : "border-slate-300 hover:border-[#4a2a5a]"
              }`}>{o}</button>
          ))}
        </div>
      )}
      {q.type === "yes_no_unsure" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {["yes", "no", "unsure"].map((o) => (
            <button key={o} onClick={() => onChange(o)}
              className={`px-3 py-1.5 text-sm rounded-full border ${
                value === o ? "bg-[#4a2a5a] text-white border-[#4a2a5a]" : "border-slate-300 hover:border-[#4a2a5a]"
              }`}>{o}</button>
          ))}
        </div>
      )}
      {q.type === "scale_1_5" && (
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => onChange(n)}
              className={`w-11 h-11 rounded-full border font-medium text-sm ${
                value === n ? "bg-[#4a2a5a] text-white border-[#4a2a5a]" : "border-slate-200 hover:border-[#4a2a5a]"
              }`}>{n}</button>
          ))}
        </div>
      )}
      {(q.type === "multi_select" || q.type === "multi_select_max_6") && (
        <MultiSelect
          options={q.options}
          value={Array.isArray(value) ? value : []}
          max={q.type === "multi_select_max_6" ? 6 : undefined}
          onChange={onChange}
        />
      )}
      {q.type === "rank_top_3" && (
        <Rank3 options={q.options} value={Array.isArray(value) ? value : []} onChange={onChange} />
      )}
    </div>
  );
}

function MultiSelect({ options, value, max, onChange }) {
  const toggle = (o) => {
    const arr = [...value];
    const i = arr.indexOf(o);
    if (i >= 0) arr.splice(i, 1);
    else if (!max || arr.length < max) arr.push(o);
    onChange(arr);
  };
  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((o) => (
          <button key={o} onClick={() => toggle(o)}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              value.includes(o) ? "bg-[#4a2a5a] text-white border-[#4a2a5a]" : "border-slate-300 hover:border-[#4a2a5a]"
            }`}>{o}</button>
        ))}
      </div>
      {max && <div className="text-[11px] text-slate-400 mt-1">Choose up to {max}.</div>}
    </>
  );
}

function Rank3({ options, value, onChange }) {
  const picked = value.slice(0, 3);
  const remaining = options.filter((o) => !picked.includes(o));
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-2">
        {picked.map((o, i) => (
          <button key={o} onClick={() => onChange(picked.filter((x) => x !== o))}
            className="px-3 py-1.5 text-sm rounded-full bg-[#4a2a5a] text-white border border-[#4a2a5a]">
            {i + 1}. {o} ✕
          </button>
        ))}
        {picked.length === 0 && <div className="text-xs text-slate-500">Tap in the order you want.</div>}
      </div>
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
        {remaining.map((o) => (
          <button key={o} disabled={picked.length >= 3}
            onClick={() => onChange([...picked, o])}
            className="px-3 py-1.5 text-sm rounded-full border border-slate-300 hover:border-[#4a2a5a] disabled:opacity-50">
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultBlock({ scoring, assessmentId }) {
  if (assessmentId === "work_style") {
    return (
      <Panel title="Your work-style themes">
        <ul className="space-y-1 text-sm text-slate-700">
          {(scoring.themes || []).map((t, i) => <li key={i}>• {t}</li>)}
          {(!scoring.themes || scoring.themes.length === 0) && <li className="text-slate-500">Not enough responses to summarize.</li>}
        </ul>
      </Panel>
    );
  }
  if (assessmentId === "values") {
    return (
      <>
        <Panel title="Your top values">
          <div className="flex flex-wrap gap-2">
            {(scoring.top_values || []).map((v) => (
              <span key={v} className="bmb-pill bg-[#B76E79]/15 text-[#8E4E5A]">{v}</span>
            ))}
          </div>
        </Panel>
        <Panel title="Your top 3 in order">
          <ol className="text-sm text-slate-700 space-y-1 list-decimal ml-5">
            {(scoring.top_3 || []).map((v) => <li key={v}>{v}</li>)}
          </ol>
        </Panel>
      </>
    );
  }
  if (assessmentId === "interests") {
    return (
      <>
        <Panel title="Interest categories">
          <ul className="text-sm text-slate-700 space-y-1">
            {(scoring.families || []).map((f) => <li key={f}>• {f}</li>)}
          </ul>
        </Panel>
        <Panel title="Example directions to explore">
          <div className="flex flex-wrap gap-2">
            {(scoring.example_paths || []).map((p) => (
              <span key={p} className="bmb-pill bg-[#4a2a5a]/10 text-[#4a2a5a]">{p}</span>
            ))}
          </div>
        </Panel>
      </>
    );
  }
  if (assessmentId === "workforce") {
    return (
      <>
        <Panel title="Starter directions">
          <ul className="text-sm text-slate-700 space-y-1">
            {(scoring.starter_directions || []).map((s) => <li key={s}>• {s}</li>)}
            {(!scoring.starter_directions || scoring.starter_directions.length === 0) && <li className="text-slate-500">Complete more items to see suggestions.</li>}
          </ul>
        </Panel>
      </>
    );
  }
  return null;
}

function Panel({ title, children }) {
  return (
    <div className="bmb-card p-5 mt-4">
      <div className="overline">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
