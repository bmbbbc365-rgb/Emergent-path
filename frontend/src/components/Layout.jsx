import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { SECTIONS } from "@/lib/sections";
import { LayoutDashboard, Menu, LogOut, Shield, Bot, Library, Lock, X } from "lucide-react";
import BridgeChat from "@/components/BridgeChat";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function NavItem({ to, icon: Icon, label, testId }) {
  return (
    <NavLink
      to={to}
      end
      data-testid={testId}
      className={({ isActive }) =>
        `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
          isActive ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [bridgeOpen, setBridgeOpen] = useState(false);

  const doLogout = async () => { await logout(); nav("/"); };

  const Sidebar = (
    <aside className="w-72 bg-[#1B1033] text-white flex flex-col h-full">
      <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <div className="overline text-[#B76E79]">Build My Blueprint™</div>
          <div className="font-display text-lg leading-tight">Re-Entry Blueprint</div>
        </div>
        <button
          className="lg:hidden text-white/70 hover:text-white"
          onClick={() => setMobileOpen(false)}
          data-testid="sidebar-close-btn"
        ><X className="w-5 h-5" /></button>
      </div>

      <nav className="flex-1 overflow-y-auto thin-scroll px-3 py-4 space-y-1">
        <NavItem to="/app" icon={LayoutDashboard} label="My Blueprint" testId="nav-dashboard" />
        {SECTIONS.map((s) => (
          <NavItem key={s.key} to={`/app/section/${s.key}`} icon={s.icon} label={s.label} testId={`nav-${s.key}`} />
        ))}
        <div className="pt-3 mt-3 border-t border-white/10 space-y-1">
          <NavItem to="/app/library" icon={Library} label="Learn & Resources" testId="nav-library" />
          <NavItem to="/app/privacy" icon={Lock} label="Privacy & Sharing" testId="nav-privacy" />
        </div>
      </nav>

      <div className="px-3 py-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-white/5">
          <Avatar className="w-9 h-9 border border-white/20">
            {user?.picture && <AvatarImage src={user.picture} alt={user.name} />}
            <AvatarFallback className="bg-[#B76E79] text-[#1B1033] font-semibold">
              {(user?.name || "P").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate">{user?.name || "Participant"}</div>
            <div className="text-[11px] text-white/50 truncate">{user?.email}</div>
          </div>
          <button
            className="text-white/60 hover:text-white p-1.5"
            onClick={doLogout}
            data-testid="logout-btn"
            title="Sign out"
          ><LogOut className="w-4 h-4" /></button>
        </div>
        <div className="mt-2 text-[10px] text-white/40 px-2 flex items-center gap-1.5">
          <Shield className="w-3 h-3" /> Your journey. Your information. You control sharing.
        </div>
        {user?.is_owner && (
          <div className="mt-2 mx-2 rounded-md bg-[#D4AF37]/12 border border-[#D4AF37]/30 px-2 py-1.5 text-[10px] uppercase tracking-widest text-[#E8C7A0] flex items-center gap-1.5" data-testid="demo-badge">
            <Shield className="w-3 h-3" /> Sample / demo data
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      <div className="hidden lg:block">{Sidebar}</div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72">{Sidebar}</div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="backdrop-blur-xl bg-white/80 border-b border-slate-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 md:px-6 py-3">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 -ml-2 rounded-md hover:bg-slate-100"
                onClick={() => setMobileOpen(true)}
                data-testid="sidebar-open-btn"
              ><Menu className="w-5 h-5" /></button>
              <div>
                <div className="overline">A Path Forward</div>
                <div className="font-display text-lg leading-tight text-[#1B1033]">Welcome, {user?.name?.split(" ")[0] || "Participant"}</div>
              </div>
            </div>
            <Button
              onClick={() => setBridgeOpen(true)}
              className="rounded-full bg-[#1B1033] hover:bg-[#2A1848] text-white gap-2"
              data-testid="open-bridge-btn"
            ><Bot className="w-4 h-4" /> Ask Bridge</Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-8 py-6 md:py-8" data-testid="main-content">
          {children}
        </main>
      </div>

      <BridgeChat open={bridgeOpen} onClose={() => setBridgeOpen(false)} />
    </div>
  );
}
