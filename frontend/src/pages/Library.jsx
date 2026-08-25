import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Section, ProgressBar, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BookOpen, CheckCircle2, Circle, Volume2, FileText, ClipboardList, Library as LibIcon, Sparkles, HelpCircle, Wrench, Compass, ArrowRight, MessageSquare, Play } from "lucide-react";
import { toast } from "sonner";

function CoursesGrid({ courses }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {courses.length === 0 && <EmptyHint>No courses yet.</EmptyHint>}
      {courses.map((c) => (
        <Link to={`/app/library/${c.id}`} key={c.id} className="bmb-card p-5 block hover:-translate-y-0.5 transition-transform" data-testid={`course-${c.id}`}>
          <div className="flex items-start justify-between">
            <div className="overline">{c.category}</div>
            <BookOpen className="w-4 h-4 text-slate-400" />
          </div>
          <div className="font-display text-lg text-[#1B1033] mt-1">{c.title}</div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-3">{c.summary}</p>
          <div className="mt-4"><ProgressBar pct={c.progress || 0} /></div>
          <div className="mt-2 text-xs text-slate-500">{c.lessons_done}/{c.lessons_total} lessons · {c.duration_min} min</div>
        </Link>
      ))}
    </div>
  );
}

export function LibraryPage() {
  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState([]);
  const [keyAreas, setKeyAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);

  useEffect(() => {
    (async () => {
      const [c, r, k] = await Promise.all([
        api.get("/education/courses"),
        api.get("/resources-legacy"),
        api.get("/education/key-areas"),
      ]);
      setCourses(c.data); setResources(r.data); setKeyAreas(k.data);
    })();
  }, []);

  const active = keyAreas.find((k) => k.id === selectedArea);
  const cats = Array.from(new Set(courses.map((c) => c.category)));

  return (
    <div className="space-y-8">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="overline">Learn → Do → Track → Get Help</div>
        <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Education & Resources</h1>
        <p className="text-slate-600 mt-1 max-w-2xl">Learn a subject, do a practical activity, track progress, and reach approved help when it matters — all in one place.</p>
      </div>

      <Section eyebrow="Explore by topic" title="Key Areas"
        description="Every Key Area links to relevant lessons, tools inside your Blueprint, and approved resources.">
        <div className="flex flex-wrap gap-2 mb-5">
          {keyAreas.map((k) => (
            <button key={k.id} onClick={() => setSelectedArea(k.id === selectedArea ? null : k.id)}
              className={`rounded-full px-3 py-1.5 text-xs border transition ${k.id === selectedArea ? "bg-[#1B1033] text-white border-[#1B1033]" : "bg-white text-[#1B1033] border-slate-200 hover:border-[#B76E79]"}`}
              data-testid={`keyarea-${k.id}`}>
              {k.label}
            </button>
          ))}
        </div>
        {active && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bmb-card p-5">
              <div className="flex items-center gap-2 text-[#B76E79]"><BookOpen className="w-4 h-4" /><div className="overline">Learn</div></div>
              <div className="font-display text-lg text-[#1B1033] mt-1">Courses</div>
              <ul className="mt-3 space-y-2">
                {(active.courses || []).length === 0 && <li className="text-xs text-slate-400">No courses yet for this area.</li>}
                {(active.courses || []).map((c) => (
                  <li key={c.id}><Link to={`/app/library/${c.id}`} className="text-sm text-[#1B1033] hover:text-[#B76E79] flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5" /> {c.title}
                  </Link></li>
                ))}
              </ul>
            </div>
            <div className="bmb-card p-5">
              <div className="flex items-center gap-2 text-[#B76E79]"><Wrench className="w-4 h-4" /><div className="overline">Do & Track</div></div>
              <div className="font-display text-lg text-[#1B1033] mt-1">Tools in your Blueprint</div>
              <ul className="mt-3 space-y-2">
                {(active.tools || []).length === 0 && <li className="text-xs text-slate-400">No linked tools yet.</li>}
                {(active.tools || []).map((t) => (
                  <li key={t.route}><Link to={t.route} className="text-sm text-[#1B1033] hover:text-[#B76E79] flex items-center gap-1.5">
                    <ArrowRight className="w-3.5 h-3.5" /> {t.label}
                  </Link></li>
                ))}
              </ul>
            </div>
            <div className="bmb-card p-5">
              <div className="flex items-center gap-2 text-[#B76E79]"><HelpCircle className="w-4 h-4" /><div className="overline">Get Help</div></div>
              <div className="font-display text-lg text-[#1B1033] mt-1">Approved resources</div>
              <ul className="mt-3 space-y-2">
                {(active.resources || []).length === 0 && <li className="text-xs text-slate-400">No approved resources yet.</li>}
                {(active.resources || []).map((r) => (
                  <li key={r.id} className="text-sm text-[#1B1033]">
                    <div className="flex items-center gap-1.5"><ArrowRight className="w-3.5 h-3.5" /> {r.name}</div>
                    <div className="text-[11px] text-slate-500 ml-5">{r.description}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Section>

      {cats.map((cat) => (
        <Section key={cat} eyebrow="Courses" title={cat}>
          <CoursesGrid courses={courses.filter((c) => c.category === cat)} />
        </Section>
      ))}

      <Section eyebrow="Community & partners" title="Resource directory">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {resources.map((r) => (
            <div key={r.id} className="bmb-card p-4" data-testid={`resource-${r.id}`}>
              <div className="overline">{r.category}</div>
              <div className="text-sm font-medium text-[#1B1033] mt-1">{r.name}</div>
              <div className="text-xs text-slate-500 mt-1">{r.description}</div>
              {r.contact && <div className="mt-2 text-xs text-slate-500">Contact: {r.contact}</div>}
              {r.url && <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-[#B76E79] hover:underline mt-1 inline-block">Visit →</a>}
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

// ---- Rich lesson block renderers ----
function TextBlock({ b }) {
  const parts = (b.body || "").split(/\n\n+/);
  return (
    <div>
      {b.title && <div className="overline mb-1 text-[#B76E79]">Learn</div>}
      {b.title && <div className="font-display text-lg text-[#1B1033] mb-2">{b.title}</div>}
      <div className="prose prose-sm text-slate-700 leading-relaxed space-y-3">
        {parts.map((p, i) => <p key={i} className="whitespace-pre-wrap">{p.replace(/\*\*([^*]+)\*\*/g, "$1")}</p>)}
      </div>
    </div>
  );
}
function VideoBlock({ b, lessonId }) {
  // Pings watch percentage to server every ~5 seconds. When % >= 90 the server
  // auto-marks the lesson complete — ereadiness gates flip automatically.
  const [pct, setPct] = React.useState(0);
  const [saved, setSaved] = React.useState(0);
  const videoRef = React.useRef(null);
  React.useEffect(() => {
    let lastSent = 0;
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      if (!v.duration) return;
      const cur = Math.round((v.currentTime / v.duration) * 100);
      setPct(cur);
      if (cur - lastSent >= 5) {
        lastSent = cur;
        api.post("/education/lesson-progress-percent", {
          lesson_id: lessonId, percent_viewed: cur,
          last_position_seconds: Math.round(v.currentTime),
        }).then((r) => setSaved(r.data?.progress || cur)).catch(() => {});
      }
    };
    const onEnded = () => {
      api.post("/education/lesson-progress-percent", {
        lesson_id: lessonId, percent_viewed: 100,
        last_position_seconds: Math.round(v.currentTime || 0),
      }).then(() => setSaved(100)).catch(() => {});
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("ended", onEnded);
    };
  }, [lessonId]);
  return (
    <div className="rounded-xl bg-black/95 border border-slate-200 p-4" data-testid={`video-block-${lessonId}`}>
      <div className="flex items-center gap-2"><Play className="w-4 h-4 text-[#B76E79]" /><div className="overline text-white/80">Video</div></div>
      {b.title && <div className="font-display text-lg text-white mt-1">{b.title}</div>}
      <video
        ref={videoRef}
        controls
        preload="metadata"
        className="mt-3 w-full rounded-lg"
        src={b.video_url}
        poster={b.poster}
        data-testid="lesson-video"
      />
      <div className="mt-2 flex items-center justify-between text-[11px] text-white/70">
        <span>Watched: {pct}%</span>
        <span>{saved >= 90 ? "Lesson complete ✓" : `Saved: ${saved}%`}</span>
      </div>
    </div>
  );
}
function ReflectionBlock({ b, val, onChange }) {
  return (
    <div className="rounded-xl bg-[#B76E79]/6 border border-[#EBD3D0] p-4">
      <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#B76E79]" /><div className="overline text-[#B76E79]">Reflection</div></div>
      {b.title && <div className="font-display text-lg text-[#1B1033] mt-1">{b.title}</div>}
      <p className="text-sm text-slate-700 mt-2">{b.prompt}</p>
      <Textarea rows={4} value={val || ""} onChange={(e) => onChange(e.target.value)} className="mt-3" placeholder="Write your reflection…" data-testid="reflection-input" />
    </div>
  );
}
function WorksheetBlock({ b, val, onChange }) {
  const arr = val || {};
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-[#B76E79]" /><div className="overline text-[#B76E79]">Worksheet</div></div>
      {b.title && <div className="font-display text-lg text-[#1B1033] mt-1">{b.title}</div>}
      <div className="mt-3 space-y-3">
        {(b.prompts || []).map((p, i) => (
          <div key={i}>
            <div className="text-xs text-slate-600 mb-1">{p}</div>
            <Textarea rows={2} value={arr[i] || ""} onChange={(e) => onChange({...arr, [i]: e.target.value})} placeholder="Your answer" />
          </div>
        ))}
      </div>
    </div>
  );
}
function ChecklistBlock({ b, val, onChange }) {
  const set = new Set(val || []);
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#B76E79]" /><div className="overline text-[#B76E79]">Checklist</div></div>
      {b.title && <div className="font-display text-lg text-[#1B1033] mt-1">{b.title}</div>}
      <ul className="mt-3 space-y-2">
        {(b.items || []).map((it, i) => {
          const on = set.has(i);
          return (
            <li key={i}>
              <button onClick={() => { const next = new Set(set); on ? next.delete(i) : next.add(i); onChange([...next]); }}
                className="flex items-start gap-2 text-sm text-left w-full text-[#1B1033]">
                {on ? <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" /> : <Circle className="w-5 h-5 text-slate-300 mt-0.5" />}
                <span className={on ? "line-through text-slate-400" : ""}>{it}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
function ScenarioBlock({ b, val, onChange }) {
  return (
    <div className="rounded-xl bg-[#FBF7F2] border border-[#EBDCE3] p-4">
      <div className="flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#B76E79]" /><div className="overline text-[#B76E79]">Scenario</div></div>
      {b.title && <div className="font-display text-lg text-[#1B1033] mt-1">{b.title}</div>}
      <div className="mt-2 text-sm text-slate-700 italic">"{b.situation}"</div>
      <div className="mt-3 text-sm text-slate-700">{b.question}</div>
      <Textarea rows={3} value={val || ""} onChange={(e) => onChange(e.target.value)} className="mt-2" placeholder="Your take" />
    </div>
  );
}
function ResourceBlock({ b, onNav }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2"><HelpCircle className="w-4 h-4 text-[#B76E79]" /><div className="overline text-[#B76E79]">Get help</div></div>
      {b.title && <div className="font-display text-lg text-[#1B1033] mt-1">{b.title}</div>}
      <ul className="mt-3 space-y-2">
        {(b.items || []).map((it, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <ArrowRight className="w-4 h-4 text-[#B76E79] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-[#1B1033]">{it.label}</div>
              {it.detail && <div className="text-xs text-slate-500">{it.detail}</div>}
              {it.route && <button onClick={() => onNav(it.route)} className="mt-1 text-xs text-[#B76E79] hover:text-[#8E4E5A]">Open →</button>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
function QuizBlock({ b, val, onChange }) {
  const state = val || {};
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className="flex items-center gap-2"><Compass className="w-4 h-4 text-[#B76E79]" /><div className="overline text-[#B76E79]">Knowledge check</div></div>
      {b.title && <div className="font-display text-lg text-[#1B1033] mt-1">{b.title}</div>}
      <div className="mt-3 space-y-4">
        {(b.questions || []).map((q, i) => {
          const picked = state[i];
          const isRight = picked === q.answer;
          const answered = typeof picked === "number";
          return (
            <div key={i}>
              <div className="text-sm font-medium text-[#1B1033]">{i + 1}. {q.q}</div>
              <div className="mt-2 space-y-1">
                {q.options.map((opt, oi) => {
                  const state1 = answered ? (oi === q.answer ? "correct" : (oi === picked ? "wrong" : "")) : "";
                  return (
                    <button key={oi} disabled={answered} onClick={() => onChange({...state, [i]: oi})}
                      className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition ${
                        state1 === "correct" ? "bg-emerald-50 border-emerald-300 text-emerald-800" :
                        state1 === "wrong" ? "bg-red-50 border-red-300 text-red-800" :
                        picked === oi ? "bg-[#B76E79]/10 border-[#B76E79] text-[#1B1033]" :
                        "bg-white border-slate-200 hover:border-[#B76E79]"
                      }`}>
                      {opt}
                    </button>
                  );
                })}
              </div>
              {answered && <div className={`mt-2 text-xs ${isRight ? "text-emerald-700" : "text-slate-600"}`}>{isRight ? "Correct." : "Not quite."} {q.why}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BLOCK_COMPONENTS = { text: TextBlock, reflection: ReflectionBlock, worksheet: WorksheetBlock,
  checklist: ChecklistBlock, scenario: ScenarioBlock, resource: ResourceBlock, quiz: QuizBlock,
  video: VideoBlock };

export function CourseDetail() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [active, setActive] = useState(null);
  const [blockState, setBlockState] = useState({}); // key: lessonId::blockIdx

  const load = async () => {
    const { data } = await api.get(`/education/course/${courseId}`);
    setCourse(data);
    const allLessons = (data.modules || []).flatMap((m) => m.lessons || []);
    setActive((cur) => {
      if (!cur) return allLessons[0] || null;
      return allLessons.find((l) => l.id === cur.id) || allLessons[0] || null;
    });
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [courseId]);

  if (!course) return <div className="text-slate-500">Loading…</div>;

  const complete = async () => {
    await api.post("/education/lesson-progress", { lesson_id: active.id, progress: 100, completed: true });
    toast.success("Lesson complete");
    await load();
  };

  const contentBlocks = active?.content?.length ? active.content : null;

  return (
    <div className="space-y-6" data-testid="course-detail">
      <div className="flex items-center gap-2 text-xs">
        <Link to="/app/library" className="text-slate-500 hover:text-[#1B1033]"><LibIcon className="w-3.5 h-3.5 inline-block mr-1" /> Library</Link>
        <span className="text-slate-300">/</span><span className="text-slate-700">{course.title}</span>
      </div>
      <div className="bmb-card p-6">
        <div className="overline">{course.category}</div>
        <h1 className="font-display text-3xl text-[#1B1033] tracking-tight">{course.title}</h1>
        <p className="text-slate-600 mt-1 max-w-2xl">{course.summary}</p>
        <div className="mt-3 text-xs text-slate-500">~ {course.duration_min} min · {(course.modules || []).reduce((s,m)=>s+(m.lessons?.length||0),0)} lessons</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="bmb-card p-4 h-fit lg:sticky lg:top-4">
          {course.modules.map((m) => (
            <div key={m.id} className="mb-3">
              <div className="overline mb-2">{m.title}</div>
              <div className="space-y-1">
                {m.lessons.map((l) => {
                  const isActive = active?.id === l.id;
                  return (
                    <button key={l.id} onClick={() => setActive(l)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${isActive ? "bg-[#B76E79]/15 text-[#1B1033]" : "hover:bg-slate-50 text-slate-700"}`}
                      data-testid={`lesson-${l.id}`}>
                      {l.completed ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-slate-300" />}
                      <span className="flex-1 truncate">{l.title}</span>
                      <span className="text-[10px] text-slate-400">{l.kind}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </aside>

        <div className="bmb-card p-6">
          {!active ? <EmptyHint>Select a lesson.</EmptyHint> : (
            <>
              <div className="flex items-center gap-2 text-[#B76E79]"><Play className="w-4 h-4" /><div className="overline">Lesson</div></div>
              <h2 className="font-display text-2xl text-[#1B1033] mt-1">{active.title}</h2>

              {contentBlocks ? (
                <div className="mt-6 space-y-5">
                  {contentBlocks.map((b, i) => {
                    const C = BLOCK_COMPONENTS[b.type] || TextBlock;
                    const key = `${active.id}::${i}`;
                    return <C key={i} b={b} val={blockState[key]} onChange={(v) => setBlockState((s) => ({...s, [key]: v}))} onNav={(r) => nav(r)} lessonId={active.id} />;
                  })}
                </div>
              ) : (
                <div className="prose prose-sm text-slate-700 mt-4 whitespace-pre-wrap leading-relaxed">{active.body}</div>
              )}

              <div className="mt-8 flex items-center gap-3 border-t border-slate-100 pt-6">
                {!active.completed ? (
                  <Button onClick={complete} className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="complete-lesson-btn">Mark lesson complete</Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Completed</span>
                )}
                <span className="text-xs text-slate-400">Your work is saved on this device while you're on the lesson.</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LibraryPage;
