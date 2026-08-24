import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";

export default function AuthCallback() {
  const { consumeGoogleSession } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = location.hash || "";
    const match = hash.match(/session_id=([^&]+)/);
    if (!match) { nav("/login", { replace: true }); return; }
    const sid = decodeURIComponent(match[1]);
    (async () => {
      try {
        await consumeGoogleSession(sid);
        window.history.replaceState({}, "", "/app");
        nav("/app", { replace: true });
      } catch {
        nav("/login", { replace: true });
      }
    })();
  }, [location, consumeGoogleSession, nav]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-slate-500 text-sm">Finishing sign-in…</div>
    </div>
  );
}
