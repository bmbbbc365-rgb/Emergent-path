"""Server-scored quiz runner. Fetches the quiz (options only, no correct answers),
lets the participant answer, submits, and shows real feedback. Wired to Employment
Readiness — a pass automatically flips the workplace_expectations gate.
"""
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, RotateCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function QuizRunner() {
  const { quizId } = useParams();
  const nav = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null); // {score_pct, passed, correct, total}
  const [feedback, setFeedback] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { (async () => {
    try {
      const { data } = await api.get(`/quizzes/${quizId}`);
      setQuiz(data.quiz);
    } catch {
      toast.error("Quiz not found");
      nav(-1);
    }
  })(); }, [quizId, nav]);

  if (!quiz) return <div className="p-8 text-slate-500">Loading quiz…</div>;

  const allAnswered = quiz.questions.every((_, i) => answers[i] !== undefined);

  const submit = async () => {
    if (!allAnswered) return;
    setBusy(true);
    try {
      const payload = {};
      Object.entries(answers).forEach(([k, v]) => { payload[String(k)] = v; });
      const { data } = await api.post(`/quizzes/${quizId}/submit`, { answers: payload });
      setResult(data.result);
      setFeedback(data.feedback || []);
      if (data.result.passed) toast.success(`Passed with ${data.result.score_pct}%`);
      else toast(`Scored ${data.result.score_pct}% — try again`);
    } catch (e) {
      toast.error("Could not submit quiz");
    } finally { setBusy(false); }
  };

  const retry = () => { setAnswers({}); setResult(null); setFeedback([]); };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6" data-testid={`quiz-${quizId}`}>
      <button onClick={() => nav(-1)}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="rounded-3xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #FBF3E9 0%, #EED2E0 100%)", border: "1px solid #E4CDBF" }}>
        <div className="overline text-[#8E4E5A]">Knowledge check</div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033] mt-1">{quiz.title}</h1>
        <p className="text-sm text-slate-600 mt-1">{quiz.description}</p>
        <div className="mt-2 text-[11px] text-slate-500">Passing: {quiz.passing_pct}%</div>
      </div>

      <div className="mt-6 space-y-4">
        {quiz.questions.map((q, i) => {
          const picked = answers[i];
          const fb = result ? feedback.find((f) => f.index === i) : null;
          return (
            <div key={i} className="bmb-card p-5" data-testid={`quiz-q-${i}`}>
              <div className="font-medium text-[#1B1033]">
                <span className="text-slate-400 mr-1">{i + 1}.</span> {q.prompt}
              </div>
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => {
                  const isPicked = picked === oi;
                  let cls = "border-slate-200 hover:border-[#4a2a5a]";
                  if (fb) {
                    if (oi === fb.correct) cls = "border-emerald-300 bg-emerald-50 text-emerald-800";
                    else if (isPicked && !fb.is_correct) cls = "border-rose-300 bg-rose-50 text-rose-800";
                    else cls = "border-slate-200 opacity-70";
                  } else if (isPicked) {
                    cls = "border-[#4a2a5a] bg-[#4a2a5a]/10 text-[#1B1033]";
                  }
                  return (
                    <button key={oi} type="button"
                      disabled={!!result}
                      onClick={() => setAnswers((a) => ({ ...a, [i]: oi }))}
                      className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition ${cls}`}
                      data-testid={`quiz-q-${i}-opt-${oi}`}>
                      <span className="font-medium mr-2">{String.fromCharCode(65 + oi)}.</span>{opt}
                    </button>
                  );
                })}
              </div>
              {fb && (
                <div className={`mt-3 text-xs rounded-lg px-3 py-2 ${fb.is_correct ? "bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-700"}`}>
                  {fb.is_correct
                    ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Correct — {fb.explain}</span>
                    : <span className="inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5 text-rose-500" /> Not quite — {fb.explain}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!result ? (
        <div className="mt-6 flex justify-end">
          <Button onClick={submit} disabled={!allAnswered || busy}
            className="bg-[#4a2a5a] hover:bg-[#3a1e4a]" data-testid="quiz-submit">
            Submit answers <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      ) : (
        <div className={`mt-6 rounded-2xl p-5 ${result.passed ? "bg-emerald-50 border border-emerald-200" : "bg-amber-50 border border-amber-200"}`}
          data-testid="quiz-result">
          <div className="flex items-center gap-2">
            <Sparkles className={`w-5 h-5 ${result.passed ? "text-emerald-600" : "text-amber-600"}`} />
            <div className="font-display text-lg text-[#1B1033]">
              {result.passed ? `You passed with ${result.score_pct}%` : `You scored ${result.score_pct}%`}
            </div>
          </div>
          <div className="text-xs text-slate-600 mt-1">
            {result.correct} of {result.total} correct.
            {result.passed && " This unlocks the matching Employment Readiness item."}
          </div>
          <div className="mt-3 flex gap-2">
            {!result.passed && (
              <Button onClick={retry} variant="outline" size="sm" data-testid="quiz-retry">
                <RotateCw className="w-4 h-4 mr-1" /> Try again
              </Button>
            )}
            <Button onClick={() => nav("/app/section/employment-readiness")}
              size="sm" className="bg-[#4a2a5a] hover:bg-[#3a1e4a]" data-testid="quiz-view-ereadiness">
              See my progress <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
