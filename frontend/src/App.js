import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "@/App.css";
import { AuthProvider, useAuth } from "@/lib/auth";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import BlueprintSection from "@/pages/BlueprintSection";
import Library, { CourseDetail } from "@/pages/Library";
import Privacy from "@/pages/Privacy";
import Layout from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import Requirements from "@/pages/deep/Requirements";
import HealthHubDeep from "@/pages/deep/HealthHubDeep";
import BenefitsHubDeep from "@/pages/deep/BenefitsHubDeep";
import HomeHubDeep from "@/pages/deep/HomeHubDeep";
import EmploymentRecordDeep from "@/pages/deep/EmploymentRecordDeep";
import IdentityDeep from "@/pages/deep/IdentityDeep";
import DocumentScan from "@/pages/DocumentScan";
import DocumentDetail from "@/pages/DocumentDetail";
import { StaffCaseload, StaffParticipantDetail } from "@/pages/Staff";
import AcceptInvitation from "@/pages/AcceptInvitation";
import Onboarding from "@/pages/Onboarding";
import LivingBlueprint from "@/pages/LivingBlueprint";
import EmergencySettings from "@/pages/EmergencySettings";
import PublicEmergency from "@/pages/PublicEmergency";
import TransportationDeep from "@/pages/deep/TransportationDeep";

const DEEP = {
  "requirements": Requirements,
  "health-hub": HealthHubDeep,
  "benefits-hub": BenefitsHubDeep,
  "home-hub": HomeHubDeep,
  "employment-record": EmploymentRecordDeep,
  "identity": IdentityDeep,
};

function DeepOrGeneric() {
  const key = window.location.pathname.split("/").pop();
  const Deep = DEEP[key];
  return Deep ? <Deep /> : <BlueprintSection />;
}

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#FBF7F2] text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/onboarding/:code" element={<AcceptInvitation />} />
      <Route path="/e/:slug" element={<PublicEmergency />} />
      <Route path="/app/onboarding" element={<Protected><Onboarding /></Protected>} />
      <Route path="/app/blueprint" element={<Protected><LivingBlueprint /></Protected>} />
      <Route path="/app/emergency" element={<Protected><EmergencySettings /></Protected>} />
      <Route path="/app/transportation" element={<Protected><TransportationDeep /></Protected>} />
      <Route path="/staff/caseload" element={<Protected><StaffCaseload /></Protected>} />
      <Route path="/staff/participants/:enrollmentId" element={<Protected><StaffParticipantDetail /></Protected>} />
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/app/documents/scan" element={<Protected><DocumentScan /></Protected>} />
      <Route path="/app/documents/:id" element={<Protected><DocumentDetail /></Protected>} />
      <Route path="/app/section/:key" element={<Protected><DeepOrGeneric /></Protected>} />
      <Route path="/app/library" element={<Protected><Library /></Protected>} />
      <Route path="/app/library/:courseId" element={<Protected><CourseDetail /></Protected>} />
      <Route path="/app/privacy" element={<Protected><Privacy /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
