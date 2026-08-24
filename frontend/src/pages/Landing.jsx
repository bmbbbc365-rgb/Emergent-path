import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  ArrowRight, Shield, FileText, MapPin, HeartHandshake, Compass, Users, Sparkles,
  Briefcase, DollarSign, Laptop, Building2, GraduationCap, HandHeart, Lock, Bot,
  ChevronRight, CheckCircle2, Circle, Flag, Phone, Landmark, Handshake,
} from "lucide-react";

const BBC_ICON = "https://customer-assets-39nsmqrw.emergentagent.net/job_blueprint-launch-9/artifacts/ybm40709_Beautifully_Brokered_Icon_512KB-1.jpg";

const MODULES = [
  { n: "01", title: "Release Requirements & Supervision", accent: "#C94F7C",
    icon: Shield, blurb: "Parole and probation obligations, court dates, reporting, fees, fines, compliance reminders, and first-step actions organized in one private place.",
    items: ["Check-ins & reporting", "Court dates", "Drug testing", "Fees / restitution / fines", "Required classes", "Community service"] },
  { n: "02", title: "Document Center & Getting Established", accent: "#B76E79",
    icon: FileText, blurb: "The paperwork that opens every door. Track what you have, what you need, and where to get it — plus private uploads.",
    items: ["State ID", "Social Security card", "Birth certificate", "Address & phone", "Bank & benefits docs", "Employment records"] },
  { n: "03", title: "Reentry Navigation & Resource Map", accent: "#C48B76",
    icon: MapPin, blurb: "Arkansas county-based resources for the essentials of a stable start, curated for returning citizens and their supporters.",
    items: ["Food assistance", "Clothing & hygiene", "Shelter & transitional housing", "Transportation", "Legal aid", "Healthcare & behavioral health", "Faith & community"] },
  { n: "04", title: "Recovery & Emotional Wellness", accent: "#7A2247",
    icon: HeartHandshake, blurb: "Education, organization, and encouragement — not treatment. Clear pathways to peers, professionals, and crisis support when it matters.",
    items: ["Recovery support", "Counseling pathways", "Peer support", "Coping resources", "Crisis pathways (988)", "Encouragement content"] },
  { n: "05", title: "Decisions & Actions", accent: "#5B1A3A",
    icon: Compass, blurb: "A guided rhythm of what to do now, what can wait, and what's next — from the first 72 hours to the first year.",
    items: ["First 72 hours", "First 30 days", "30 – 90 day goals", "Milestones", "Action-planning cards"] },
  { n: "06", title: "My Support Circle", accent: "#B76E79",
    icon: Users, blurb: "A participant-controlled network of family, sponsors, mentors, advocates, employers, and safe accountability contacts.",
    items: ["Family & sponsors", "Mentors & churches", "Advocates & case navigators", "Employer contacts", "Emergency contacts"] },
  { n: "07", title: "Identity, Confidence & Rebuilding", accent: "#C94F7C",
    icon: Sparkles, blurb: "Rebuild trust with yourself first. Mindset, self-presentation, routines, and clear goals with a growing wins journal.",
    items: ["Strengths & values", "Communication basics", "Daily routines", "Goal setting", "Confidence & self-talk", "Rebuilding trust"] },
  { n: "08", title: "Employment & Professional Readiness", accent: "#C48B76",
    icon: Briefcase, blurb: "Job search, resume, interviews, workplace expectations, certifications, and Arkansas second-chance employer pathways.",
    items: ["Career exploration", "Resume support", "Interview prep", "Workplace expectations", "Certifications & training", "Second-chance employers"] },
  { n: "09", title: "Income & Money Record", accent: "#7A2247",
    icon: DollarSign, blurb: "Pay, deductions, budgeting, awareness of child support, restitution, and savings — with participant-controlled proof of income.",
    items: ["Pay tracking", "Deductions", "Budget basics", "Restitution awareness", "Savings goals", "Proof-of-income organization"] },
  { n: "10", title: "Digital Life Readiness", accent: "#5B1A3A",
    icon: Laptop, blurb: "Email, phone, online applications, secure passwords, and telehealth basics — the digital confidence that unlocks daily life.",
    items: ["Email & communication", "Password / security basics", "Online applications", "Document uploads", "Telehealth access"] },
  { n: "11", title: "Partner, Employer & Advocate Layer", accent: "#B76E79",
    icon: Building2, blurb: "Employers, churches, nonprofits, reentry partners, and training providers plug in with permission-based access and shared outcomes.",
    items: ["Become a partner", "Refer a participant", "Hire second-chance talent", "Offer resources", "Join the network"] },
  { n: "12", title: "Track My Path / Roadmap", accent: "#C94F7C",
    icon: Flag, blurb: "A visible roadmap that shows where you are, upcoming tasks, completed milestones, and long-term goals — built around your journey.",
    items: ["Where I am today", "Upcoming tasks", "Milestones completed", "30 · 90 · 180 · 365-day goals"] },
];

