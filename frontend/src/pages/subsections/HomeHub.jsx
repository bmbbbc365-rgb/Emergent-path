import React from "react";
import { GenericHub } from "@/pages/subsections/HealthHub";
import { House, Wrench, Zap, ShieldAlert, Phone } from "lucide-react";

const KINDS = [
  { v: "housing", l: "Housing", icon: House },
  { v: "utility", l: "Utility / service", icon: Zap },
  { v: "maintenance", l: "Maintenance", icon: Wrench },
  { v: "safety", l: "Safety", icon: ShieldAlert },
  { v: "contact", l: "Household contact", icon: Phone },
];

export default function HomeHub() {
  return (
    <GenericHub
      hub="home"
      eyebrow="Home & getting established"
      title="Home Hub"
      kinds={KINDS}
      description="Track housing stability, utilities, safety, and household reminders."
    />
  );
}
