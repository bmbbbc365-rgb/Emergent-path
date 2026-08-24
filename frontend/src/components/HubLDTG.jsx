import React from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BookOpen, PlayCircle, LineChart, LifeBuoy, ArrowRight } from "lucide-react";

/**
 * HubLDTG — a contextual Learn → Do → Track → Get Help block for the hubs.
 * All actions/links are REAL routes elsewhere in the app; no dead ends.
 *
 * Props:
 *   learn: [{ title, description?, courseId?, route? }]
 *   doActions: [{ label, route?, onClick?, icon?, testId? }]
 *   track: [{ label, value, hint?, route? }]
 *   help: [{ label, route?, phone?, hint? }]
 *   eyebrow?: string
 */
export default function HubLDTG({ eyebrow = "Learn → Do → Track → Get Help", learn = [], doActions = [], track = [], help = [] }) {
  const nav = useNavigate();

  return (
    <div className="bmb-card p-5" data-testid="hub-ldtg">
      <div className="overline">{eyebrow}</div>
      <Tabs defaultValue="learn" className="mt-3">
        <TabsList>
          <TabsTrigger value="learn" data-testid="ldtg-tab-learn"><BookOpen className="w-3.5 h-3.5 mr-1" /> Learn</TabsTrigger>
          <TabsTrigger value="do" data-testid="ldtg-tab-do"><PlayCircle className="w-3.5 h-3.5 mr-1" /> Do</TabsTrigger>
          <TabsTrigger value="track" data-testid="ldtg-tab-track"><LineChart className="w-3.5 h-3.5 mr-1" /> Track</TabsTrigger>
          <TabsTrigger value="help" data-testid="ldtg-tab-help"><LifeBuoy className="w-3.5 h-3.5 mr-1" /> Get help</TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="mt-4">
          {learn.length === 0 && <EmptyRow>Nothing to learn here yet.</EmptyRow>}
          <div className="grid gap-2 sm:grid-cols-2">
            {learn.map((l, i) => (
              <button
                key={i}
                onClick={() => l.route ? nav(l.route) : (l.courseId && nav(`/app/library/${l.courseId}`))}
                className="text-left group border border-slate-100 hover:border-[#7a5a86] rounded-xl p-3 transition"
                data-testid={`ldtg-learn-${i}`}
              >
                <div className="font-medium text-sm text-[#1B1033] flex items-center justify-between gap-2">
                  <span>{l.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#7a5a86]" />
                </div>
                {l.description && <div className="text-xs text-slate-500 mt-1">{l.description}</div>}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="do" className="mt-4">
          {doActions.length === 0 && <EmptyRow>Nothing to do here yet.</EmptyRow>}
          <div className="flex flex-wrap gap-2">
            {doActions.map((a, i) => (
              <button
                key={i}
                onClick={() => a.onClick ? a.onClick() : (a.route && nav(a.route))}
                className="rounded-full bg-[#4a2a5a] hover:bg-[#3a1e4a] text-white px-4 py-2 text-sm inline-flex items-center gap-2"
                data-testid={a.testId || `ldtg-do-${i}`}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="track" className="mt-4">
          {track.length === 0 && <EmptyRow>Nothing tracked here yet.</EmptyRow>}
          <div className="grid gap-2 sm:grid-cols-3">
            {track.map((t, i) => (
              <button
                key={i}
                onClick={() => t.route && nav(t.route)}
                className="text-left border border-slate-100 hover:border-[#7a5a86] rounded-xl p-3 transition"
                data-testid={`ldtg-track-${i}`}
              >
                <div className="text-xs text-slate-500">{t.label}</div>
                <div className="font-display text-2xl text-[#1B1033] mt-1">{t.value}</div>
                {t.hint && <div className="text-[11px] text-slate-500 mt-0.5">{t.hint}</div>}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="help" className="mt-4">
          {help.length === 0 && <EmptyRow>No help links configured.</EmptyRow>}
          <div className="grid gap-2 sm:grid-cols-2">
            {help.map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  if (h.route) nav(h.route);
                  else if (h.phone) window.location.href = `tel:${h.phone.replace(/\s/g, "")}`;
                }}
                className="text-left border border-slate-100 hover:border-[#7a5a86] rounded-xl p-3 transition"
                data-testid={`ldtg-help-${i}`}
              >
                <div className="font-medium text-sm text-[#1B1033]">{h.label}</div>
                {h.hint && <div className="text-xs text-slate-500 mt-1">{h.hint}</div>}
                {h.phone && <div className="text-xs text-[#4a2a5a] mt-1">{h.phone}</div>}
              </button>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EmptyRow({ children }) {
  return <div className="text-sm text-slate-500 italic border border-dashed border-slate-200 rounded-xl p-4">{children}</div>;
}
