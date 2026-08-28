import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { SECTION_BY_KEY } from "@/lib/sections";
import api from "@/lib/api";
import { Section, ProgressBar, EmptyHint } from "@/components/Bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Plus, Trash2, Upload, FileText, Download, StickyNote } from "lucide-react";
import { toast } from "sonner";
import SupportCircle from "@/pages/subsections/SupportCircle";
import EmploymentRecord from "@/pages/subsections/EmploymentRecord";
import HealthHub from "@/pages/subsections/HealthHub";
import BenefitsHub from "@/pages/subsections/BenefitsHub";
import HomeHub from "@/pages/subsections/HomeHub";
import { API, getToken } from "@/lib/api";

const SPECIAL = {
  "support-circle": SupportCircle,
  "employment-record": EmploymentRecord,
  "health-hub": HealthHub,
  "benefits-hub": BenefitsHub,
  "home-hub": HomeHub,
};

export default function BlueprintSection() {
  const { key } = useParams();
  const section = SECTION_BY_KEY[key];
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [notes, setNotes] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", description: "", due_date: "", priority: "normal" });
  const [newNote, setNewNote] = useState("");

  const Special = SPECIAL[key];

  useEffect(() => {
    if (!section) return;
    (async () => {
      const [t, d, n] = await Promise.all([
        api.get("/tasks", { params: { section: key } }),
        api.get("/documents", { params: { section: key } }),
        api.get("/notes", { params: { section: key } }),
      ]);
      setTasks(t.data);
      setDocuments(d.data);
      setNotes(n.data);
    })();
  }, [key, section]);

  const progress = useMemo(() => {
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100);
  }, [tasks]);

  if (!section) return <div>Unknown section.</div>;
  const Icon = section.icon;

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    const { data } = await api.post("/tasks", { ...newTask, section: key });
    setTasks((prev) => [...prev, data]);
    setAddOpen(false);
    setNewTask({ title: "", description: "", due_date: "", priority: "normal" });
    toast.success("Task added");
  };

  const toggleTask = async (t) => {
    const { data } = await api.patch(`/tasks/${t.id}`, { status: t.status === "done" ? "open" : "done" });
    setTasks((prev) => prev.map((x) => (x.id === t.id ? data : x)));
  };
  const deleteTask = async (id) => {
    await api.delete(`/tasks/${id}`);
    setTasks((prev) => prev.filter((x) => x.id !== id));
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data } = await api.post("/notes", { section: key, content: newNote });
    setNotes((prev) => [data, ...prev]);
    setNoteOpen(false);
    setNewNote("");
  };
  const deleteNote = async (id) => {
    await api.delete(`/notes/${id}`);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const uploadFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    const failed = [];
    try {
      for (const file of files) {
        try {
          const form = new FormData();
          form.append("file", file);
          const { data } = await api.post("/documents/upload", form, {
            params: { section: key, label: file.name },
            headers: { "Content-Type": "multipart/form-data" },
          });
          uploaded.push(data);
        } catch (err) {
          failed.push({ name: file.name, reason: err?.response?.data?.detail || "Upload failed" });
        }
      }
      if (uploaded.length) {
        setDocuments((prev) => [...uploaded.reverse(), ...prev]);
        toast.success(`${uploaded.length} document${uploaded.length === 1 ? "" : "s"} uploaded — private to you`);
      }
      if (failed.length) toast.error(`${failed.length} file${failed.length === 1 ? "" : "s"} could not be uploaded`);
    } finally { setUploading(false); e.target.value = ""; }
  };

  const downloadFile = async (doc) => {
    const res = await fetch(`${API}/documents/${doc.id}/download`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${getToken() || ""}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = doc.original_filename || doc.label || "document";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  const deleteDoc = async (id) => {
    await api.delete(`/documents/${id}`);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-8" data-testid={`section-${key}`}>
      <div className="bmb-card p-6 md:p-8 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-[#B76E79]/10 blur-3xl" />
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><Icon className="w-6 h-6" /></div>
          <div className="flex-1">
            <div className="overline">Blueprint section</div>
            <h1 className="font-display text-3xl md:text-4xl text-[#1B1033] tracking-tight">{section.label}</h1>
            <p className="text-slate-600 mt-1 max-w-2xl">{section.blurb}</p>
          </div>
        </div>
        <div className="mt-6 max-w-lg">
          <div className="flex items-center justify-between mb-1.5 text-xs text-slate-500">
            <span>Section progress</span><span>{progress}%</span>
          </div>
          <ProgressBar pct={progress} />
        </div>
      </div>

      {Special && <Special />}

      {section.checklist?.length > 0 && (
        <Section eyebrow="What's in this section" title="Key areas">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {section.checklist.map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{item}</div>
            ))}
          </div>
        </Section>
      )}

      <Section
        eyebrow="Tasks & reminders"
        title="Things to do"
        action={
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white gap-2" data-testid="add-task-btn">
                <Plus className="w-4 h-4" /> Add task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add a task</DialogTitle></DialogHeader>
              <form onSubmit={addTask} className="space-y-3">
                <div><Label>Title</Label><Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} required data-testid="task-title-input" /></div>
                <div><Label>Description</Label><Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} data-testid="task-desc-input" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Due date</Label><Input type="date" value={newTask.due_date} onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })} data-testid="task-due-input" /></div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                      <SelectTrigger data-testid="task-priority-trigger"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter><Button type="submit" data-testid="task-save-btn" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033]">Save task</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="bmb-card divide-y divide-slate-100">
          {tasks.length === 0 && <div className="p-6"><EmptyHint>No tasks yet. Add one to start tracking.</EmptyHint></div>}
          {tasks.map((t) => (
            <div key={t.id} className="p-4 flex items-start gap-3" data-testid={`task-${t.id}`}>
              <button onClick={() => toggleTask(t)} className={t.status === "done" ? "text-[#10B981]" : "text-slate-300 hover:text-[#1B1033]"} data-testid={`toggle-task-${t.id}`}>
                {t.status === "done" ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${t.status === "done" ? "text-slate-400 line-through" : "text-[#1B1033] font-medium"}`}>{t.title}</div>
                {t.description && <div className="text-xs text-slate-500 mt-0.5">{t.description}</div>}
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                  {t.due_date && <span>Due {t.due_date}</span>}
                  {t.priority === "high" && <span className="bmb-pill bg-[#B76E79]/15 text-[#8E4E5A]">high</span>}
                </div>
              </div>
              <button onClick={() => deleteTask(t.id)} className="text-slate-300 hover:text-red-500" data-testid={`delete-task-${t.id}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Private documents"
        title="Your uploads for this section"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => window.location.assign('/app/documents/scan')}
              className="rounded-full bg-[#4a2a5a] hover:bg-[#3a1e4a] text-white gap-2"
              data-testid="scan-doc-btn"
            >
              <Upload className="w-4 h-4" /> Scan a document
            </Button>
            <label className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033] font-medium px-5 py-2 inline-flex items-center gap-2 cursor-pointer" data-testid="upload-doc-btn">
              <Upload className="w-4 h-4" /> {uploading ? "Uploading…" : "Upload files"}
              <input type="file" hidden multiple accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={uploadFile} data-testid="upload-input" />
            </label>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {documents.length === 0 && <EmptyHint>No documents yet. Uploads stay private to you.</EmptyHint>}
          {documents.map((d) => (
            <div key={d.id} className="bmb-card p-4 flex items-start gap-3" data-testid={`doc-${d.id}`}>
              <FileText className="w-6 h-6 text-[#1B1033] mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#1B1033] truncate">{d.label || d.original_filename}</div>
                <div className="text-[11px] text-slate-500 truncate">{d.original_filename} · {(d.size / 1024).toFixed(1)} KB</div>
                <div className="flex flex-wrap items-center gap-1 mt-1">
                  {d.document_type_label && <span className="bmb-pill bg-[#e8dbe4] text-[#4a2a5a] text-[10px]">{d.document_type_label}</span>}
                  {typeof d.confidence === 'number' && <span className="text-[10px] text-slate-400">{Math.round(d.confidence*100)}%</span>}
                  {d.status === 'needs_review' && <span className="bmb-pill bg-amber-100 text-amber-800 text-[10px]">Needs review</span>}
                </div>
              </div>
              <button onClick={() => downloadFile(d)} className="text-slate-500 hover:text-[#1B1033]" title="Download" data-testid={`download-doc-${d.id}`}><Download className="w-4 h-4" /></button>
              <button onClick={() => deleteDoc(d.id)} className="text-slate-400 hover:text-red-500" title="Remove" data-testid={`delete-doc-${d.id}`}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Journal & notes"
        title="Your notes for this section"
        action={
          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white gap-2" data-testid="add-note-btn"><StickyNote className="w-4 h-4" /> New note</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New note</DialogTitle></DialogHeader>
              <Textarea rows={6} value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Write freely — this is your journal." data-testid="note-input" />
              <DialogFooter><Button onClick={addNote} className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033]" data-testid="note-save-btn">Save note</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {notes.length === 0 && <EmptyHint>No notes yet. This space is private to you.</EmptyHint>}
          {notes.map((n) => (
            <div key={n.id} className="bmb-card p-5" data-testid={`note-${n.id}`}>
              <div className="text-[11px] text-slate-400 mb-2 flex items-center justify-between">
                <span>{new Date(n.created_at).toLocaleString()}</span>
                <button onClick={() => deleteNote(n.id)} className="text-slate-300 hover:text-red-500" data-testid={`delete-note-${n.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap">{n.content}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
