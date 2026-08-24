import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { API, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, FileText, Trash2, Eye, EyeOff, Sparkles, Link2 } from "lucide-react";
import { toast } from "sonner";

const SECTION_LABEL = {
  documents: "Document Center",
  requirements: "Release Requirements & Supervision",
  "employment-record": "Employment & Income",
  "employment-readiness": "Employment Readiness",
  "benefits-hub": "Benefits Hub",
  "home-hub": "Home / Getting Established",
  "health-hub": "Health Hub",
  "independent-living": "Independent Living",
};

export default function DocumentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [doc, setDoc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [events, setEvents] = useState([]);
  const [revealed, setRevealed] = useState({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/documents/${id}`);
      setDoc(data.document);
      setAnalysis(data.analysis);
      setEvents(data.events || []);
    } catch (e) {
      toast.error("Document not found or access denied");
      nav("/app/section/documents");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const download = () => {
    const url = `${API}/documents/${id}/download?auth=${getToken() || ""}`;
    window.open(url, "_blank");
  };

  const reveal = async (key) => {
    try {
      const { data } = await api.post(`/documents/${id}/reveal-sensitive`, { field_key: key });
      setRevealed((r) => ({ ...r, [key]: data.value }));
    } catch {
      toast.error("This value was not stored.");
    }
  };
  const hide = (key) => setRevealed((r) => { const n = { ...r }; delete n[key]; return n; });

  const remove = async () => {
    if (!window.confirm("Remove this document? The original file will be soft-deleted.")) return;
    await api.delete(`/documents/${id}`);
    toast.success("Document removed");
    nav("/app/section/documents");
  };

  if (loading || !doc) return <div className="p-8 text-slate-500">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6" data-testid="doc-detail-page">
      <div className="flex items-center justify-between">
        <button onClick={() => nav(-1)} className="text-sm text-slate-500 hover:text-[#1B1033] inline-flex items-center gap-1" data-testid="doc-detail-back">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={download} data-testid="doc-detail-download"><Download className="w-4 h-4 mr-1" /> View original</Button>
          <Button variant="ghost" onClick={remove} className="text-red-600" data-testid="doc-detail-delete"><Trash2 className="w-4 h-4 mr-1" /> Remove</Button>
        </div>
      </div>

      <div className="bmb-card p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033]"><FileText className="w-6 h-6" /></div>
          <div className="flex-1 min-w-0">
            <div className="overline">{doc.document_type_label || "Document"}</div>
            <h1 className="font-display text-2xl md:text-3xl text-[#1B1033]" data-testid="doc-detail-label">{doc.label || doc.original_filename}</h1>
            <div className="text-xs text-slate-500 mt-1">
              Uploaded {(doc.uploaded_at || "").slice(0, 10)} · {(doc.size / 1024).toFixed(1)} KB · {doc.content_type}
              {typeof doc.confidence === "number" && <> · confidence {Math.round(doc.confidence * 100)}%</>}
            </div>
            {analysis?.summary && (
              <p className="text-sm text-slate-600 mt-3">{analysis.summary}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {(doc.related_sections || []).map((s) => (
            <button key={s} onClick={() => nav(`/app/section/${s}`)} className="bmb-pill bg-[#e8dbe4] text-[#4a2a5a] hover:bg-[#d8c1d0]" data-testid={`doc-detail-goto-${s}`}>
              {SECTION_LABEL[s] || s}
            </button>
          ))}
        </div>
      </div>

      {analysis?.fields?.length > 0 && (
        <div className="bmb-card p-6" data-testid="doc-detail-fields">
          <div className="overline">Information we extracted</div>
          <div className="mt-3 space-y-2 text-sm">
            {analysis.fields.map((f) => (
              <div key={f.key} className="flex justify-between gap-2 border-b border-slate-100 py-1.5">
                <span className="text-slate-500">{f.label}</span>
                <span className="text-slate-900 text-right ml-2">{String(f.value ?? "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis?.sensitive_fields?.length > 0 && (
        <div className="bmb-card p-6" data-testid="doc-detail-sensitive">
          <div className="overline">Sensitive information (masked)</div>
          <p className="text-xs text-slate-500 mt-1">Only you can reveal these. They are not shared with anyone or shown to Bridge.</p>
          <div className="mt-3 space-y-2">
            {analysis.sensitive_fields.map((sf) => (
              <div key={sf.key} className="flex justify-between items-center bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div>
                  <div className="text-xs text-slate-500">{sf.label}</div>
                  <div className="font-mono text-slate-800">{revealed[sf.key] ?? sf.value_masked}</div>
                </div>
                {revealed[sf.key]
                  ? <Button size="sm" variant="ghost" onClick={() => hide(sf.key)} data-testid={`doc-detail-hide-${sf.key}`}><EyeOff className="w-4 h-4" /></Button>
                  : <Button size="sm" variant="ghost" onClick={() => reveal(sf.key)} data-testid={`doc-detail-reveal-${sf.key}`}><Eye className="w-4 h-4" /></Button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {(doc.related_record_ids || []).length > 0 && (
        <div className="bmb-card p-6" data-testid="doc-detail-relations">
          <div className="overline">Connected records</div>
          <div className="mt-3 space-y-1 text-sm">
            {doc.related_record_ids.map((r, i) => (
              <div key={i} className="flex justify-between gap-2 py-1">
                <span className="text-slate-500">{r.type.replace("_", " ")}</span>
                <button className="text-[#4a2a5a] hover:underline" onClick={() => nav(`/app/section/${r.section}`)}>
                  Open {SECTION_LABEL[r.section] || r.section}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="bmb-card p-6" data-testid="doc-detail-events">
          <div className="overline">History</div>
          <div className="mt-3 space-y-1 text-xs text-slate-500">
            {events.map((e) => (
              <div key={e.id} className="flex justify-between">
                <span>{e.type.replace(/_/g, " ").toLowerCase()}</span>
                <span>{(e.created_at || "").slice(0, 19).replace("T", " ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
