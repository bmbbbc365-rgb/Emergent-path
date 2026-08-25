import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Circle, ClipboardCheck, FileCheck2, Lock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const STATE_STYLE = {
  completed: "text-emerald-700 bg-emerald-50 border-emerald-200",
  in_progress: "text-amber-700 bg-amber-50 border-amber-200",
  not_started: "text-slate-500 bg-slate-50 border-slate-200",
  needs_attention: "text-rose-700 bg-rose-50 border-rose-200",
};

const STATE_LABEL = {
  completed: "Completed",
  in_progress: "In progress",
  not_started: "Not started",
  needs_attention: "Needs attention",
};

const KIND_ICON = {
  verifiable: ClipboardCheck,
  evidence: FileCheck2,
  attest: CheckCircle2,
};

const KIND_LABEL = {
  verifiable: "Finish the required step",
  evidence: "Requires evidence",
  attest: "You confirm this yourself",
};

/** Employment Readiness with real completion gating. */
export default function EmploymentReadiness() {
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState({});

  const load = async () => {
    try {
      const { data } = await api.get("/ereadiness/progress");
      setData(data);
    } catch { toast.error("Could not load employment readiness"); }
  };
  useEffect(() => { load(); }, []);

  const attest = async (item_key) => {
    setBusy((b) => ({ ...b, [item_key]: true }));
    try {
      await api.post(`/ereadiness/attest/${item_key}`, { attested: true });
      await load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not update");
    } finally {
      setBusy((b) => ({ ...b, [item_key]: false }));
    }
  };

  if (!data) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6" data-testid="ereadiness-page">
      <button onClick={() => nav("/app")}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      <div className="bmb-card p-6">
        <div className="overline">Employment Readiness</div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033]">Build real proof, not a checklist</h1>
        <p className="text-sm text-slate-600 mt-1">
          You cannot mark most items complete without doing the underlying work — that's what makes this ready.
        </p>
        <Progress value={data.pct} className="mt-4 h-2" />
        <div className="mt-2 text-xs text-slate-500">
          {data.completed} of {data.total} complete · {data.pct}%
        </div>
      </div>

      <div className="mt-6 space-y-3">
        {data.items.map((item) => {
          const Icon = KIND_ICON[item.kind] || Circle;
          const style = STATE_STYLE[item.state] || STATE_STYLE.not_started;
          return (
            <div key={item.item_key}
              className={`border rounded-2xl p-4 flex items-start gap-3 ${style}`}
              data-testid={`ereadiness-item-${item.item_key}`}>
              <div className="mt-0.5"><Icon className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#1B1033]">{item.title}</div>
                <div className="text-xs text-slate-500 mt-0.5">{KIND_LABEL[item.kind]}</div>
                {item.state === "completed" && item.evidence?.lesson && (
                  <div className="text-[11px] text-slate-500 mt-1">Lesson: {item.evidence.lesson}</div>
                )}
                {item.state === "completed" && item.evidence?.document_type && (
                  <div className="text-[11px] text-slate-500 mt-1">Evidence: {item.evidence.document_type}</div>
                )}
                <ItemAction item={item} onAttest={() => attest(item.item_key)}
                  busy={busy[item.item_key]} />
              </div>
              <div className="text-[11px] font-medium uppercase tracking-wider">
                {STATE_LABEL[item.state]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemAction({ item, onAttest, busy }) {
  if (item.state === "completed") return null;

  if (item.item_key === "career_exploration") {
    return (
      <Link to="/app/assessments">
        <Button variant="outline" size="sm" className="mt-3" data-testid={`ereadiness-open-${item.item_key}`}>
          Start assessments →
        </Button>
      </Link>
    );
  }
  if (item.item_key === "resume") {
    return (
      <Link to="/app/documents/scan">
        <Button variant="outline" size="sm" className="mt-3" data-testid={`ereadiness-open-${item.item_key}`}>
          Upload resume →
        </Button>
      </Link>
    );
  }
  if (item.item_key === "certifications") {
    return (
      <Link to="/app/documents/scan">
        <Button variant="outline" size="sm" className="mt-3">
          Upload certificate →
        </Button>
      </Link>
    );
  }
  if (item.item_key === "workplace_expectations") {
    return (
      <Link to="/app/quiz/workplace_expectations">
        <Button variant="outline" size="sm" className="mt-3" data-testid={`ereadiness-open-${item.item_key}`}>
          Take the quiz →
        </Button>
      </Link>
    );
  }
  if (item.kind === "verifiable") {
    return (
      <Link to="/app/library">
        <Button variant="outline" size="sm" className="mt-3" data-testid={`ereadiness-open-${item.item_key}`}>
          Open the lesson <Lock className="w-3.5 h-3.5 ml-1" />
        </Button>
      </Link>
    );
  }
  if (item.kind === "attest") {
    return (
      <Button size="sm" className="mt-3 bg-[#4a2a5a] hover:bg-[#3a1e4a]"
        onClick={onAttest} disabled={busy}
        data-testid={`ereadiness-attest-${item.item_key}`}>
        I confirm this ✓
      </Button>
    );
  }
  return null;
}
