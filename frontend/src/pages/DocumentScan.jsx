import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api, { API, getToken } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Camera, Upload, FileText, Eye, EyeOff, Sparkles, AlertTriangle, Check, X, Loader2, Plus, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const SECTION_LABELS = {
  documents: "Document Center",
  requirements: "Release Requirements & Supervision",
  "employment-record": "Employment & Income",
  "employment-readiness": "Employment Readiness",
  "benefits-hub": "Benefits Hub",
  "home-hub": "Home / Getting Established",
  "health-hub": "Health Hub",
  "independent-living": "Independent Living & Resources",
};

const TARGET_OFFERS = {
  employment_income: { label: "Add to Employment & Income", section: "employment-record" },
  employment_job: { label: "Add job to Employment Record", section: "employment-record" },
  benefits_record: { label: "Add to Benefits Hub", section: "benefits-hub" },
  housing_record: { label: "Add housing record", section: "home-hub" },
  health_appointment: { label: "Add health appointment", section: "health-hub" },
  credential: { label: "Add credential to Employment Readiness", section: "employment-readiness" },
  requirement_evidence: { label: "Attach to a requirement", section: "requirements" },
};

export default function DocumentScan() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const cameraInput = useRef(null);
  const fileInput = useRef(null);

  const [step, setStep] = useState("capture"); // capture | analyzing | review | applied
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [duplicate, setDuplicate] = useState(null);
  const [pendingDupData, setPendingDupData] = useState(null); // { file, preview }
  const [analysis, setAnalysis] = useState(null);
  const [document, setDocument] = useState(null);
  const [types, setTypes] = useState([]);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState(null);
  const [applying, setApplying] = useState(false);
  const [revealed, setRevealed] = useState({}); // { key: fullValue }
  const [requirements, setRequirements] = useState([]);
  const [linkReqId, setLinkReqId] = useState("");

  // Editable draft (participant corrections)
  const [draftType, setDraftType] = useState("unknown");
  const [draftLabel, setDraftLabel] = useState("");
  const [draftSection, setDraftSection] = useState("documents");
  const [draftFields, setDraftFields] = useState([]);
  const [keepSensitive, setKeepSensitive] = useState({}); // {key: bool}

  useEffect(() => {
    api.get("/documents/catalog/types").then((r) => setTypes(r.data.types || [])).catch(() => {});
  }, []);

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith("image/")) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
    // check duplicate by hashing on client (quick UX) — final check happens server-side
    await beginAnalyze(f);
  };

  const beginAnalyze = async (f) => {
    setStep("analyzing");
    try {
      const form = new FormData();
      form.append("file", f);
      const { data } = await api.post("/documents/analyze", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocument(data.document);
      setAnalysis(data.analysis);
      if (data.duplicate_of) {
        setDuplicate(data.duplicate_of);
      }
      // Seed draft
      const a = data.analysis;
      if (a) {
        setDraftType(a.document_type || "unknown");
        setDraftLabel(data.document.label || f.name);
        setDraftSection((a.suggested_sections && a.suggested_sections[0]) || "documents");
        setDraftFields((a.fields || []).map((x) => ({ ...x })));
        const ks = {};
        (a.sensitive_fields || []).forEach((sf) => { ks[sf.key] = false; });
        setKeepSensitive(ks);
      } else {
        setDraftType("unknown");
        setDraftLabel(data.document.label || f.name);
        setDraftSection("documents");
        setDraftFields([]);
        setKeepSensitive({});
      }
      setStep("review");
    } catch (e) {
      toast.error("Analyze failed: " + (e.response?.data?.detail || e.message));
      setStep("capture");
    }
  };

  const revealSensitive = async (key) => {
    try {
      const { data } = await api.post(`/documents/${document.id}/reveal-sensitive`, { field_key: key });
      setRevealed((r) => ({ ...r, [key]: data.value }));
    } catch (e) {
      toast.error("Could not reveal");
    }
  };

  const hideSensitive = (key) => setRevealed((r) => { const n = { ...r }; delete n[key]; return n; });

  const confirmDocument = async () => {
    try {
      const keepKeys = Object.entries(keepSensitive).filter(([, v]) => v).map(([k]) => k);
      const { data } = await api.post(`/documents/${document.id}/confirm`, {
        document_type: draftType,
        category: types.find((t) => t.id === draftType)?.category,
        label: draftLabel,
        related_sections: [draftSection, "documents"].filter((s, i, a) => s && a.indexOf(s) === i),
        fields: draftFields,
        keep_sensitive_field_keys: keepKeys,
      });
      setDocument(data.document);
      setAnalysis(data.analysis);
      toast.success("Saved — document organized");
      // Offer extraction application
      const target = data.analysis?.suggested_hub_targets?.[0];
      if (target && TARGET_OFFERS[target]) {
        setApplyTarget(target);
        setApplyOpen(true);
      } else {
        setStep("applied");
      }
    } catch (e) {
      toast.error("Save failed: " + (e.response?.data?.detail || e.message));
    }
  };

  const applyExtraction = async () => {
    if (!applyTarget) return;
    setApplying(true);
    try {
      await api.post(`/documents/${document.id}/apply-extraction`, { target: applyTarget });
      toast.success("Record created");
      setApplyOpen(false);
      setStep("applied");
    } catch (e) {
      toast.error("Apply failed: " + (e.response?.data?.detail || e.message));
    } finally {
      setApplying(false);
    }
  };

  const openLinkRequirement = async () => {
    try {
      const { data } = await api.get("/requirements");
      setRequirements(data || []);
    } catch { setRequirements([]); }
  };

  const linkRequirement = async () => {
    if (!linkReqId) return;
    try {
      await api.post(`/documents/${document.id}/link-requirement`, { requirement_id: linkReqId });
      toast.success("Attached to requirement (not marked complete)");
      setLinkReqId("");
    } catch (e) {
      toast.error("Link failed");
    }
  };

  const confidence = analysis?.confidence || 0;
  const lowConfidence = confidence < 0.5;

  return (
    <div className="min-h-screen bg-[#FBF7F2] pb-24" data-testid="doc-scan-page">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-[#7a5a86]">Smart Document</div>
            <h1 className="text-3xl font-serif text-[#1a1a3a]">Scan a document</h1>
            <p className="text-sm text-slate-600 mt-1">Take a photo or upload — Build My Blueprint will read it for you.</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/app/section/documents")} data-testid="doc-scan-close">
            <X className="w-4 h-4 mr-1" /> Close
          </Button>
        </div>

        {step === "capture" && (
          <CaptureCard
            onCamera={() => cameraInput.current?.click()}
            onFile={() => fileInput.current?.click()}
          />
        )}

        {step === "analyzing" && (
          <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 text-center" data-testid="doc-scan-analyzing">
            <Loader2 className="w-10 h-10 mx-auto text-[#7a5a86] animate-spin" />
            <div className="mt-4 font-serif text-xl text-[#1a1a3a]">Reading your document…</div>
            <p className="text-sm text-slate-500 mt-2">This takes a few seconds. Your file stays private.</p>
          </div>
        )}

        {step === "review" && (
          <ReviewPanel
            preview={preview}
            document={document}
            analysis={analysis}
            duplicate={duplicate}
            types={types}
            draftType={draftType} setDraftType={setDraftType}
            draftLabel={draftLabel} setDraftLabel={setDraftLabel}
            draftSection={draftSection} setDraftSection={setDraftSection}
            draftFields={draftFields} setDraftFields={setDraftFields}
            keepSensitive={keepSensitive} setKeepSensitive={setKeepSensitive}
            revealed={revealed}
            onReveal={revealSensitive} onHide={hideSensitive}
            lowConfidence={lowConfidence}
            onConfirm={confirmDocument}
            onCancel={() => { setStep("capture"); setFile(null); setAnalysis(null); setDocument(null); setPreview(null); }}
          />
        )}

        {step === "applied" && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100 text-center" data-testid="doc-scan-done">
            <div className="w-14 h-14 rounded-full bg-[#e8dbe4] text-[#4a2a5a] flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <div className="mt-4 font-serif text-2xl text-[#1a1a3a]">Organized</div>
            <p className="text-sm text-slate-600 mt-2">
              Your document is saved and linked to the right place in your Blueprint.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {(document?.related_sections || []).filter((s) => SECTION_LABELS[s]).map((s) => (
                <Button key={s} variant="outline" onClick={() => navigate(`/app/section/${s}`)} data-testid={`goto-${s}`}>
                  {SECTION_LABELS[s]} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              ))}
              <Button variant="outline" onClick={openLinkRequirement} data-testid="doc-link-requirement-open">
                Attach to a requirement
              </Button>
              <Button onClick={() => { setStep("capture"); setFile(null); setAnalysis(null); setDocument(null); setPreview(null); }} data-testid="doc-scan-another">
                <Plus className="w-4 h-4 mr-1" /> Scan another
              </Button>
            </div>

            {requirements.length > 0 && (
              <div className="mt-6 text-left border-t pt-4">
                <Label className="text-xs uppercase tracking-wider text-slate-500">Attach as evidence (does not mark complete)</Label>
                <div className="flex gap-2 mt-2">
                  <Select value={linkReqId} onValueChange={setLinkReqId}>
                    <SelectTrigger data-testid="doc-link-req-select"><SelectValue placeholder="Pick a requirement" /></SelectTrigger>
                    <SelectContent>
                      {requirements.map((r) => <SelectItem key={r.id} value={r.id}>{r.description || r.type}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button disabled={!linkReqId} onClick={linkRequirement} data-testid="doc-link-req-save">Attach</Button>
                </div>
              </div>
            )}
          </div>
        )}

        <input
          ref={cameraInput} type="file" accept="image/*" capture="environment"
          className="hidden" onChange={(e) => handleFile(e.target.files?.[0])}
          data-testid="doc-scan-camera-input"
        />
        <input
          ref={fileInput} type="file"
          accept="image/*,application/pdf"
          className="hidden" onChange={(e) => handleFile(e.target.files?.[0])}
          data-testid="doc-scan-file-input"
        />
      </div>

      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent data-testid="doc-apply-dialog">
          <DialogHeader>
            <DialogTitle>{TARGET_OFFERS[applyTarget]?.label || "Use this information"}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            We can use the information you just confirmed to update your Blueprint. You can edit it any time.
          </p>
          <div className="mt-3 max-h-56 overflow-auto text-sm space-y-1">
            {draftFields.map((f) => (
              <div key={f.key} className="flex justify-between border-b border-slate-100 py-1">
                <span className="text-slate-500">{f.label}</span>
                <span className="text-slate-900 truncate ml-2">{String(f.value ?? "")}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setApplyOpen(false); setStep("applied"); }} data-testid="doc-apply-skip">
              Skip
            </Button>
            <Button onClick={applyExtraction} disabled={applying} data-testid="doc-apply-confirm">
              {applying ? "Adding…" : "Confirm & add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CaptureCard({ onCamera, onFile }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" data-testid="doc-scan-capture">
      <button
        onClick={onCamera}
        className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-[#7a5a86] hover:shadow-md transition text-left"
        data-testid="doc-scan-take-photo"
      >
        <div className="w-12 h-12 rounded-full bg-[#e8dbe4] text-[#4a2a5a] flex items-center justify-center">
          <Camera className="w-6 h-6" />
        </div>
        <div className="mt-4 font-serif text-xl text-[#1a1a3a]">Take a photo</div>
        <div className="text-sm text-slate-500 mt-1">Best on your phone. Uses your camera.</div>
      </button>
      <button
        onClick={onFile}
        className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:border-[#7a5a86] hover:shadow-md transition text-left"
        data-testid="doc-scan-upload"
      >
        <div className="w-12 h-12 rounded-full bg-[#e8dbe4] text-[#4a2a5a] flex items-center justify-center">
          <Upload className="w-6 h-6" />
        </div>
        <div className="mt-4 font-serif text-xl text-[#1a1a3a]">Upload a file</div>
        <div className="text-sm text-slate-500 mt-1">JPG, PNG, or PDF up to 20MB.</div>
      </button>
      <div className="sm:col-span-2 text-xs text-slate-500 mt-2 flex items-start gap-2">
        <Sparkles className="w-3 h-3 mt-0.5 text-[#a4874b]" />
        Build My Blueprint reads your document and suggests where it belongs. You always confirm before anything is saved.
      </div>
    </div>
  );
}

function ReviewPanel({
  preview, document, analysis, duplicate,
  types, draftType, setDraftType, draftLabel, setDraftLabel,
  draftSection, setDraftSection, draftFields, setDraftFields,
  keepSensitive, setKeepSensitive, revealed, onReveal, onHide,
  lowConfidence, onConfirm, onCancel,
}) {
  const suggested = analysis || {};
  const suggestedLabel = suggested.document_type_label || "Undetermined";
  const confidencePct = Math.round((suggested.confidence || 0) * 100);
  const sections = [...new Set([...(suggested.suggested_sections || []), "documents"])];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100" data-testid="doc-scan-review">
      {duplicate && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2" data-testid="doc-scan-duplicate">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-900 flex-1">
            <div className="font-medium">This document may already be in your Blueprint.</div>
            <div className="text-xs mt-1">"{duplicate.label}" — uploaded {duplicate.uploaded_at?.slice(0, 10)}</div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mb-6">
        {preview ? (
          <img src={preview} alt="preview" className="w-24 h-32 object-cover rounded-lg border" />
        ) : (
          <div className="w-24 h-32 rounded-lg border bg-slate-50 flex items-center justify-center">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-xs uppercase tracking-wider text-[#a4874b] mb-1">
            {lowConfidence ? "We're not completely sure" : "We think this is a"}
          </div>
          <div className="text-2xl font-serif text-[#1a1a3a]" data-testid="doc-scan-suggested-type">{suggestedLabel}</div>
          <div className="text-xs text-slate-500 mt-1">Confidence: {confidencePct}%</div>
          {suggested.summary && (
            <p className="text-sm text-slate-600 mt-2">{suggested.summary}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">Document type</Label>
          <Select value={draftType} onValueChange={setDraftType}>
            <SelectTrigger data-testid="doc-scan-type-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">Name this document</Label>
          <Input value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} data-testid="doc-scan-label-input" />
        </div>

        <div>
          <Label className="text-xs uppercase tracking-wider text-slate-500">Where does this belong?</Label>
          <Select value={draftSection} onValueChange={setDraftSection}>
            <SelectTrigger data-testid="doc-scan-section-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Array.from(new Set([...sections, "documents", "requirements", "employment-record", "employment-readiness",
                "benefits-hub", "home-hub", "health-hub", "independent-living"])).map((s) => (
                <SelectItem key={s} value={s}>{SECTION_LABELS[s] || s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {draftFields.length > 0 && (
          <div>
            <Label className="text-xs uppercase tracking-wider text-slate-500">Information we found</Label>
            <div className="mt-2 space-y-2">
              {draftFields.map((f, i) => (
                <div key={f.key + i} className="grid grid-cols-3 gap-2 items-center">
                  <div className="col-span-1 text-sm text-slate-500">{f.label}</div>
                  <Input
                    value={f.value ?? ""}
                    onChange={(e) => {
                      const nf = [...draftFields];
                      nf[i] = { ...f, value: e.target.value };
                      setDraftFields(nf);
                    }}
                    className="col-span-2"
                    data-testid={`doc-scan-field-${f.key}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {(analysis?.sensitive_fields || []).length > 0 && (
          <div className="border-t pt-4">
            <Label className="text-xs uppercase tracking-wider text-slate-500">Sensitive information found</Label>
            <p className="text-xs text-slate-500 mt-1">Masked by default. Only stored if you check the box.</p>
            <div className="mt-2 space-y-2">
              {(analysis.sensitive_fields || []).map((sf) => (
                <div key={sf.key} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg p-2 border border-slate-100" data-testid={`doc-scan-sensitive-${sf.key}`}>
                  <div className="text-sm">
                    <div className="text-slate-500 text-xs">{sf.label}</div>
                    <div className="font-mono text-slate-800">
                      {revealed[sf.key] ?? sf.value_masked}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-600 flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={!!keepSensitive[sf.key]}
                        onChange={(e) => setKeepSensitive({ ...keepSensitive, [sf.key]: e.target.checked })}
                        data-testid={`doc-scan-keep-${sf.key}`}
                      />
                      Store
                    </label>
                    {revealed[sf.key]
                      ? <Button size="sm" variant="ghost" onClick={() => onHide(sf.key)}><EyeOff className="w-3 h-3" /></Button>
                      : <Button size="sm" variant="ghost" onClick={() => onReveal(sf.key)} data-testid={`doc-scan-reveal-${sf.key}`}><Eye className="w-3 h-3" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between gap-2">
        <Button variant="ghost" onClick={onCancel} data-testid="doc-scan-cancel">Cancel</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDraftType("unknown")} data-testid="doc-scan-undetermined">
            Mark undetermined
          </Button>
          <Button onClick={onConfirm} data-testid="doc-scan-confirm">
            <Check className="w-4 h-4 mr-1" /> Confirm & organize
          </Button>
        </div>
      </div>
    </div>
  );
}
