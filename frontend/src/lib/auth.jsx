import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { setToken } from "@/lib/api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // If returning from OAuth callback, AuthCallback will handle it.
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    refresh();
  }, [refresh]);

  const loginPassword = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.session_token);
    await refresh();
  };
  const register = async (email, password, name) => {
    const { data } = await api.post("/auth/register", { email, password, name });
    setToken(data.session_token);
    await refresh();
  };
  const consumeGoogleSession = async (sessionId) => {
    const { data } = await api.post("/auth/google-session", { session_id: sessionId });
    setToken(data.session_token);
    await refresh();
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, refresh, loginPassword, register, consumeGoogleSession, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
