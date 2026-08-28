import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Building2, ClipboardCheck, ExternalLink, ShieldCheck, Users } from "lucide-react";

const STAFF_ROLES = new Set(["super_admin", "program_admin", "case_manager", "reviewer"]);

export default function PartnerAdmin() {
  const [state, setState] = useState({ loading: true, allowed: false, user: null });

  useEffect(() => {
    api.get("/auth/me")
      .then(({ data }) => {
        const roles = (data.memberships || []).map((item) => item.role);
        setState({ loading: false, allowed: roles.some((role) => STAFF_ROLES.has(role)), user: data });
      })
      .catch(() => setState({ loading: false, allowed: false, user: null }));
  }, []);

  if (state.loading) return <div className="text-slate-500">Loading partner administration…</div>;

  if (!state.allowed) {
    return (
      <div className="max-w-2xl mx-auto rounded-3xl border border-[#E4CDBF] bg-white p-8">
        <ShieldCheck className="w-10 h-10 text-[#8E4E5A]" />
        <h1 className="font-display text-3xl text-[#1B1033] mt-4">Partner administration is restricted.</h1>
        <p className="text-slate-600 mt-3">
          This doorway is available only to authorized A Path Forward program staff. Participant records remain private.
        </p>
        <Link to="/app" className="inline-flex mt-5 rounded-full bg-[#4a2a5a] text-white px-5 py-2.5 text-sm font-semibold">
          Return to My Blueprint
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6" data-testid="partner-admin-page">
      <section className="rounded-3xl px-6 md:px-10 py-8 text-white"
        style={{ background: "linear-gradient(135deg,#1B1033 0%,#4a2a5a 58%,#B76E79 100%)" }}>
        <div className="flex items-center gap-3 text-[#F5D28F] uppercase tracking-[0.2em] text-xs font-semibold">
          <Building2 className="w-5 h-5" /> Partner Administration
        </div>
        <h1 className="font-display text-3xl md:text-5xl mt-3">Support participation without taking ownership away.</h1>
        <p className="text-[#F3E1D8] mt-4 max-w-3xl leading-relaxed">
          Authorized program staff can review assigned participation, verify submitted evidence, recognize milestones,
          and prepare a participant-approved doorway to Beautifully Brokered 365.
        </p>
      </section>

      <div className="grid md:grid-cols-3 gap-4">
        <Door icon={Users} title="Participant caseload"
          body="See only participants assigned to your organization and program. Private journals, health details, Support Circle contacts, and unrelated documents remain excluded."
          to="/staff/caseload" action="Open caseload" />
        <Door icon={ClipboardCheck} title="Journey recognition"
          body="Recognize milestones and manage graduation readiness. Participants cannot self-verify or self-graduate."
          to="/staff/journey" action="Open journey controls" />
        <Door icon={ShieldCheck} title="BBC 365 doorway"
          body="This is a controlled handoff, not a data merge. Nothing transfers and no BBC account is created without the participant's express choice."
          href="https://buildmyblueprintbbc.com" action="View BBC 365" />
      </div>

      <section className="rounded-2xl border border-[#E4CDBF] bg-[#FBF3E9] p-5">
        <h2 className="font-display text-xl text-[#1B1033]">Connection rules</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-700">
          <li>• A Path Forward and BBC 365 remain separate applications.</li>
          <li>• Staff access is organization-, program-, role-, and assignment-scoped.</li>
          <li>• Evidence review never exposes unrelated participant records.</li>
          <li>• A participant must choose whether to open the BBC 365 doorway.</li>
          <li>• No automatic enrollment, payment, data transfer, or account creation occurs here.</li>
        </ul>
      </section>
    </div>
  );
}

function Door({ icon: Icon, title, body, to, href, action }) {
  const className = "rounded-2xl border border-[#E4CDBF] bg-white p-5 shadow-sm flex flex-col";
  const actionClass = "mt-auto pt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#4a2a5a]";
  return (
    <article className={className}>
      <div className="w-11 h-11 rounded-xl bg-[#EED2E0] text-[#4a2a5a] flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <h2 className="font-display text-xl text-[#1B1033] mt-4">{title}</h2>
      <p className="text-sm text-slate-600 mt-2 leading-relaxed">{body}</p>
      {to ? <Link className={actionClass} to={to}>{action}</Link> :
        <a className={actionClass} href={href} target="_blank" rel="noopener noreferrer">{action}<ExternalLink className="w-4 h-4" /></a>}
    </article>
  );
}
