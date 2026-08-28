import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Paperclip, Camera, FolderOpen, X, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * RequirementEvidence
 * - Loads documents attached to a single requirement.
 * - Add Evidence → Scan New (redirects to /app/documents/scan) or Choose Existing.
 * - Removing a link does NOT delete the original document.
 * - Attaching evidence does NOT mark the requirement complete.
 */
export default function RequirementEvidence({ requirement, onChanged }) {
  const nav = useNavigate();
  const [docs, setDocs] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [available, setAvailable] = useState([]);
  const [pick, setPick] = useState("");
  const verification = requirement.verification || {};
  const wasReturned = verification.status === "returned";

  const load = async () => {
    try {
      const { data } = await api.get(`/requirements/${requirement.id}/documents`);
      setDocs(data || []);
    } catch { setDocs([]); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [requirement.id, requirement.document_ids?.length]);

  const openChoose = async () => {
    setPickerOpen(false);
    try {
      const { data } = await api.get(`/document-search`, { params: { limit: 50 } });
      // Exclude docs already attached
      const attached = new Set((requirement.document_ids || []));
      setAvailable((data || []).filter((d) => !attached.has(d.id)));
      setPick("");
      setChooseOpen(true);
    } catch { toast.error("Could not load documents"); }
  };

  const attach = async () => {
    if (!pick) return;
    try {
      await api.post(`/documents/${pick}/link-requirement`, { requirement_id: requirement.id });
      toast.success("Attached as evidence (not marked complete)");
      setChooseOpen(false);
      onChanged?.();
      await load();
    } catch (e) {
      toast.error("Attach failed: " + (e.response?.data?.detail || e.message));
    }
  };

  const unlink = async (docId) => {
    try {
      await api.delete(`/documents/${docId}/link-requirement/${requirement.id}`);
      toast.success("Removed evidence link (original document kept)");
      onChanged?.();
      await load();
    } catch { toast.error("Could not remove link"); }
  };

  return (
    <div className="mt-3 border-t pt-3" data-testid={`req-evidence-${requirement.id}`}>
      {wasReturned && (
        <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 p-3" role="alert" data-testid={`fix-it-${requirement.id}`}>
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-700 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-rose-900">Staff returned this evidence for a correction.</div>
              <p className="text-xs text-rose-800 mt-1">{verification.return_reason || "Please review the attached evidence and submit a clearer or updated document."}</p>
              <Button size="sm" className="mt-2 bg-rose-800 hover:bg-rose-900 text-white" onClick={() => setPickerOpen(true)}>Fix it: add corrected evidence</Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="overline">Evidence <span className="text-slate-400 normal-case font-normal">(attaching does not mark complete)</span></div>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)} data-testid={`add-evidence-${requirement.id}`}>
          <Paperclip className="w-3.5 h-3.5 mr-1" /> Add evidence
        </Button>
      </div>

      {docs.length === 0 ? (
        <div className="mt-2 text-xs text-slate-500 italic">No documents attached yet.</div>
      ) : (
        <div className="mt-2 space-y-1.5">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg p-2" data-testid={`evidence-${d.id}`}>
              <FileText className="w-4 h-4 text-[#4a2a5a]" />
              <button className="flex-1 text-left min-w-0" onClick={() => nav(`/app/documents/${d.id}`)}>
                <div className="text-sm text-[#1B1033] truncate">{d.label || d.original_filename}</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {d.document_type_label || "Document"}
                  {d.uploaded_at ? <> · {d.uploaded_at.slice(0, 10)}</> : null}
                  {d.status ? <> · {d.status}</> : null}
                </div>
              </button>
              <button onClick={() => unlink(d.id)} className="text-slate-400 hover:text-red-500" title="Remove evidence link (does not delete the file)" data-testid={`unlink-evidence-${d.id}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent data-testid="add-evidence-picker">
          <DialogHeader><DialogTitle>Add evidence</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">How would you like to add this evidence?</p>
          <div className="grid gap-2 mt-2">
            <button
              onClick={() => nav("/app/documents/scan")}
              className="text-left border border-slate-200 hover:border-[#7a5a86] rounded-xl p-3 flex items-start gap-3"
              data-testid="evidence-scan-new"
            >
              <Camera className="w-4 h-4 mt-0.5 text-[#4a2a5a]" />
              <div>
                <div className="font-medium text-sm">Scan a new document</div>
                <div className="text-xs text-slate-500">Take a photo or upload — Build My Blueprint reads it for you.</div>
              </div>
            </button>
            <button
              onClick={openChoose}
              className="text-left border border-slate-200 hover:border-[#7a5a86] rounded-xl p-3 flex items-start gap-3"
              data-testid="evidence-choose-existing"
            >
              <FolderOpen className="w-4 h-4 mt-0.5 text-[#4a2a5a]" />
              <div>
                <div className="font-medium text-sm">Choose an existing document</div>
                <div className="text-xs text-slate-500">Attach something already in your Document Center.</div>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={chooseOpen} onOpenChange={setChooseOpen}>
        <DialogContent data-testid="choose-existing-dialog">
          <DialogHeader><DialogTitle>Choose an existing document</DialogTitle></DialogHeader>
          {available.length === 0 ? (
            <p className="text-sm text-slate-500">No unattached documents available.</p>
          ) : (
            <Select value={pick} onValueChange={setPick}>
              <SelectTrigger data-testid="choose-existing-select"><SelectValue placeholder="Pick a document" /></SelectTrigger>
              <SelectContent>
                {available.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {(d.document_type_label || "Document") + " · " + (d.label || d.original_filename)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setChooseOpen(false)}>Cancel</Button>
            <Button disabled={!pick} onClick={attach} data-testid="choose-existing-attach">Attach</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
