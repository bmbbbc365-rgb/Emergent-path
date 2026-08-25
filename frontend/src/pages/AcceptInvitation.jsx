import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AcceptInvitation() {
  const { code } = useParams();
  const nav = useNavigate();
  const [inv, setInv] = useState(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API}/invitations/verify/${code}`);
        if (!r.ok) { setError("This invitation is invalid or has already been used."); return; }
        setInv(await r.json());
      } catch { setError("Could not verify invitation"); }
    })();
  }, [code]);

  const accept = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const r = await fetch(`${API}/invitations/accept`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || "Could not accept invitation");
      localStorage.setItem("bmb_session_token", j.session_token);
      toast.success("Welcome to Build My Blueprint");
      if (j.role === "participant") nav("/app");
      else nav("/staff/caseload");
    } catch (e) {
      setError(e.message);
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBF7F2] p-6">
      <div className="bmb-card max-w-md w-full p-6" data-testid="accept-invitation">
        <div className="overline">You're invited</div>
        {error && <div className="text-sm text-rose-600 mt-2">{error}</div>}
        {inv && (
          <>
            <h1 className="font-display text-2xl text-[#1B1033] mt-1">Join {inv.program_name}</h1>
            <p className="text-sm text-slate-500 mt-1">{inv.org_name}</p>
            <p className="text-sm text-slate-600 mt-3">Invited email: <strong>{inv.invited_email}</strong> · role: {inv.invited_role.replace("_", " ")}</p>
            <form onSubmit={accept} className="mt-4 space-y-3">
              <div><Label>Your name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required data-testid="accept-name" /></div>
              <div><Label>Choose a password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required data-testid="accept-password" /></div>
              <Button type="submit" disabled={busy} className="w-full bg-[#1B1033] text-white" data-testid="accept-submit">
                {busy ? "Setting up…" : "Accept & get started"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
