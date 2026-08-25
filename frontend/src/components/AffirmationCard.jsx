import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Sparkles } from "lucide-react";

/** Daily affirmation — rotates deterministically by date. */
export default function AffirmationCard() {
  const [aff, setAff] = useState(null);
  useEffect(() => {
    api.get("/affirmations/today").then((r) => setAff(r.data)).catch(() => {});
  }, []);
  if (!aff) return null;
  return (
    <div
      data-testid="affirmation-card"
      className="rounded-3xl px-6 py-5 md:py-6 relative overflow-hidden"
      style={{
        background: "linear-gradient(120deg, #FBF3E9 0%, #F3E1D8 45%, #EED2E0 100%)",
        border: "1px solid rgba(183, 110, 121, 0.25)",
      }}
    >
      <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(183, 110, 121, 0.18) 0%, transparent 70%)" }} />
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">
        <Sparkles className="w-3.5 h-3.5" /> Today's encouragement
      </div>
      <div className="font-display text-xl md:text-2xl text-[#1B1033] mt-2 leading-snug max-w-2xl">
        {aff.text}
      </div>
    </div>
  );
}
