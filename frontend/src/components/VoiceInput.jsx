import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { API, getToken } from "@/lib/api";
import { toast } from "sonner";

/** Voice input for Bridge AI.
 *  Primary: Web Speech API (browser native, free, low-latency).
 *  Fallback: OpenAI Whisper via /api/bridge/transcribe when Web Speech isn't available.
 *  Never silently records. Populates the same text field the user types into.
 *
 *  Props:
 *   - disabled: bool
 *   - onTranscript(text): called when a final transcript is ready
 *   - onInterim(text): (optional) live in-progress transcript
 */
export default function VoiceInput({ disabled, onTranscript, onInterim }) {
  const [state, setState] = useState("ready"); // ready | listening | processing | error | denied
  const [error, setError] = useState("");
  const recRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const speechCtor =
    typeof window !== "undefined"
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : null;
  const hasWebSpeech = !!speechCtor;

  useEffect(() => () => { stopAll(); }, []);

  const stopAll = () => {
    try { recRef.current?.stop(); } catch {}
    try { mediaRecorderRef.current?.stop(); } catch {}
    recRef.current = null; mediaRecorderRef.current = null; chunksRef.current = [];
  };

  const startWebSpeech = () => {
    const rec = new speechCtor();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    let finalText = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      if (interim && onInterim) onInterim(interim);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setState("denied");
        setError("Microphone permission was denied. You can still type your question.");
      } else if (e.error === "no-speech") {
        setState("ready");
        setError("I didn't catch that — try again.");
      } else {
        setState("error");
        setError("Voice input hit an error. Try again or type.");
      }
    };
    rec.onend = () => {
      recRef.current = null;
      if (finalText.trim()) {
        setState("ready");
        onTranscript(finalText.trim());
      } else if (state === "listening") {
        setState("ready");
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setState("listening");
      setError("");
    } catch (e) {
      // If we can't start Web Speech, fall through to Whisper
      startWhisper();
    }
  };

  const startWhisper = async () => {
    setError("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      setState("denied");
      setError("Microphone permission was denied. You can still type your question.");
      return;
    }
    // MediaRecorder produces a webm/ogg blob depending on browser.
    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setState("processing");
      const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
      const fd = new FormData();
      fd.append("audio", blob, `voice.${(mr.mimeType || "").includes("ogg") ? "ogg" : "webm"}`);
      try {
        const r = await fetch(`${API}/bridge/transcribe`, {
          method: "POST",
          credentials: "include",
          headers: { Authorization: `Bearer ${getToken() || ""}` },
          body: fd,
        });
        if (!r.ok) throw new Error("transcribe failed");
        const d = await r.json();
        setState("ready");
        if (d.text) onTranscript(d.text.trim());
        else setError("I couldn't make out any words. Try again.");
      } catch {
        setState("error");
        setError("Voice couldn't be transcribed. Please try typing.");
      }
    };
    mr.start();
    setState("listening");
    // Auto-stop after 20 seconds to avoid runaway recording
    setTimeout(() => { if (mediaRecorderRef.current === mr) mr.stop(); }, 20000);
  };

  const start = () => {
    if (disabled) return;
    if (hasWebSpeech) startWebSpeech();
    else startWhisper();
  };

  const stop = () => {
    if (recRef.current) { try { recRef.current.stop(); } catch {} }
    if (mediaRecorderRef.current) { try { mediaRecorderRef.current.stop(); } catch {} }
  };

  const isBusy = state === "listening" || state === "processing";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={isBusy ? stop : start}
        disabled={disabled || state === "denied"}
        aria-label={isBusy ? "Stop listening" : "Start voice input"}
        title={hasWebSpeech ? "Speak your question" : "Speak your question (uses upload)"}
        data-testid="bridge-voice-btn"
        data-voice-state={state}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
          state === "listening"
            ? "bg-[#B76E79] text-white animate-pulse"
            : state === "processing"
            ? "bg-slate-300 text-slate-600"
            : state === "denied"
            ? "bg-slate-100 text-slate-400 cursor-not-allowed"
            : "bg-slate-100 hover:bg-slate-200 text-[#1B1033]"
        }`}
      >
        {state === "processing" ? <Loader2 className="w-4 h-4 animate-spin" />
         : state === "listening" ? <Mic className="w-4 h-4" />
         : state === "denied" ? <MicOff className="w-4 h-4" />
         : <Mic className="w-4 h-4" />}
      </button>
      {(state === "listening" || state === "processing" || error) && (
        <div className="text-[11px] text-slate-500" data-testid="bridge-voice-status">
          {state === "listening" && "Bridge AI is listening…"}
          {state === "processing" && "Transcribing…"}
          {error && !isBusy && <span className="text-rose-600">{error}</span>}
        </div>
      )}
    </div>
  );
}
