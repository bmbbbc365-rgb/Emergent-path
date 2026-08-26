import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import {
  ArrowRight, Shield, FileText, MapPin, HeartHandshake, Compass, Users, Sparkles,
  Briefcase, DollarSign, Laptop, Building2, GraduationCap, HandHeart, Lock, Bot,
  ChevronRight, CheckCircle2, Circle, Flag, Phone, Landmark, Handshake, Scale, Info,
  BookOpen, Cog, TrendingUp, HeartPulse, ShieldCheck, Layers, Users2, Wifi, RefreshCcw,
} from "lucide-react";

const BBC_ICON = "https://customer-assets-39nsmqrw.emergentagent.net/job_blueprint-launch-9/artifacts/ybm40709_Beautifully_Brokered_Icon_512KB-1.jpg";

// Modules match the BBC 10:33 infographic exactly (10 primary modules, color-coded)
const MODULES = [
  { n: "01", title: "Release Requirements & Supervision", accent: "#3B6EA8", icon: Shield,
    intro: "Keep track of what you are required to do, when, and with whom.",
    items: ["Probation / Parole Officer(s)", "Required Check-ins (dates & times)", "Drug Testing Requirements",
      "Ankle Monitor (if applicable)", "Restitution, Fines & Fees — amounts, due dates, payments",
      "Required Classes / Programs", "Community Service Requirements", "Court Dates / Hearings",
      "Curfew & Other Conditions", "Completion Status Overview", "Reminders & Alerts (24 hr, 2 hr options)"],
    footer: "What's required stays on track. Stay compliant. Stay free. Stay focused." },
  { n: "02", title: "Document Center & Getting Established", accent: "#C9A24A", icon: FileText,
    intro: "Store your important documents and check off what you need to get done.",
    items: ["Release Papers & Conditions", "Court Documents", "Probation / Parole Documents",
      "Restitution / Payment Records", "Drug Test Results (upload)",
      "Class / Program Enrollment & Completion", "ID (Driver's License, State ID)",
      "W-2s, Pay Stubs, Tax Documents", "Other Important Documents"],
    checklist: ["ID / Driver's License", "Social Security Card", "Birth Certificate",
      "Mailing Address / P.O. Box", "Phone / Email", "Bank Account",
      "Healthcare / Insurance", "Employment Documentation", "Other Essentials"],
    footer: "Scan. Upload. Organize. Access Anytime." },
  { n: "03", title: "Independent Living Skills & Resource Navigation", accent: "#3E7ED0", icon: MapPin,
    intro: "Learn the skills you need for everyday life and find the right resources.",
    items: ["Housing & Utilities", "Transportation", "Food & Meal Planning", "Budgeting Basics",
      "Banking & Financial Access", "Healthcare & Insurance Basics", "Consumer Skills & Contracts",
      "Family Responsibilities", "Government Services",
      "Community Resources Directory", "Referral to 10:33 / Restore Hope / HopeHub & Local Partners"],
    footer: "Get educated. Get connected. Get the help you need." },
  { n: "04", title: "Recovery & Emotional Wellness", accent: "#B84350", icon: HeartHandshake,
    intro: "Tools for recovery, habit change, mental wellness, and growth.",
    subheads: [
      { h: "Recovery / Habit Support", items: ["Alcohol, Drugs & Substance Use", "Smoking / Vaping / Cannabis",
        "Gambling / Other Problem Behaviors", "Readiness to Change (Stages)",
        "Daily Journal & Urge Tracking", "Triggers, Coping Strategies & Insights",
        "Setbacks & Progress", "Find Support & Treatment Resources"] },
      { h: "Mental & Emotional Wellness", items: ["Mood, Stress & Thought Journal",
        "Sleep & Wellness Awareness", "Anger & Emotional Regulation",
        "Boundaries & Healthy Relationships", "Grief, Loss & Life Challenges",
        "When to Seek Professional Help"] },
    ],
    footer: "It's okay to not be okay. You don't have to do this alone." },
  { n: "05", title: "Emotional Skills, Decisions & Reactions", accent: "#2E8B57", icon: Compass,
    intro: "Pause. Think. Choose. Take control of your reactions and decisions.",
    items: ["Recognize Triggers & Reactions", "Pause Before You Act", "Make Good Choices",
      "Consequences & Trade-Offs", "Coping Skills", "Anger Management Education", "Conflict Resolution",
      "Boundaries", "Handling Rejection & Setbacks", "Problem Solving",
      "Recognizing Scams & Manipulation", "De-Escalation Techniques", "Know When to Walk Away",
      "Know When to Get Help"],
    footer: "Every choice is a step toward the life you want." },
  { n: "06", title: "My Support Circle (Phone Book)", accent: "#3B6EA8", icon: Users,
    intro: "Your personal list of people you can count on — when it matters most.",
    items: ["Add People You Trust", "Relationship & Role", "How They Can Help",
      "Best Time & Method to Contact", "Multiple Roles per Person"],
    chips: ["Talk / Emotional Support", "Recovery Support", "Rides / Transportation",
      "Work / Employment", "Family / Children", "Practical Help", "Financial Emergency", "Professional Support"],
    footer: "No one is available? Bridge AI is here 24/7/365. Reach out to your support circle or Bridge." },
  { n: "07", title: "Identity, Confidence & Rebuilding", accent: "#0F8C8C", icon: Sparkles,
    intro: "Discover who you are now and build the confidence to create your future.",
    items: ["Strengths & Values Exploration", "Career Interest & Personality Assessments",
      "Interests, Skills & Talents", "Work Preferences & Motivators", "Goal Setting & Vision",
      "Self-Confidence & Self-Talk", "Handling Rejection", "Rebuilding Your Reputation",
      "Growth Mindset", "Your Story: Past + Future", "Achievements & Wins Journal"],
    footer: "Your past does not define you. Your next chapter starts now." },
  { n: "08", title: "Employment & Professional Readiness", accent: "#D08A2A", icon: Briefcase,
    intro: "Get job-ready and build the skills you need to be hired and keep growing.",
    items: ["Career Exploration & Pathways", "Understanding Job Postings", "Job Search Strategies",
      "Application Assistance", "Resume Builder & Updates",
      "Explain Employment Gaps (the right way)", "Interview Preparation & Practice", "Dress for Success",
      "Professional Communication", "Workplace Expectations", "Feedback & Conflict at Work",
      "Certifications & Training Pathways", "Employer Connections & Opportunities"],
    footer: "Prepare today. Succeed tomorrow." },
  { n: "09", title: "Employment & Income Record", accent: "#7A4BB6", icon: DollarSign,
    intro: "Track your employment, income, and records — build proof of your progress.",
    subheads: [
      { h: "Job / Employer Records", items: ["Employer Name & Address", "Supervisor Name & Contact",
        "Job Title / Position", "Hire Date (required)", "End Date (if applicable)",
        "Employment Status (Active / Ended)", "Pay Rate / Salary (optional for you)",
        "Work Schedule / Hours (typical)"] },
      { h: "Income & Work Log", items: ["Hours Worked", "Gross Pay, Taxes, Deductions, Net Pay",
        "Pay Dates & Pay Stubs (upload)", "Multiple Jobs Allowed"] },
    ],
    footer: "Create Employment Verification Report — share only what's required by law." },
  { n: "10", title: "Digital Life Readiness", accent: "#3E7ED0", icon: Laptop,
    intro: "Learn the digital skills you need to thrive in today's world.",
    items: ["Email & Communication", "Passwords & Security Basics", "Online Applications & Forms",
      "Scanning & Uploading Documents", "Online Portals & Accounts", "Video Calls & Interviews",
      "Digital Signatures", "Online Banking Basics", "Social Media, Privacy & Reputation",
      "Phishing, Scams & Online Safety", "AI Literacy & Responsible Use",
      "Using BBC Platform Confidently"],
    footer: "Digital confidence. More opportunities." },
];