const AUDIENCES = [
  { key: "citizens", label: "Returning citizens", icon: Compass,
    headline: "One organized, private place to rebuild.",
    body: "You control what's shared, and with whom. Nothing here is punitive — it's education, organization, and encouragement." },
  { key: "family", label: "Family & support", icon: HandHeart,
    headline: "Understand what your loved one is walking into.",
    body: "See the shape of the road ahead, know when to help, and how to help well — without stepping into their journey." },
  { key: "advocates", label: "Case managers & advocates", icon: Users,
    headline: "A shared framework that respects the person.",
    body: "Coordinate education, referrals, and follow-up. Access is participant-authorized, always." },
  { key: "employers", label: "Employers & second-chance partners", icon: Briefcase,
    headline: "Reach ready, motivated Arkansas talent.",
    body: "Post opportunities, verify participant-shared readiness materials, and be part of a stability-first hiring pipeline." },
  { key: "faith", label: "Faith-based & nonprofits", icon: Landmark,
    headline: "Plug into the state's reentry network.",
    body: "Offer resources, mentorship, and community. Participants opt into what they receive." },
  { key: "admin", label: "Program administrators", icon: Shield,
    headline: "Outcome reporting without surveillance.",
    body: "See progress and program-level trends built from participant-authorized data — nothing more." },
];

const PARTNER_CARDS = [
  { icon: Handshake, title: "Become a Partner", body: "Join the statewide 10:33-aligned network supporting returning citizens across Arkansas." },
  { icon: Users, title: "Refer a Participant", body: "Invite a returning citizen to their own Blueprint. They own the account — you never see it unless they share." },
  { icon: Briefcase, title: "Hire Second-Chance Talent", body: "Post fair-chance opportunities that reach participants preparing for work through structured readiness." },
  { icon: HandHeart, title: "Offer Resources", body: "Contribute food, clothing, transportation, mentorship, housing, or professional services to the resource map." },
  { icon: Building2, title: "Join the Network", body: "Nonprofits, churches, workforce partners, and training providers welcome. Permission-based sharing, always." },
];

const ROADMAP = [
  { label: "Release day", detail: "Emergency essentials, safe contacts, first 72 hours.", done: true },
  { label: "Week 1 – 2", detail: "ID, phone, address, supervision check-in.", done: true },
  { label: "Day 30", detail: "Housing stability, income started, benefits applied.", done: false },
  { label: "Day 90", detail: "Steady employment, transportation, weekly routines.", done: false },
  { label: "6 months", detail: "Savings started, education/training in progress.", done: false },
  { label: "1 year", detail: "Stability, stronger network, forward goals.", done: false },
];

