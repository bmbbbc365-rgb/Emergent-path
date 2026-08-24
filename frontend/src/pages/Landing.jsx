import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Shield, Bot, Lock, Sparkles, Compass, HeartHandshake, Briefcase, FileText, Home } from "lucide-react";

export default function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && user) nav("/app", { replace: true }); }, [loading, user, nav]);

  return (
    <div className="min-h-screen bg-white">
      <header className="max-w-7xl mx-auto px-6 lg:px-10 py-6 flex items-center justify-between">
        <div>
          <div className="overline">Beautifully Brokered 365</div>
          <div className="font-display text-xl leading-tight text-[#1B1033]">Build My Blueprint™</div>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="text-sm font-medium text-[#1B1033] hover:text-[#B76E79]" data-testid="header-signin">Sign in</Link>
          <Link to="/login?tab=register" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white text-sm font-medium px-5 py-2.5" data-testid="header-getstarted">Get started</Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[#1B1033]" />
        <div className="absolute inset-0 -z-10 bmb-hero-grid opacity-40" />
        <div className="absolute -right-24 top-10 w-96 h-96 rounded-full bg-[#B76E79]/20 blur-3xl -z-10" />
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pt-16 pb-24 text-white">
          <div className="overline text-[#B76E79]">Re-Entry Blueprint</div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter mt-3 max-w-3xl">
            One organized, private place to <span className="text-[#B76E79]">rebuild</span> after release.
          </h1>
          <p className="mt-5 text-white/70 max-w-2xl text-base md:text-lg leading-relaxed">
            Requirements, documents, housing, health, benefits, employment, wellness, and life skills — brought together in one calm, encouraging Blueprint. Your journey. Your information. You control what is shared.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/login?tab=register" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033] font-medium px-6 py-3 inline-flex items-center gap-2" data-testid="hero-cta">
              Start my Blueprint <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login" className="rounded-full border border-white/30 hover:border-[#B76E79] text-white font-medium px-6 py-3" data-testid="hero-signin">I have an account</Link>
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl">
            {[
              { icon: Shield, k: "Education" },
              { icon: Compass, k: "Organization" },
              { icon: Sparkles, k: "Accountability" },
              { icon: HeartHandshake, k: "Opportunity" },
            ].map(({ icon: Icon, k }) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/5 backdrop-blur px-4 py-3 flex items-center gap-3">
                <Icon className="w-5 h-5 text-[#B76E79]" />
                <span className="text-sm text-white/85">{k}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 lg:px-10 py-20">
        <div className="overline">Everything in one Blueprint</div>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight text-[#1B1033] mt-2 max-w-2xl">Serious support for a real transition.</h2>
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: Shield, t: "Release Requirements", d: "Track check-ins, court dates, required classes, community service, fees & restitution." },
            { icon: FileText, t: "Document Center", d: "IDs, court papers, benefits, employment records. Uploaded privately and organized." },
            { icon: Home, t: "Home, Health & Benefits Hubs", d: "Housing stability, medications, appointments, insurance, and benefit applications." },
            { icon: Briefcase, t: "Employment & Income", d: "Employers, hours, pay stubs — with participant-controlled verification when needed." },
            { icon: HeartHandshake, t: "Wellness Education", d: "Habits, triggers, coping — education & organization, never a substitute for a professional." },
            { icon: Bot, t: "Bridge AI", d: "A calm, encouraging assistant for “What's next?” — no legal, medical, or crisis advice." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="bmb-card p-6">
              <div className="w-10 h-10 rounded-lg bg-[#1B1033]/5 flex items-center justify-center text-[#1B1033] mb-3">
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-display text-lg text-[#1B1033]">{t}</div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-[#1B1033] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-16 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <div className="w-14 h-14 rounded-2xl bg-[#B76E79]/15 border border-[#B76E79]/30 flex items-center justify-center">
            <Lock className="w-7 h-7 text-[#B76E79]" />
          </div>
          <div className="flex-1">
            <div className="overline text-[#B76E79]">Privacy first</div>
            <h3 className="font-display text-2xl md:text-3xl mt-1">Your journey. Your information. You control what is shared.</h3>
            <p className="text-white/70 mt-3 max-w-2xl">Nothing becomes visible to employers, sponsors, family, or programs unless you say so. This is not surveillance software.</p>
          </div>
          <Link to="/login?tab=register" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-[#1B1033] font-medium px-6 py-3" data-testid="footer-cta">Get started free</Link>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 lg:px-10 py-8 text-xs text-slate-500 flex flex-col sm:flex-row justify-between gap-3">
        <div>© {new Date().getFullYear()} Beautifully Brokered 365 · Build My Blueprint™ · Re-Entry Blueprint</div>
        <div>Education, organization, and opportunity — not legal, medical, or clinical software.</div>
      </footer>
    </div>
  );
}
