import React from "react";

export function Section({ eyebrow, title, description, action, children }) {
  return (
    <section className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
        <div>
          {eyebrow && <div className="overline mb-1">{eyebrow}</div>}
          <h2 className="font-display text-2xl md:text-3xl tracking-tight text-[#1B1033]">{title}</h2>
          {description && <p className="text-sm text-slate-600 mt-1 max-w-2xl">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value, sublabel, accent = false, testId }) {
  return (
    <div className={`bmb-card p-5 ${accent ? "ring-1 ring-[#B76E79]/40" : ""}`} data-testid={testId}>
      <div className="overline mb-2">{label}</div>
      <div className="font-display text-3xl md:text-4xl text-[#1B1033] leading-none">{value}</div>
      {sublabel && <div className="text-xs text-slate-500 mt-2">{sublabel}</div>}
    </div>
  );
}

export function ProgressBar({ pct = 0 }) {
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className="h-full bmb-gold-fill rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

export function EmptyHint({ children }) {
  return <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-500 text-center">{children}</div>;
}
