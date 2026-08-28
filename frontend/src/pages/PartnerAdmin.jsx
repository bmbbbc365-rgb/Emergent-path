import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/api";
import { Building2, ClipboardCheck, ExternalLink, History, MailPlus, Settings2, ShieldCheck, Users } from "lucide-react";

const STAFF_ROLES = new Set(["super_admin", "program_admin", "program_staff", "case_manager", "reviewer"]);

export default function PartnerAdmin() {
  const [state, setState] = useState({ loading: true, allowed: false, user: null, participation: null });
  const [adminData, setAdminData] = useState({ programs: [], invitations: [], events: [], loading: false, error: "" });
  const [invite, setInvite] = useState({ program_id: "", email: "", name: "", role: "participant" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get("/auth/me")
      .then(async ({ data }) => {
        const roles = (data.memberships || []).map((item) => item.role);
        const allowed = roles.some((role) => STAFF_ROLES.has(role));
        if (!allowed) {
          setState({ loading: false, allowed: false, user: data, participation: null });
          return;
        }
        try {
          const journey = await api.get("/admin/journey");
          const rows = journey.data.participants || [];
          setState({
            loading: false,
            allowed: true,
            user: data,
            participation: {
              participants: rows.length,
              building: rows.filter((row) => ["enter", "build"].includes(row.stage)).length,
              graduated: rows.filter((row) => row.graduation_approved).length,
              continuing: rows.filter((row) => row.interested_in_continuing === true).length,
            },
          });
          const canAdmin = roles.some((role) => ["super_admin", "program_admin"].includes(role));
          if (canAdmin) {
            setAdminData((current) => ({ ...current, loading: true }));
            const [programs, invitations, events] = await Promise.all([
              api.get("/programs"), api.get("/invitations"), api.get("/audit/events"),
            ]);
            const programRows = programs.data || [];
            setAdminData({ programs: programRows, invitations: invitations.data || [], events: events.data || [], loading: false, error: "" });
            setInvite((current) => ({ ...current, program_id: current.program_id || programRows[0]?.id || "" }));
          }
        } catch {
          setState({ loading: false, allowed: true, user: data, participation: null });
        }
      })
      .catch(() => setState({ loading: false, allowed: false, user: null, participation: null }));
  }, []);

  const roles = (state.user?.memberships || []).map((item) => item.role);
  const canAdmin = roles.some((role) => ["super_admin", "program_admin"].includes(role));

  const createInvitation = async (event) => {
    event.preventDefault();
    setNotice("");
    try {
      const { data } = await api.post("/invitations", invite);
      setAdminData((current) => ({ ...current, invitations: [data.invitation, ...current.invitations] }));
      setInvite((current) => ({ ...current, email: "", name: "" }));
      setNotice(`Invitation created. Share ${data.share_url} with the invited person.`);
    } catch (error) {
      setNotice(error.response?.data?.detail || "The invitation could not be created.");
    }
  };

  const saveProgram = async (program, nextConfig) => {
    setNotice("");
    try {
      const { data } = await api.patch(`/programs/${program.id}/config`, nextConfig);
      setAdminData((current) => ({ ...current, programs: current.programs.map((row) => row.id === data.id ? data : row) }));
      setNotice(`${program.name} settings saved.`);
    } catch (error) {
      setNotice(error.response?.data?.detail || "Program settings could not be saved.");
    }
  };

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

      {state.participation && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Participation summary">
          <Metric label="Assigned participants" value={state.participation.participants} />
          <Metric label="Building" value={state.participation.building} />
          <Metric label="Graduated" value={state.participation.graduated} />
          <Metric label="Interested in BBC" value={state.participation.continuing} />
        </section>
      )}

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

      {canAdmin && (
        <section className="grid lg:grid-cols-2 gap-5" aria-label="Program administration controls">
          <AdminCard icon={MailPlus} title="Create beta access">
            <form className="space-y-3" onSubmit={createInvitation}>
              <Field label="Program">
                <select className="w-full rounded-xl border border-[#D9C5B8] px-3 py-2 bg-white" value={invite.program_id}
                  onChange={(e) => setInvite({ ...invite, program_id: e.target.value })} required>
                  {adminData.programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                </select>
              </Field>
              <Field label="Name"><input className="w-full rounded-xl border border-[#D9C5B8] px-3 py-2" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className="w-full rounded-xl border border-[#D9C5B8] px-3 py-2" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} required /></Field>
              <Field label="Access type">
                <select className="w-full rounded-xl border border-[#D9C5B8] px-3 py-2 bg-white" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value })}>
                  <option value="participant">Participant</option><option value="program_staff">Program staff</option><option value="program_admin">Program administrator</option>
                </select>
              </Field>
              <button disabled={!invite.program_id || adminData.loading} className="rounded-full bg-[#4a2a5a] disabled:opacity-50 text-white px-5 py-2.5 text-sm font-semibold" type="submit">Create invitation</button>
            </form>
          </AdminCard>

          <AdminCard icon={Settings2} title="Program configuration">
            {adminData.programs.map((program) => <ProgramSettings key={program.id} program={program} onSave={saveProgram} />)}
          </AdminCard>

          <AdminCard icon={Users} title="Recent invitations">
            <div className="space-y-2 max-h-72 overflow-auto">
              {adminData.invitations.length === 0 ? <Empty text="No invitations have been created." /> : adminData.invitations.slice(0, 20).map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-[#1B1033]">{row.invited_name || row.invited_email}</div>
                  <div className="text-slate-600">{row.invited_email} · {row.invited_role.replaceAll("_", " ")} · {row.status}</div>
                </div>
              ))}
            </div>
          </AdminCard>

          <AdminCard icon={History} title="Audit history">
            <div className="space-y-2 max-h-72 overflow-auto">
              {adminData.events.length === 0 ? <Empty text="No administrative events are available." /> : adminData.events.slice(0, 30).map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 p-3 text-sm">
                  <div className="font-semibold text-[#1B1033]">{row.action?.replaceAll("_", " ")}</div>
                  <div className="text-slate-600">{row.actor_role?.replaceAll("_", " ") || "system"} · {row.created_at ? new Date(row.created_at).toLocaleString() : "Time unavailable"}</div>
                </div>
              ))}
            </div>
          </AdminCard>
        </section>
      )}

      {notice && <div role="status" className="rounded-xl border border-[#D9C5B8] bg-white px-4 py-3 text-sm text-[#1B1033]">{notice}</div>}

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

