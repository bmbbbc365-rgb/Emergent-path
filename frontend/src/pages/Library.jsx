import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import { Section, ProgressBar, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Circle, Volume2, FileText, ClipboardList, Library } from "lucide-react";
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
          <div className="mt-2 text-xs text-slate-500">{c.lessons_done}/{c.lessons_total} lessons · {c.duration_min} min total</div>
        </Link>
      ))}
    </div>
  );
}

export function LibraryPage() {
  const [courses, setCourses] = useState([]);
  const [resources, setResources] = useState([]);

  useEffect(() => {
    (async () => {
      const [c, r] = await Promise.all([api.get("/education/courses"), api.get("/resources")]);
      setCourses(c.data); setResources(r.data);
    })();
  }, []);

  const cats = Array.from(new Set(courses.map((c) => c.category)));

  return (
    <div className="space-y-8">
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#C94F7C]/10 blur-3xl" />
        <div className="overline">Education & resources</div>
        <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">Learn & find help.</h1>
        <p className="text-slate-600 mt-1 max-w-2xl">Short, practical lessons across life skills, wellness, employment, digital, and money. Plus a curated resource directory.</p>
      </div>

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

const LESSON_ICON = { text: FileText, activity: ClipboardList, audio: Volume2, quiz: ClipboardList, video: BookOpen };

export function CourseDetail() {
  const { courseId } = useParams();
  const nav = useNavigate();
  const [course, setCourse] = useState(null);
  const [active, setActive] = useState(null);

  const load = async () => {
    const { data } = await api.get(`/education/course/${courseId}`);
    setCourse(data);
    // Always resolve `active` against the freshly loaded lesson so completion state stays in sync.
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

  return (
    <div className="space-y-6" data-testid="course-detail">
      <div className="flex items-center gap-2 text-xs">
        <Link to="/app/library" className="text-slate-500 hover:text-[#1B1033]"><Library className="w-3.5 h-3.5 inline-block mr-1" /> Library</Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-700">{course.title}</span>
      </div>
      <div className="bmb-card p-6">
        <div className="overline">{course.category}</div>
        <h1 className="font-display text-3xl text-[#1B1033] tracking-tight">{course.title}</h1>
        <p className="text-slate-600 mt-1 max-w-2xl">{course.summary}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="bmb-card p-4 h-fit sticky top-4">
          {course.modules.map((m) => (
            <div key={m.id} className="mb-3">
              <div className="overline mb-2">{m.title}</div>
              <div className="space-y-1">
                {m.lessons.map((l) => {
                  const isActive = active?.id === l.id;
                  return (
                    <button
                      key={l.id}
                      onClick={() => setActive(l)}
                      className={`w-full text-left rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${
                        isActive ? "bg-[#B76E79]/15 text-[#1B1033]" : "hover:bg-slate-50 text-slate-700"
                      }`}
                      data-testid={`lesson-${l.id}`}
                    >
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
              <div className="flex items-center gap-2 text-[#B76E79]">
                {(() => { const I = LESSON_ICON[active.kind] || FileText; return <I className="w-4 h-4" />; })()}
                <div className="overline">{active.kind}</div>
              </div>
              <h2 className="font-display text-2xl text-[#1B1033] mt-1">{active.title}</h2>
              <div className="prose prose-sm text-slate-700 mt-4 whitespace-pre-wrap leading-relaxed">{active.body}</div>
              <div className="mt-6 flex items-center gap-3">
                {!active.completed ? (
                  <Button onClick={complete} className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white" data-testid="complete-lesson-btn">Mark lesson complete</Button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-600 text-sm"><CheckCircle2 className="w-4 h-4" /> Completed</span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default LibraryPage;
