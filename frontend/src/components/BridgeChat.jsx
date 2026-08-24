import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Send, Bot, Info, User2, Cpu, Check } from "lucide-react";
import { API, getToken } from "@/lib/api";
import api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const SAFETY = "Bridge helps you organize and navigate. It does not provide legal, medical, mental-health, or crisis advice, and does not guarantee benefits or outcomes. In a crisis, call or text 988. For emergencies, call 911.";

function parseActions(text) {
  const re = /\[([^\]]+)\]\((\/app[^)]*)\)/g;
  const actions = [];
  const seen = new Set();
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = `${m[1]}|${m[2]}`;
    if (!seen.has(key)) { seen.add(key); actions.push({ label: m[1], route: m[2] }); }
  }
  let clean = text
    .replace(re, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/^\s*[-*]\s*$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { clean, actions };
}

export default function BridgeChat({ open, onClose }) {
  const nav = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [personalities, setPersonalities] = useState([]);
  const [personalityId, setPersonalityId] = useState(null);
  const [models, setModels] = useState([]);
  const [modelId, setModelId] = useState(null);
  const scrollRef = useRef(null);

  const isAdmin = !!user?.is_owner;

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [hist, sug, pers] = await Promise.all([
          fetch(`${API}/bridge/history`, { credentials: "include", headers: { Authorization: `Bearer ${getToken() || ""}` } }).then(r => r.ok ? r.json() : []),
          api.get("/bridge/suggestions").then(r => r.data).catch(() => []),
          api.get("/bridge/personalities").then(r => r.data).catch(() => ({ personalities: [], current: null })),
        ]);
        setMessages(hist); setSuggestions(sug);
        setPersonalities(pers.personalities || []); setPersonalityId(pers.current);
        if (isAdmin) {
          const mods = await api.get("/bridge/models").then(r => r.data).catch(() => ({ models: [] }));
          setModels(mods.models || []); setModelId(mods.current);
        }
      } catch {}
    })();
  }, [open, isAdmin]);

  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const send = async (text) => {
    const t = (text ?? input).trim();
    if (!t || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: t }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch(`${API}/bridge/chat`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken() || ""}` },
        body: JSON.stringify({ message: t, model: isAdmin ? modelId : undefined }),
      });
      if (!res.ok || !res.body) throw new Error("Bridge failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const p of parts) {
          const line = p.replace(/^data:\s?/, "");
          if (line === "[DONE]") continue;
          const chunk = line.replace(/<NL>/g, "\n");
          setMessages((m) => {
            if (!m.length) return m;
            const last = m[m.length - 1];
            if (last.role !== "assistant") return m;
            const updated = { ...last, content: last.content + chunk };
            return [...m.slice(0, -1), updated];
          });
        }
      }
    } catch {
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last && last.role === "assistant" && !last.content) last.content = "Bridge is temporarily unavailable. Please try again in a moment.";
        return copy;
      });
    } finally { setStreaming(false); }
  };

  const pickPersonality = async (id) => {
    setPersonalityId(id);
    try { await api.put("/bridge/personality", { personality: id }); } catch {}
  };
  const pickModel = async (id) => {
    setModelId(id);
    try { await api.put("/bridge/model", { model: id }); } catch {}
  };

  if (!open) return null;
  const activePersonality = personalities.find((p) => p.id === personalityId);
  const activeModel = models.find((m) => m.id === modelId);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="bridge-drawer">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:w-[460px] bg-white h-full flex flex-col shadow-2xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-[#1B1033] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#B76E79] flex items-center justify-center"><Bot className="w-5 h-5 text-white" /></div>
            <div>
              <div className="font-display text-lg leading-none">Bridge</div>
              <div className="text-[11px] text-white/60">Your guide across Build My Blueprint</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 text-[11px] text-white/80 hover:text-white bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5" data-testid="bridge-personality-trigger">
                  <User2 className="w-3.5 h-3.5" />
                  <span className="max-w-[110px] truncate">{activePersonality?.label || "Voice"}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
                <DropdownMenuLabel>Bridge voice</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {personalities.map((p) => (
                  <DropdownMenuItem key={p.id} onClick={() => pickPersonality(p.id)} data-testid={`bridge-personality-${p.id}`} className="flex items-start gap-2 py-2">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${p.id === personalityId ? "bg-[#B76E79] text-white" : "bg-slate-100 text-slate-300"}`}>
                      {p.id === personalityId && <Check className="w-3 h-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#1B1033]">{p.label}</div>
                      <div className="text-[11px] text-slate-500">{p.description}</div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {isAdmin && models.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1.5 text-[11px] text-white/80 hover:text-white bg-white/10 hover:bg-white/15 rounded-full px-3 py-1.5" data-testid="bridge-model-trigger">
                    <Cpu className="w-3.5 h-3.5" />
                    <span className="max-w-[80px] truncate">{activeModel?.label || "Model"}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72 max-h-[70vh] overflow-y-auto">
                  <DropdownMenuLabel>ChatGPT model (admin)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {models.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => pickModel(m.id)} data-testid={`bridge-model-${m.id}`} className="flex items-start gap-2 py-2">
                      <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center ${m.id === modelId ? "bg-[#B76E79] text-white" : "bg-slate-100 text-slate-300"}`}>
                        {m.id === modelId && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-[#1B1033]">{m.label}</div>
                        <div className="text-[11px] text-slate-500">{m.description}</div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md ml-1" data-testid="bridge-close-btn"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#FBF7F2]">
          <div className="rounded-xl bg-white border border-slate-200 p-3 text-xs text-slate-600 flex gap-2">
            <Info className="w-4 h-4 text-[#1B1033] shrink-0 mt-0.5" />
            <div>{SAFETY}</div>
          </div>
          {suggestions.length > 0 && !streaming && (
            <div className="space-y-2">
              <div className="text-xs text-slate-500 px-1">{messages.length === 0 ? "Try one of these based on where you are today:" : "Suggested next questions"}</div>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 6).map((s, i) => (
                  <button key={i} onClick={() => send(s)} className="rounded-full bg-white border border-slate-200 hover:border-[#B76E79] px-3 py-1.5 text-xs text-[#1B1033]" data-testid={`bridge-suggestion-${i}`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => {
            if (m.role === "user") return <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap bg-[#1B1033] text-white rounded-br-sm">{m.content}</div></div>;
            const { clean, actions } = parseActions(m.content || "");
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm bg-white border border-slate-200 text-slate-800 rounded-bl-sm">
                  <div className="whitespace-pre-wrap">{clean || (streaming && i === messages.length - 1 ? "…" : "")}</div>
                  {actions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {actions.map((a, j) => (
                        <button key={j} onClick={() => { onClose(); nav(a.route); }} className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white text-xs px-3 py-1.5" data-testid={`bridge-action-${j}`}>{a.label} →</button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="flex items-end gap-2">
            <textarea rows={2} value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask Bridge…"
              className="flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B76E79]/40"
              data-testid="bridge-input" />
            <Button onClick={() => send()} disabled={streaming || !input.trim()} className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white" data-testid="bridge-send-btn"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