// Partner layer columns exactly like the infographic footer strip
const PARTNER_LAYER = [
  { icon: BookOpen, title: "Curriculum & Workshops",
    body: "Life skills, workforce readiness, financial literacy, CPR & safety, and more.", color: "#3E7ED0" },
  { icon: GraduationCap, title: "Participant Education",
    body: "Self-paced courses, tools, checklists, guides, videos, and resources.", color: "#7A4BB6" },
  { icon: Handshake, title: "Workforce & Employer Engagement",
    body: "Employer connections, job-readiness, retention support, and career pathways.", color: "#D08A2A" },
  { icon: HeartPulse, title: "CPR & Safety Training",
    body: "CPR, AED, Stop the Bleed, Child/Infant Safety, and Emergency Preparedness Training & Certification.", color: "#B84350" },
  { icon: MapPin, title: "Resource Navigation",
    body: "Connect participants to local services, programs, and community partners.", color: "#2E8B57" },
  { icon: Layers, title: "Custom Learning Pathways",
    body: "Personalized learning based on goals, needs, and barriers.", color: "#0F8C8C" },
  { icon: TrendingUp, title: "Progress & Reporting",
    body: "Completion tracking, milestones, and outcomes reporting (with permission).", color: "#3B6EA8" },
  { icon: Users2, title: "Train-the-Trainer & Staff Resources",
    body: "Tools and training for case managers, mentors, and community partners.", color: "#C9A24A" },
];