function Panel({ children, className = "", testId }) {
  return (
    <div className={`rounded-2xl bg-white border border-[#E6D9DE] shadow-[0_1px_2px_rgba(27,16,51,0.04)] ${className}`} data-testid={testId}>
      {children}
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  const [aud, setAud] = useState("citizens");
  const active = AUDIENCES.find((a) => a.key === aud);

  useEffect(() => { if (!loading && user) nav("/app", { replace: true }); }, [loading, user, nav]);

  return (
    <div className="min-h-screen bg-[#F5EFEA] text-[#1B1033]">
      {/* --- Utility bar --- */}
      <div className="bg-[#0B0620] text-white/85 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="tracking-widest uppercase text-white/70">Beautifully Brokered 365 · Build My Blueprint™ Ecosystem</div>
          <div className="flex items-center gap-4">
            <a href="https://buildmyblueprintbbc.com" target="_blank" rel="noreferrer" className="hover:text-[#E8C7A0]" data-testid="utility-bmb-link">buildmyblueprintbbc.com</a>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="hidden sm:inline">Arkansas 10:33 Reentry Support</span>
          </div>
        </div>
      </div>

      {/* --- Header --- */}
      <header className="bg-[#1B1033] text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={BBC_ICON} alt="BBC" className="w-10 h-10 rounded-lg object-cover ring-1 ring-white/20" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Beautifully Brokered 365</div>
              <div className="font-display text-lg leading-tight">Build My Blueprint™</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm text-white/80">
            <a href="#modules" className="hover:text-white">Platform</a>
            <a href="#audiences" className="hover:text-white">Who it's for</a>
            <a href="#partners" className="hover:text-white">Partners</a>
            <a href="#roadmap" className="hover:text-white">Roadmap</a>
            <a href="#guide" className="hover:text-white">Path Guide</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-white/90 hover:text-white" data-testid="header-signin">Sign in</Link>
            <Link to="/login?tab=register" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white text-sm font-medium px-4 py-2" data-testid="header-getstarted">Start my Blueprint</Link>
          </div>
        </div>
      </header>

      {/* --- Banner / mission --- */}
      <section className="relative overflow-hidden bg-[#1B1033] text-white">
        <div className="absolute inset-0 bmb-hero-grid opacity-60 pointer-events-none" />
        <div className="absolute -right-24 top-8 w-[420px] h-[420px] rounded-full bg-[#C94F7C]/30 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-14 pb-20">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] tracking-widest uppercase text-[#E8C7A0]">
            <Flag className="w-3 h-3" /> A Path Forward · Arkansas Reentry Platform
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tighter mt-5 max-w-4xl leading-[1.05]">
            From release to stability, on <span className="text-[#E8C7A0]">one guided path</span> that stays with you.
          </h1>
          <p className="mt-5 text-white/75 max-w-2xl text-base md:text-lg leading-relaxed">
            A Path Forward is Arkansas's participant-owned reentry and life-readiness platform — organizing requirements, documents, resources, employment, wellness, and support into a single, private Blueprint. Aligned with the state's 10:33 initiative direction and built inside the Build My Blueprint™ ecosystem.
          </p>
          <p className="mt-6 text-[#E8C7A0] font-display text-lg tracking-tight">
            Education. Organization. Accountability. Opportunity. A Path Forward.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/login?tab=register" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white font-medium px-6 py-3 inline-flex items-center gap-2" data-testid="hero-cta">
              Start my Blueprint <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#modules" className="rounded-full border border-white/25 hover:border-[#E8C7A0] text-white font-medium px-6 py-3">Explore the 12 modules</a>
            <a href="#partners" className="text-sm text-white/70 hover:text-white ml-1">For partners & employers →</a>
          </div>

          <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl">
            {[
              { k: "Education", d: "Plain-language lessons" },
              { k: "Organization", d: "Everything in one place" },
              { k: "Accountability", d: "You own the record" },
              { k: "Opportunity", d: "Resources & employers" },
            ].map((x) => (
              <div key={x.k} className="rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">{x.k}</div>
                <div className="text-sm text-white/85 mt-1">{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- Audience selector --- */}
      <section id="audiences" className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">Who this serves</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mt-2">Six audiences.<br /> One coordinated path.</h2>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">Each audience sees exactly what's useful to them — and only the information a participant has authorized.</p>
            <div className="mt-6 space-y-1.5">
              {AUDIENCES.map((a) => {
                const AIcon = a.icon;
                const activeSel = aud === a.key;
                return (
                  <button key={a.key} onClick={() => setAud(a.key)} data-testid={`audience-${a.key}`}
                    className={`w-full text-left rounded-xl px-3 py-2.5 flex items-center gap-3 text-sm transition ${
                      activeSel ? "bg-[#1B1033] text-white" : "bg-white text-[#1B1033] border border-[#E6D9DE] hover:border-[#B76E79]"
                    }`}>
                    <AIcon className="w-4 h-4" />
                    <span className="flex-1">{a.label}</span>
                    <ChevronRight className={`w-4 h-4 ${activeSel ? "text-[#E8C7A0]" : "text-slate-300"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <Panel className="p-8 md:p-10 relative overflow-hidden" testId="audience-panel">
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#C94F7C]/8 blur-3xl" />
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">For {active.label.toLowerCase()}</div>
            <h3 className="font-display text-3xl md:text-4xl mt-2 max-w-xl">{active.headline}</h3>
            <p className="text-slate-700 mt-4 max-w-2xl leading-relaxed">{active.body}</p>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-3 gap-3">
              {["Private by default", "Participant owns the record", "Arkansas-focused", "10:33-aligned", "Education, not surveillance", "Permission-based sharing"].map((c) => (
                <div key={c} className="rounded-lg border border-[#EBDCE3] bg-[#FBF7F2] px-3 py-2 text-xs text-slate-700 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#B76E79]" /> {c}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </section>

      {/* --- 12 modules --- */}
      <section id="modules" className="bg-[#EFE6E1]/70 border-y border-[#E6D9DE]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">The Platform</div>
              <h2 className="font-display text-3xl md:text-4xl tracking-tight max-w-2xl">Twelve modules. One organized Blueprint.</h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">Each module works on its own and feeds the participant's dashboard. Nothing is shared unless the participant explicitly grants permission.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <Panel key={m.n} className="p-5 hover:-translate-y-0.5 transition-transform" testId={`module-${m.n}`}>
                  <div className="flex items-start justify-between">
                    <div className="font-display text-4xl leading-none" style={{ color: m.accent }}>{m.n}</div>
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${m.accent}18`, color: m.accent }}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3 text-[10px] uppercase tracking-[0.22em]" style={{ color: m.accent }}>Module</div>
                  <div className="font-display text-lg text-[#1B1033] leading-tight mt-1">{m.title}</div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{m.blurb}</p>
                  <div className="mt-4 border-t border-[#EBDCE3] pt-3 space-y-1.5">
                    {m.items.slice(0, 5).map((it) => (
                      <div key={it} className="flex items-center gap-2 text-[12px] text-slate-700">
                        <Circle className="w-1.5 h-1.5 fill-current" style={{ color: m.accent }} /> {it}
                      </div>
                    ))}
                  </div>
                </Panel>
              );
            })}
          </div>
        </div>
      </section>

      {/* --- Roadmap widget --- */}
      <section id="roadmap" className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">Track my path</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight max-w-2xl mt-2">A visible roadmap from release to stability.</h2>
            <p className="text-sm text-slate-700 mt-4 max-w-2xl leading-relaxed">Every participant sees where they are today, what's coming next, and the milestones that mark real progress. Not a scoreboard — a guide.</p>

            <div className="mt-8 space-y-4">
              {ROADMAP.map((r, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${r.done ? "bg-[#B76E79] text-white" : "bg-white border-2 border-[#B76E79] text-[#B76E79]"}`}>
                      {r.done ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-display">{i + 1}</span>}
                    </div>
                    {i < ROADMAP.length - 1 && <div className="absolute left-1/2 -translate-x-1/2 top-10 w-px h-8 bg-[#B76E79]/30" />}
                  </div>
                  <div className="pb-4">
                    <div className="font-display text-lg text-[#1B1033]">{r.label}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Panel className="p-6 h-fit lg:sticky lg:top-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">Sample dashboard</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Private preview</div>
            </div>
            <div className="rounded-xl bg-[#1B1033] text-white p-4">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Today</div>
              <div className="font-display text-lg mt-1">3 priorities · 2 required</div>
              <div className="mt-3 space-y-2 text-sm">
                {[
                  "Replace state ID at Revenue office",
                  "Weekly check-in call with supervision",
                  "Confirm week's housing arrangement",
                ].map((t, i) => (
                  <div key={t} className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full ${i === 0 ? "bg-[#E8C7A0]" : "border border-white/40"}`} />
                    <span className="text-white/90">{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-center">
              {[["Required", "6 / 12"], ["Docs", "4"], ["Goals", "42%"], ["Lessons", "3 / 22"]].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-[#FBF7F2] border border-[#EBDCE3] py-3">
                  <div className="text-[10px] uppercase tracking-widest text-[#8E4E5A]">{k}</div>
                  <div className="font-display text-xl text-[#1B1033]">{v}</div>
                </div>
              ))}
            </div>
            <Link to="/login" className="mt-5 block text-center rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white text-sm font-medium py-2.5" data-testid="roadmap-cta">See my full Blueprint →</Link>
          </Panel>
        </div>
      </section>

      {/* --- Path Guide (AI) --- */}
      <section id="guide" className="bg-[#1B1033] text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Path Guide · powered by Bridge AI</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mt-2">Your guided assistant for what comes next.</h2>
            <p className="text-white/75 mt-4 max-w-xl leading-relaxed">
              Path Guide reads your Blueprint (with your permission), suggests the next best step, and points to the exact module or approved resource that can help. It never diagnoses, never gives legal advice, and never replaces a professional.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {[
                "What documents am I still missing?",
                "Where can I get help with a resume?",
                "What should I work on today?",
                "How do I find a fair-chance employer?",
              ].map((q) => (
                <div key={q} className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white/85">"{q}"</div>
              ))}
            </div>
            <div className="mt-6 text-xs text-white/60 max-w-lg">In a crisis, Path Guide directs you to 988 (Suicide & Crisis Lifeline) or 911. It is not emergency care.</div>
          </div>

          <div className="rounded-2xl bg-white text-[#1B1033] p-5 shadow-2xl">
            <div className="flex items-center gap-3 pb-3 border-b border-[#EBDCE3]">
              <div className="w-9 h-9 rounded-full bg-[#B76E79] flex items-center justify-center text-white"><Bot className="w-5 h-5" /></div>
              <div>
                <div className="font-display text-lg leading-none">Path Guide</div>
                <div className="text-[11px] text-slate-500">Navigation & support for your Blueprint</div>
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#1B1033] text-white px-3.5 py-2.5 w-fit">What documents am I still missing?</div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-[#FBF7F2] border border-[#EBDCE3] px-3.5 py-3">
                Based on your Document Center you still need to replace your state ID and request a certified birth certificate. I can walk you through both.
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#B76E79] text-white text-[11px] px-3 py-1">Open Document Center →</span>
                  <span className="rounded-full bg-[#B76E79] text-white text-[11px] px-3 py-1">See what's required →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Partner / Employer / Advocate layer --- */}
      <section id="partners" className="max-w-7xl mx-auto px-4 lg:px-8 py-16">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">Partner, employer & advocate layer</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight max-w-2xl">Arkansas's reentry ecosystem, in one place.</h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md">Employers, churches, nonprofits, workforce partners, and training providers connect through permission-based, participant-authorized sharing.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {PARTNER_CARDS.map((p) => {
            const PIcon = p.icon;
            return (
              <Panel key={p.title} className="p-5 flex flex-col" testId={`partner-${p.title.toLowerCase().replace(/[^a-z]/g, "-")}`}>
                <div className="w-10 h-10 rounded-lg bg-[#1B1033] text-white flex items-center justify-center mb-4"><PIcon className="w-4 h-4" /></div>
                <div className="font-display text-lg text-[#1B1033]">{p.title}</div>
                <p className="text-xs text-slate-600 mt-2 flex-1 leading-relaxed">{p.body}</p>
                <Link to="/login?tab=register" className="mt-4 text-xs text-[#B76E79] hover:text-[#8E4E5A] font-medium inline-flex items-center gap-1">Get started <ArrowRight className="w-3 h-3" /></Link>
              </Panel>
            );
          })}
        </div>

        <Panel className="mt-8 p-6 md:p-8 bg-[#FBF7F2] border-[#EBDCE3] grid grid-cols-1 md:grid-cols-[1fr_auto] items-center gap-6">
          <div className="flex items-start gap-4">
            <GraduationCap className="w-8 h-8 text-[#B76E79] shrink-0" />
            <div>
              <div className="font-display text-xl text-[#1B1033]">Aligned with Arkansas's 10:33 direction</div>
              <p className="text-sm text-slate-700 mt-1 leading-relaxed">A statewide framework for the practical, dignified support returning citizens need to move from release to real stability.</p>
            </div>
          </div>
          <Link to="/login?tab=register" className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white font-medium px-6 py-3 whitespace-nowrap" data-testid="partner-cta">Join as a partner</Link>
        </Panel>
      </section>

      {/* --- Privacy stripe --- */}
      <section className="bg-[#1B1033] text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14 flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10">
          <div className="w-14 h-14 rounded-2xl bg-[#E8C7A0]/15 border border-[#E8C7A0]/30 flex items-center justify-center">
            <Lock className="w-7 h-7 text-[#E8C7A0]" />
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Privacy first</div>
            <h3 className="font-display text-2xl md:text-3xl mt-1">Your journey. Your information. You control what is shared.</h3>
            <p className="text-white/70 mt-3 max-w-2xl">Nothing becomes visible to employers, sponsors, family, or programs unless you say so. This platform is education, organization, and opportunity — not surveillance.</p>
          </div>
          <Link to="/login?tab=register" className="rounded-full bg-[#B76E79] hover:bg-[#8E4E5A] text-white font-medium px-6 py-3" data-testid="privacy-cta">Start free</Link>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-[#0B0620] text-white/70">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <img src={BBC_ICON} alt="BBC" className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/15" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Beautifully Brokered 365</div>
                <div className="font-display text-white text-lg leading-tight">Build My Blueprint™</div>
              </div>
            </div>
            <p className="text-xs mt-4 leading-relaxed">A Path Forward is a participant-owned reentry & life-readiness platform inside the Build My Blueprint ecosystem.</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Platform</div>
            <ul className="mt-3 space-y-2 text-xs">
              <li><a href="#modules" className="hover:text-white">12 modules</a></li>
              <li><a href="#roadmap" className="hover:text-white">Track my path</a></li>
              <li><a href="#guide" className="hover:text-white">Path Guide</a></li>
              <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">For partners</div>
            <ul className="mt-3 space-y-2 text-xs">
              <li><a href="#partners" className="hover:text-white">Become a partner</a></li>
              <li><a href="#partners" className="hover:text-white">Hire second-chance talent</a></li>
              <li><a href="#partners" className="hover:text-white">Refer a participant</a></li>
              <li><a href="#partners" className="hover:text-white">Offer resources</a></li>
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Ecosystem</div>
            <ul className="mt-3 space-y-2 text-xs">
              <li><a href="https://buildmyblueprintbbc.com" target="_blank" rel="noreferrer" className="hover:text-white" data-testid="footer-bmb">buildmyblueprintbbc.com</a></li>
              <li>Arkansas 10:33 aligned</li>
              <li>Not legal, medical, or clinical software</li>
              <li className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Crisis: call or text 988</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-white/50">
            <div>© {new Date().getFullYear()} Beautifully Brokered 365 · Build My Blueprint™ · A Path Forward</div>
            <div>Education. Organization. Accountability. Opportunity. A Path Forward.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
