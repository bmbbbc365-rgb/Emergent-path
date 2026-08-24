import React from "react";
import { GenericHub } from "@/pages/subsections/HealthHub";
import { HandCoins, FileText, Phone, ClipboardList } from "lucide-react";

const KINDS = [
  { v: "benefit", l: "Active benefit", icon: HandCoins },
  { v: "application", l: "Application", icon: ClipboardList },
  { v: "document", l: "Benefit document", icon: FileText },
  { v: "contact", l: "Important contact", icon: Phone },
];

export default function BenefitsHub() {
  return (
    <GenericHub
      hub="benefits"
      eyebrow="Benefits & applications"
      title="Benefits Hub"
      kinds={KINDS}
      description="Education and navigation only. Bridge does not guarantee eligibility."
    />
  );
}