function AdminCard({ icon: Icon, title, children }) {
  return <section className="rounded-2xl border border-[#E4CDBF] bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Icon className="w-5 h-5 text-[#8E4E5A]" /><h2 className="font-display text-xl text-[#1B1033]">{title}</h2></div><div className="mt-4">{children}</div></section>;
}

function Field({ label, children }) { return <label className="block text-sm font-medium text-slate-700"><span className="block mb-1">{label}</span>{children}</label>; }
function Empty({ text }) { return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text}</p>; }

function ProgramSettings({ program, onSave }) {
  const current = program.config || {};
  const [expiry, setExpiry] = useState(current.invitation_expiry_days || 14);
  const [types, setTypes] = useState(current.verification_required_types || []);
  const options = ["release_order", "supervision_plan", "identity", "employment", "housing", "benefits", "education", "other"];
  const toggle = (value) => setTypes((rows) => rows.includes(value) ? rows.filter((row) => row !== value) : [...rows, value]);
  return <div className="space-y-3">
    <p className="font-semibold text-[#1B1033]">{program.name}</p>
    <Field label="Invitation expires after (days)"><input type="number" min="1" max="90" className="w-28 rounded-xl border border-[#D9C5B8] px-3 py-2" value={expiry} onChange={(e) => setExpiry(Number(e.target.value))} /></Field>
    <fieldset><legend className="text-sm font-medium text-slate-700 mb-2">Evidence types requiring staff verification</legend><div className="grid grid-cols-2 gap-2">{options.map((value) => <label key={value} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={types.includes(value)} onChange={() => toggle(value)} />{value.replaceAll("_", " ")}</label>)}</div></fieldset>
    <button type="button" onClick={() => onSave(program, { invitation_expiry_days: expiry, verification_required_types: types })} className="rounded-full border border-[#4a2a5a] text-[#4a2a5a] px-4 py-2 text-sm font-semibold">Save settings</button>
  </div>;
}

function Metric({ label, value }) {
  return <div className="rounded-2xl border border-[#E4CDBF] bg-white p-4"><div className="text-xs uppercase tracking-wider text-slate-500">{label}</div><div className="font-display text-3xl text-[#1B1033] mt-1">{value}</div></div>;
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
