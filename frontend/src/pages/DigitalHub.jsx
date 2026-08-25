import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail, MailPlus, MessageSquare, Table, Globe, FilePlus2, FileText,
  Upload, Paperclip, GraduationCap, Lock, Video, ArrowRight, Laptop, ArrowLeft,
} from "lucide-react";
import { ACCENT } from "@/lib/doorways";

const TILES = [
  { slug: "digital-create-email", label: "Create an Email",
    desc: "Set up an account, pick a professional name, add recovery info.",
    Icon: MailPlus },
  { slug: "digital-email-basics", label: "Email Basics",
    desc: "Inbox, reply, forward, attachments, spotting spam.",
    Icon: Mail },
  { slug: "digital-email-template", label: "Professional Email Template",
    desc: "Copy-paste templates for real reentry situations.",
    Icon: MessageSquare },
  { slug: "digital-spreadsheet", label: "Create a Spreadsheet",
    desc: "Budgets, job trackers, weekly appointments.",
    Icon: Table },
  { slug: "digital-internet-basics", label: "Internet Basics",
    desc: "Browsers, trusted sites, bookmarks, avoiding scams.",
    Icon: Globe },
  { slug: "digital-online-forms", label: "Online Forms & Applications",
    desc: "Fill out forms without losing progress; what to have ready.",
    Icon: FilePlus2 },
  { slug: "digital-documents", label: "Digital Documents",
    desc: "Open, save, rename, and organize your files.",
    Icon: FileText },
  { slug: "digital-upload-download", label: "Upload & Download Files",
    desc: "Move files between your phone, computer, and websites.",
    Icon: Upload },
  { slug: "digital-attach-send", label: "Attach & Send Documents",
    desc: "Send a resume, ID copy, or paperwork by email.",
    Icon: Paperclip },
  { slug: "digital-school-work-tech", label: "School & Work Technology Basics",
    desc: "Canvas, Slack, Teams, Zoom, typing practice.",
    Icon: GraduationCap },
  { slug: "digital-password-safety", label: "Password & Account Safety",
    desc: "Strong passwords, 2FA, spotting phishing.",
    Icon: Lock },
  { slug: "digital-video-calls", label: "Video Calls & Virtual Meetings",
    desc: "Join a call, use mic/camera, look professional.",
    Icon: Video },
];

export default function DigitalHub() {
  const nav = useNavigate();
  const color = ACCENT.digital;
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6" data-testid="digital-hub">
      <button onClick={() => nav("/app")}
        className="text-sm text-slate-500 hover:text-[#4a2a5a] inline-flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      <div className="rounded-3xl p-6 md:p-8 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}22 0%, #B85A4B22 60%, #5B1A3A11 100%)`,
          borderLeft: `4px solid ${color}`,
        }}>
        <div className="absolute -right-16 -top-16 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }} />
        <div className="flex items-center gap-2" style={{ color }}>
          <Laptop className="w-4 h-4" />
          <div className="overline">Practical readiness · not a formal credential</div>
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-[#1B1033] mt-1">Digital Life Readiness</h1>
        <p className="text-sm md:text-base text-slate-700 mt-3 max-w-2xl leading-relaxed">
          Twelve short, plain-language doorways to build digital confidence. Each opens
          into video walkthroughs, step-by-step instructions, and copy-paste templates —
          the practical skills you need for school, work, forms, appointments, and safety.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 mt-6">
        {TILES.map(({ slug, label, desc, Icon }) => (
          <Link key={slug} to={`/app/doorway/${slug}`}
            data-testid={`digital-tile-${slug}`}
            className="group rounded-2xl bg-white p-5 border-l-4 hover:-translate-y-0.5 transition-transform"
            style={{ borderLeftColor: color, boxShadow: "0 1px 3px rgba(27,16,51,0.06)" }}>
            <div className="flex items-start justify-between">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                style={{ background: `${color}18`, color }}>
                <Icon className="w-5 h-5" />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[#4a2a5a]" />
            </div>
            <div className="font-display text-lg text-[#1B1033] mt-3 leading-snug">{label}</div>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-[#E4CDBF] bg-[#FBF3E9] p-5">
        <div className="overline text-[#8E4E5A]">Reminder</div>
        <p className="text-sm text-slate-700 mt-1 leading-relaxed">
          This section is general education and practical readiness — not an official
          school credential. When you're ready for formal training or certifications,
          your case worker and the workforce center can help point you to the right program.
        </p>
      </div>
    </div>
  );
}
