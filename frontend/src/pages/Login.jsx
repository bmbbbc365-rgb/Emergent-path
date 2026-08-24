import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Login() {
  const { loginPassword, register } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const initialTab = params.get("tab") === "register" ? "register" : "signin";
  const [tab, setTab] = useState(initialTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (tab === "signin") {
        await loginPassword(email, password);
      } else {
        await register(email, password, name || email.split("@")[0]);
      }
      toast.success("Welcome to your Blueprint");
      nav("/app");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sign-in failed");
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/app";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const useDemo = async () => {
    setBusy(true);
    try {
      await loginPassword("heatherprejean7325@gmail.com", "Blueprint2026!");
      toast.success("Signed in as demo participant");
      nav("/app");
    } catch (err) {
      toast.error("Demo sign-in failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <div className="hidden lg:flex w-1/2 bg-[#1B1033] text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 bmb-hero-grid opacity-30" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-[#B76E79]/20 blur-3xl" />
        <div className="relative">
          <div className="overline text-[#B76E79]">Beautifully Brokered 365</div>
          <div className="font-display text-xl">Build My Blueprint™</div>
        </div>
        <div className="relative">
          <h2 className="font-display text-4xl leading-tight">A calm, private place to organize the road ahead.</h2>
          <p className="mt-4 text-white/70 max-w-md">Requirements, documents, housing, health, benefits, employment, wellness, and support — one Blueprint, built around you.</p>
          <div className="mt-8 grid grid-cols-2 gap-4 max-w-md text-sm">
            {["Education", "Organization", "Accountability", "Opportunity"].map((k) => (
              <div key={k} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">{k}</div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-white/50">Your journey. Your information. You control what is shared.</div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Link to="/" className="text-sm text-slate-500 hover:text-[#1B1033]" data-testid="back-to-landing">← Back</Link>
          <div className="mt-4 mb-6">
            <div className="overline">{tab === "signin" ? "Welcome back" : "Start your Blueprint"}</div>
            <h1 className="font-display text-3xl text-[#1B1033] tracking-tight">
              {tab === "signin" ? "Sign in to continue" : "Create your account"}
            </h1>
          </div>

          <div className="inline-flex rounded-full bg-slate-100 p-1 mb-6 text-sm">
            <button
              onClick={() => setTab("signin")}
              data-testid="tab-signin"
              className={`px-4 py-1.5 rounded-full transition ${tab === "signin" ? "bg-white shadow text-[#1B1033]" : "text-slate-500"}`}
            >Sign in</button>
            <button
              onClick={() => setTab("register")}
              data-testid="tab-register"
              className={`px-4 py-1.5 rounded-full transition ${tab === "register" ? "bg-white shadow text-[#1B1033]" : "text-slate-500"}`}
            >Create account</button>
          </div>

          <form onSubmit={submit} className="space-y-4 bmb-card p-6">
            {tab === "register" && (
              <div>
                <Label htmlFor="name">Your name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" data-testid="input-name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" data-testid="input-email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" data-testid="input-password" />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white h-11" data-testid="submit-auth-btn">
              {busy ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
            </Button>

            <div className="flex items-center gap-3 my-2">
              <div className="h-px flex-1 bg-slate-200" /><div className="text-xs text-slate-400">or</div><div className="h-px flex-1 bg-slate-200" />
            </div>

            <button
              type="button"
              onClick={googleSignIn}
              className="w-full h-11 rounded-full border border-slate-300 hover:border-[#1B1033] text-[#1B1033] font-medium flex items-center justify-center gap-2 bg-white"
              data-testid="google-signin-btn"
            >
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32 29.4 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.6 6.7 29 5 24 5 13.5 5 5 13.5 5 24s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c2.8 0 5.4 1 7.4 2.8l5.7-5.7C33.6 6.7 29 5 24 5 16.3 5 9.7 9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43c5 0 9.5-1.9 12.9-5l-6-4.9C29 34.5 26.6 35 24 35c-5.4 0-9.9-3-11.3-7.1l-6.5 5C9.5 39 16.3 43 24 43z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6 4.9C40.9 34.6 44 29.7 44 24c0-1.3-.1-2.3-.4-3.5z"/></svg>
              Continue with Google
            </button>

            <button type="button" onClick={useDemo} disabled={busy} className="w-full text-xs text-slate-500 hover:text-[#1B1033] mt-2" data-testid="use-demo-btn">
              Or try the demo participant account →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