// "Your journey" pillars — bottom strip on infographic
const TRUST_PILLARS = [
  { icon: Lock, k: "Private & Secure", v: "Your data is yours." },
  { icon: ShieldCheck, k: "You're In Control", v: "Share what you choose." },
  { icon: CheckCircle2, k: "Permission-Based", v: "You approve access." },
  { icon: Wifi, k: "Access Anywhere", v: "On any device." },
  { icon: RefreshCcw, k: "Stays In Sync", v: "Up to date." },
  { icon: HandHeart, k: "Built For Real Life", v: "Simple. Powerful. Yours." },
];

// The seven "My Blueprint · Personal Roadmap" questions from the infographic
const ROADMAP_QUESTIONS = [
  "Where am I now?",
  "Where do I want to be?",
  "What's stopping me?",
  "What can I do myself?",
  "What can BBC teach me?",
  "What resource or provider do I need?",
  "What's next?",
];

function Panel({ children, className = "", accent, testId, num }) {
  return (
    <div className={`relative rounded-2xl bg-white border border-[#E6D9DE] shadow-[0_1px_2px_rgba(11,6,32,0.05)] ${className}`} data-testid={testId}>
      {accent && <div className="absolute inset-y-0 left-0 w-1 rounded-l-2xl" style={{ background: accent }} />}
      {children}
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && user) nav("/app", { replace: true }); }, [loading, user, nav]);

  return (
    <div className="min-h-screen bg-[#F5EFEA] text-[#0B0620]">
      {/* --- Utility bar --- */}
      <div className="bg-[#0B0620] text-white/85 text-[11px]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2 flex flex-wrap items-center justify-between gap-2">
          <div className="tracking-[0.22em] uppercase text-white/70">Beautifully Brokered 365 · Build My Blueprint™ Ecosystem</div>
          <div className="flex items-center gap-4">
            <a href="https://buildmyblueprintbbc.com" target="_blank" rel="noreferrer" className="hover:text-[#E8C7A0]" data-testid="utility-bmb-link">buildmyblueprintbbc.com</a>
            <span className="hidden sm:inline text-white/40">|</span>
            <span className="hidden sm:inline">Aligned with the 10:33 Initiative · Restore Hope · Arkansas</span>
          </div>
        </div>
      </div>

      {/* --- Header --- */}
      <header className="bg-[#0B0620] text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={BBC_ICON} alt="BBC" className="w-11 h-11 rounded-lg object-cover ring-1 ring-white/20" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Beautifully Brokered 365 (BBC)</div>
                <div className="font-display text-lg leading-tight">Build My Blueprint™</div>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 pl-4 ml-2 border-l border-white/15">
              <Flag className="w-4 h-4 text-[#E4177C]" />
              <div className="text-[10px] uppercase tracking-[0.22em] leading-tight">
                10:33 Initiative<br /><span className="text-white/60">Restore Hope · Arkansas</span>
              </div>
            </div>
          </Link>
          <nav className="hidden lg:flex items-center gap-7 text-sm text-white/80">
            <a href="#modules" className="hover:text-white">Modules</a>
            <a href="#roadmap" className="hover:text-white">My Blueprint</a>
            <a href="#partner-layer" className="hover:text-white">Partner Layer</a>
            <a href="#guide" className="hover:text-white">Bridge AI</a>
            <a href="#trust" className="hover:text-white">Privacy</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-white/90 hover:text-white" data-testid="header-signin">Sign in</Link>
            <Link to="/login?tab=register" className="rounded-full bg-[#E4177C] hover:bg-[#B90D63] text-white text-sm font-medium px-4 py-2" data-testid="header-getstarted">Start my Blueprint</Link>
          </div>
        </div>
      </header>

      {/* --- Banner / mission --- */}
      <section className="relative overflow-hidden bg-[#0B0620] text-white">
        <div className="absolute inset-0 bmb-hero-grid opacity-60 pointer-events-none" />
        <div className="absolute -right-24 top-8 w-[420px] h-[420px] rounded-full bg-[#E4177C]/25 blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 lg:px-8 pt-12 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 items-end">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 text-[11px] tracking-[0.22em] uppercase text-[#E8C7A0]">
                <Flag className="w-3 h-3" /> Re-Entry Support & Life Readiness Platform
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-[64px] leading-[1.02] tracking-tighter mt-5 max-w-4xl">
                A path forward — organized, private,<br className="hidden md:block" /> and <span className="text-[#E4177C]">built around you.</span>
              </h1>
              <p className="mt-5 text-[#E8C7A0] font-display text-xl md:text-2xl tracking-tight">
                Education. Organization. Accountability. Opportunity. A Path Forward.
              </p>
              <p className="mt-4 text-white/75 max-w-2xl leading-relaxed">
                A participant-owned re-entry & life-readiness platform. Complementary education, tools, and resource navigation aligned with the Arkansas 10:33 initiative direction and the broader Restore Hope ecosystem — never a replacement for case management, treatment, legal, or state systems.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link to="/login?tab=register" className="rounded-full bg-[#E4177C] hover:bg-[#B90D63] text-white font-medium px-6 py-3 inline-flex items-center gap-2" data-testid="hero-cta">
                  Start my Blueprint <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/demo" className="rounded-full bg-white/95 hover:bg-white text-[#1B1033] font-medium px-6 py-3 inline-flex items-center gap-2" data-testid="explore-demo-cta">
                  <Sparkles className="w-4 h-4 text-[#B76E79]" /> Explore the Demo
                </Link>
                <a href="#modules" className="rounded-full border border-white/25 hover:border-[#E8C7A0] text-white font-medium px-6 py-3">Explore the 10 modules</a>
                <a href="#partner-layer" className="text-sm text-white/70 hover:text-white ml-1">For 10:33 partners →</a>
              </div>
              <p className="mt-3 text-xs text-white/60 max-w-lg">
                See how A Path Forward turns an individual starting point into a personalized pathway toward stability and independence. No sign-up. Fictional participant.
              </p>
            </div>

            {/* Privacy shield card matching infographic */}
            <div className="rounded-2xl bg-white/[0.05] border border-white/15 backdrop-blur px-6 py-5 max-w-xs">
              <div className="flex items-center gap-2 text-[#E4177C]">
                <ShieldCheck className="w-5 h-5" />
                <div className="text-[10px] uppercase tracking-[0.22em] text-white/80">Privacy first</div>
              </div>
              <div className="font-display text-lg text-white mt-2 leading-snug">Your journey. Your information.</div>
              <div className="text-sm text-white/70 mt-1">You control what is shared, with whom, and when.</div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Ecosystem alignment strip --- */}
      <section className="bg-[#EFE6E1] border-y border-[#E6D9DE]">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8">
          <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A] whitespace-nowrap">Complementary to</div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-[#0B0620]">
            <div className="flex items-center gap-2"><Landmark className="w-4 h-4 text-[#E4177C]" /> <span><b>HopeHub</b> · Restore Hope case management</span></div>
            <div className="flex items-center gap-2"><HandHeart className="w-4 h-4 text-[#E4177C]" /> <span><b>CarePortal</b> · Church & community responders</span></div>
            <div className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-[#E4177C]" /> <span><b>Arkansas LAUNCH</b> · Skills-based workforce</span></div>
          </div>
          <div className="text-xs text-slate-600 md:ml-auto">Available across the 19 Arkansas counties with a 100 Families Initiative presence.</div>
        </div>
      </section>

      {/* --- 10 modules + My Blueprint sidebar --- */}
      <section id="modules" className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">The Platform</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight max-w-2xl">Ten modules. One organized Blueprint.</h2>
          </div>
          <p className="text-sm text-slate-600 max-w-md">Each module works on its own and feeds the participant's personal roadmap. Nothing is shared unless the participant explicitly grants permission.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Modules grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MODULES.map((m) => {
              const Icon = m.icon;
              return (
                <Panel key={m.n} accent={m.accent} className="p-5 pl-6" testId={`module-${m.n}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-display text-sm shrink-0" style={{ background: m.accent }}>{m.n}</div>
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: m.accent }}>Module {m.n}</div>
                        <div className="font-display text-lg text-[#0B0620] leading-tight">{m.title}</div>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${m.accent}18`, color: m.accent }}><Icon className="w-4 h-4" /></div>
                  </div>
                  <p className="text-xs text-slate-600 mt-3">{m.intro}</p>

                  {m.items && (
                    <>
                      <div className="mt-3 text-[10px] uppercase tracking-[0.22em] text-slate-400">What's included</div>
                      <ul className="mt-2 space-y-1">
                        {m.items.map((it) => (
                          <li key={it} className="flex items-start gap-2 text-[12px] text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: m.accent }} /> {it}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}

                  {m.subheads && m.subheads.map((s) => (
                    <div key={s.h} className="mt-4">
                      <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: m.accent }}>{s.h}</div>
                      <ul className="mt-2 space-y-1">
                        {s.items.map((it) => (
                          <li key={it} className="flex items-start gap-2 text-[12px] text-slate-700">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: m.accent }} /> {it}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {m.checklist && (
                    <div className="mt-4 rounded-lg bg-[#FBF7F2] border border-[#EBDCE3] p-3">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-[#8E4E5A]">Getting Established Checklist</div>
                      <ul className="mt-2 grid grid-cols-1 gap-1">
                        {m.checklist.map((c) => (
                          <li key={c} className="flex items-start gap-2 text-[12px] text-slate-700">
                            <div className="w-3.5 h-3.5 rounded-[3px] border border-[#8E4E5A]/40 shrink-0 mt-0.5" /> {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {m.chips && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {m.chips.map((c) => (
                        <span key={c} className="bmb-pill" style={{ background: `${m.accent}15`, color: m.accent }}>{c}</span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 pt-3 border-t border-[#EBDCE3] text-[11px] italic" style={{ color: m.accent }}>{m.footer}</div>
                </Panel>
              );
            })}
          </div>

          {/* My Blueprint sidebar */}
          <aside id="roadmap" className="lg:sticky lg:top-4 h-fit space-y-4">
            <Panel accent="#E4177C" className="p-5 pl-6">
              <div className="flex items-center gap-2 text-[#E4177C]">
                <Flag className="w-4 h-4" /><div className="text-[10px] uppercase tracking-[0.22em]">My Blueprint</div>
              </div>
              <div className="font-display text-xl text-[#0B0620] mt-1">Your Personal Roadmap</div>
              <p className="text-xs text-slate-600 mt-2">Your goals. Your plan. Your progress — all in one place.</p>
              <ul className="mt-4 space-y-2">
                {ROADMAP_QUESTIONS.map((q, i) => (
                  <li key={q} className="flex items-start gap-2 text-sm text-[#0B0620]">
                    <div className="w-5 h-5 rounded-full bg-[#E4177C] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</div>
                    {q}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel accent="#3B6EA8" className="p-5 pl-6">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#3B6EA8]">Timeframes</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-[#0B0620]">
                <div className="rounded-lg bg-[#3B6EA8]/8 border border-[#3B6EA8]/20 px-3 py-2">30 days</div>
                <div className="rounded-lg bg-[#3B6EA8]/8 border border-[#3B6EA8]/20 px-3 py-2">90 days</div>
                <div className="rounded-lg bg-[#3B6EA8]/8 border border-[#3B6EA8]/20 px-3 py-2">6 months</div>
                <div className="rounded-lg bg-[#3B6EA8]/8 border border-[#3B6EA8]/20 px-3 py-2">1 year</div>
              </div>
            </Panel>

            <Panel accent="#2E8B57" className="p-5 pl-6">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#2E8B57]">Track & Celebrate</div>
              <ul className="mt-2 space-y-1.5 text-sm text-[#0B0620]">
                {["Milestones", "Certificates", "Tasks & Reminders", "Progress Dashboard"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#2E8B57]" /> {t}</li>
                ))}
              </ul>
              <div className="mt-3 text-[11px] italic text-[#2E8B57]">Create your plan anytime. Keep moving forward.</div>
            </Panel>

            <Panel accent="#B84350" className="p-5 pl-6">
              <div className="flex items-center gap-2 text-[#B84350]">
                <Info className="w-4 h-4" /><div className="text-[10px] uppercase tracking-[0.22em]">Important</div>
              </div>
              <p className="text-xs text-slate-700 mt-2">BBC provides education, tools, and resource navigation. <b>We do not provide:</b></p>
              <ul className="mt-2 space-y-1 text-[12px] text-slate-700">
                {["Legal advice", "Mental health treatment", "Substance use treatment", "Emergency services"].map((t) => (
                  <li key={t} className="flex items-center gap-2"><Scale className="w-3 h-3 text-[#B84350]" /> {t}</li>
                ))}
              </ul>
              <div className="mt-3 text-xs font-medium text-[#B84350]">In an emergency, call 911. Crisis: call or text 988.</div>
            </Panel>
          </aside>
        </div>
      </section>

      {/* --- Bridge AI --- */}
      <section id="guide" className="bg-[#0B0620] text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#E4177C]">Bridge AI · Your intelligent guide</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mt-2">Knows the platform. Understands your Blueprint. Helps you take action.</h2>
            <p className="text-white/75 mt-4 max-w-xl leading-relaxed">
              Bridge is a permission-based AI assistant across Build My Blueprint. It knows the platform's architecture, sees only what you allow, and always points to the right module or approved 10:33 / Restore Hope resource — never diagnosing, never guessing eligibility, never bypassing a professional.
            </p>
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              {[
                "What do I have coming up today?",
                "Where are my tax documents?",
                "What courses do I still need?",
                "Where can I find help with my resume?",
              ].map((q) => (
                <div key={q} className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white/85">"{q}"</div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 max-w-md">
              <div className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Personality</div>
                <div className="text-sm text-white mt-1">Gentle Mother · Tough Coach · Supportive Friend · Bess Frann</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Model</div>
                <div className="text-sm text-white mt-1">ChatGPT models (Terra · Sol · Luna · GPT-5.4)</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white text-[#0B0620] p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#EBDCE3]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#E4177C] flex items-center justify-center text-white"><Bot className="w-5 h-5" /></div>
                <div>
                  <div className="font-display text-lg leading-none">Bridge AI</div>
                  <div className="text-[11px] text-slate-500">I'm here when you need me.</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span className="w-8 h-4 rounded-full bg-[#E4177C] relative"><span className="absolute right-0.5 top-0.5 w-3 h-3 rounded-full bg-white" /></span> ON
              </div>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-[#0B0620] text-white px-3.5 py-2.5 w-fit">What documents am I still missing?</div>
              <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-[#FBF7F2] border border-[#EBDCE3] px-3.5 py-3">
                Based on your Document Center you still need to replace your state ID and request a certified birth certificate. I can walk you through both.
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full bg-[#E4177C] text-white text-[11px] px-3 py-1">Open Document Center →</span>
                  <span className="rounded-full bg-[#E4177C] text-white text-[11px] px-3 py-1">See what's required →</span>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-[#B84350]/8 border border-[#B84350]/25 p-3 text-[11px] text-[#7A2229] flex items-start gap-2">
              <Info className="w-4 h-4 shrink-0 mt-0.5" /> Bridge will not diagnose, prescribe, give legal advice, replace an attorney, provide therapy or crisis counseling, or share your information without permission. Crisis: call or text 988.
            </div>
          </div>
        </div>
      </section>

      {/* --- Partner Layer --- */}
      <section id="partner-layer" className="bg-[#0B0620] text-white">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-14">
          <div className="text-center max-w-3xl mx-auto">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[#E4177C]">The 10:33 / Restore Hope Partner Layer</div>
            <h2 className="font-display text-3xl md:text-4xl tracking-tight mt-2">How BBC supports the entire ecosystem.</h2>
            <p className="text-white/70 mt-4">A statewide framework: BBC contributes education, readiness, safety training, and resource navigation — coordinating with, not competing with, the systems already serving Arkansas returning citizens.</p>
          </div>

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {PARTNER_LAYER.map((p) => {
              const PIcon = p.icon;
              return (
                <div key={p.title} className="rounded-xl bg-white/[0.04] border border-white/10 p-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: `${p.color}22`, color: p.color }}><PIcon className="w-5 h-5" /></div>
                  <div className="font-display text-base text-white leading-tight">{p.title}</div>
                  <p className="text-[11px] text-white/70 mt-1.5 leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 rounded-2xl bg-white/[0.05] border border-white/15 p-6 md:p-7 flex flex-col md:flex-row items-start gap-6">
            <Handshake className="w-8 h-8 text-[#E4177C] shrink-0" />
            <div className="flex-1">
              <div className="font-display text-xl text-white">We walk beside you.</div>
              <p className="text-white/75 text-sm mt-1 max-w-3xl">You take the next step. A better future is possible — supported by the community, coordinated through the ecosystem, and built around what a participant actually chooses to share.</p>
            </div>
            <Link to="/login?tab=register" className="rounded-full bg-[#E4177C] hover:bg-[#B90D63] text-white font-medium px-6 py-3" data-testid="partner-cta">Start my Blueprint</Link>
          </div>
        </div>
      </section>

      {/* --- Trust pillars strip --- */}
      <section id="trust" className="bg-[#0B0620] text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {TRUST_PILLARS.map((p) => {
            const PIcon = p.icon;
            return (
              <div key={p.k} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E4177C]/15 text-[#E4177C] flex items-center justify-center shrink-0"><PIcon className="w-4 h-4" /></div>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em] text-white">{p.k}</div>
                  <div className="text-[11px] text-white/60 mt-0.5">{p.v}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-[#050214] text-white/70">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-3">
              <img src={BBC_ICON} alt="BBC" className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/15" />
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-[#E8C7A0]">Beautifully Brokered 365</div>
                <div className="font-display text-white text-lg leading-tight">Build My Blueprint™</div>
              </div>
            </div>
            <p className="text-xs mt-4 leading-relaxed">Participant-owned re-entry & life-readiness platform, aligned with the Arkansas 10:33 initiative direction. Not case management, not treatment, not legal advice.</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Platform</div>
            <ul className="mt-3 space-y-2 text-xs">
              <li><a href="#modules" className="hover:text-white">10 modules</a></li>
              <li><a href="#roadmap" className="hover:text-white">My Blueprint roadmap</a></li>
              <li><a href="#guide" className="hover:text-white">Bridge AI</a></li>
              <li><Link to="/login" className="hover:text-white">Sign in</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">10:33 Ecosystem</div>
            <ul className="mt-3 space-y-2 text-xs">
              <li>Restore Hope · HopeHub</li>
              <li>CarePortal · For Others</li>
              <li>Arkansas LAUNCH</li>
              <li>100 Families Initiative (19 counties)</li>
            </ul>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/50">Ecosystem</div>
            <ul className="mt-3 space-y-2 text-xs">
              <li><a href="https://buildmyblueprintbbc.com" target="_blank" rel="noreferrer" className="hover:text-white" data-testid="footer-bmb">buildmyblueprintbbc.com</a></li>
              <li>Not legal, medical, or clinical software</li>
              <li className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Crisis: call or text 988</li>
              <li className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> Emergency: call 911</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex flex-col sm:flex-row justify-between gap-2 text-[11px] text-white/50">
            <div>© {new Date().getFullYear()} Beautifully Brokered Consulting LLC · Build My Blueprint™ · A Path Forward</div>
            <div>Education. Organization. Accountability. Opportunity. A Path Forward.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
