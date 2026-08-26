/**
 * Public Demo — Jordan Carter (FICTIONAL PARTICIPANT).
 * Everything on this page is invented for Builder Fest demonstration purposes.
 * No real participant data is ever exposed here.
 */

export const DEMO_PARTICIPANT = {
  name: "Jordan Carter",
  first_name: "Jordan",
  location: "Rural Arkansas",
  situation: "Returning home 5 weeks ago",
  age_range: "30s",
  transportation: "No personal vehicle; rides + rural transit",
  housing: "Staying with sister — stable for ~60 days",
  tech: "Smartphone (Android); limited desktop experience",
  goal_workforce: "Warehouse or manufacturing role within 60 days",
  goal_financial: "Establish stable income + open a bank account",
  pathway_id: "APF-DEMO-JC",
};

export const DEMO_BLUEPRINT = {
  immediate_priorities: [
    { key: "id",           label: "Replace state ID",                why: "Every job, apartment lease, and benefit application asks for it first.", status: "in_progress", eta: "This week" },
    { key: "transport",    label: "Reliable transportation plan",    why: "You've been missing appointments because rides fall through.",           status: "in_progress", eta: "Next 2 weeks" },
    { key: "resume",       label: "Finish your resume",              why: "You have real work history — it just isn't written down yet.",           status: "in_progress", eta: "3 days" },
    { key: "workforce_ed", label: "Complete workforce readiness",    why: "Employers you want (warehouse/manufacturing) look for OSHA-10 basics.",   status: "completed",   eta: "Done" },
    { key: "apply",        label: "Start employment applications",   why: "Two workforce center partners are actively hiring in your county.",        status: "not_started", eta: "After ID" },
  ],
  strengths: [
    "Sister's housing is stable through at least mid-summer",
    "Prior warehouse experience (2 years, pre-incarceration)",
    "Sober 11 months and connected to a weekly peer group",
    "Owns a working smartphone with data",
    "Birth certificate is on file",
  ],
  barriers: [
    { key: "id",         label: "No current state ID",             severity: "high"   },
    { key: "transport",  label: "No personal vehicle",             severity: "high"   },
    { key: "digital",    label: "Limited computer confidence",     severity: "medium" },
    { key: "money",      label: "No bank account yet",             severity: "medium" },
    { key: "network",    label: "Small local employer network",    severity: "low"    },
  ],
  progress_pct: 42,
};

export const DEMO_VAULT = [
  { id: "d1", title: "Release documentation",       category: "Release",        status: "received",         updated: "5 weeks ago",  ai_note: "Recognized as Arkansas ADC release paperwork · linked to Requirements tracker" },
  { id: "d2", title: "Birth certificate",           category: "Identification", status: "available",        updated: "3 weeks ago",  ai_note: "Recognized as certified vital record · satisfies Identity Documentation" },
  { id: "d3", title: "State ID",                    category: "Identification", status: "replacement_needed", updated: "—",           ai_note: "Missing · required by 4 downstream Blueprint items" },
  { id: "d4", title: "Social Security card",        category: "Identification", status: "available",        updated: "2 weeks ago",  ai_note: "Recognized · used to link to workforce services" },
  { id: "d5", title: "Resume (draft)",              category: "Employment",     status: "draft",            updated: "yesterday",    ai_note: "One page · missing dates on prior warehouse role" },
  { id: "d6", title: "Workforce readiness certificate", category: "Education",  status: "completed",        updated: "4 days ago",   ai_note: "OSHA-10 + workplace basics · earned in-app" },
];

export const DEMO_ACTIONS = [
  { id: "a1", title: "Book DMV appointment for replacement ID", why: "Fastest path to unblock housing, employment, and benefits applications.", route: "/demo/blueprint", status: "in_progress", priority: 5 },
  { id: "a2", title: "Add employment history dates to resume",   why: "Employers reject resumes with unclear timelines — 5 minutes of work.",     route: "/demo/learn", status: "in_progress", priority: 5 },
  { id: "a3", title: "Message rural transit voucher program",    why: "Free rides for job interviews if you sign up before Friday.",              route: "/demo/resources", status: "not_started", priority: 4 },
  { id: "a4", title: "Watch: Workplace expectations basics",     why: "Unlocks the Employment Readiness track and prepares for real interviews.", route: "/demo/learn", status: "completed", priority: 3 },
  { id: "a5", title: "Open a second-chance bank account",        why: "Direct deposit is required by 3 of your target employers.",                route: "/demo/resources", status: "not_started", priority: 4 },
];

export const DEMO_LEARN_PATHWAY = {
  title: "Workforce Readiness",
  progress_pct: 65,
  learn: {
    title: "Workplace expectations & OSHA-10 basics",
    minutes: 32,
    status: "completed",
    summary: "Attendance, communication, safety reporting, and what your first 90 days look like.",
  },
  do: {
    title: "Rebuild Jordan's resume",
    status: "in_progress",
    summary: "Use the resume tool to add dates to prior warehouse experience and export a clean PDF.",
  },
  track: {
    completed: ["Workplace expectations lesson", "Safety basics quiz (passed)", "Resume draft uploaded"],
    remaining: ["Add dates to resume", "One practice interview", "Apply to 2 warehouse roles"],
  },
  help: [
    { label: "Arkansas Workforce Centers (in-person)", route: "/demo/resources" },
    { label: "CareerOneStop — Fair-chance job search", route: "/demo/resources" },
    { label: "Ask Bridge AI for interview prep",       route: "/demo/bridge" },
  ],
};

/** Barrier → mapped resources. Uses realistic government + Arkansas sources. */
export const DEMO_RESOURCE_MAP = {
  id: {
    label: "No current state ID",
    resources: [
      { title: "Arkansas Department of Finance — Driver Services", body: "Official state ID replacement. Cost is waived under certain reentry programs.", source: "State of Arkansas" },
      { title: "Legal Aid of Arkansas — vital records support",     body: "Free help getting the underlying documents (SSN, birth cert) required for an ID.", source: "Legal Aid of Arkansas" },
    ],
  },
  transport: {
    label: "No personal vehicle",
    resources: [
      { title: "Arkansas rural transit voucher pilot",             body: "Free ride credits for medical, DMV, and interview trips in your county.", source: "Arkansas DHS partner" },
      { title: "Central Arkansas Development Council",             body: "Ride-to-work programs and driver-license-reinstatement clinics.",         source: "CADC" },
      { title: "United Way 211 — local transportation directory",  body: "One call surfaces the specific rides available today in your zip code.", source: "United Way of Arkansas" },
    ],
  },
  employment: {
    label: "Ready to work — need the right door",
    resources: [
      { title: "Arkansas Workforce Centers (in-person)",           body: "Resume help, training vouchers, and direct placement into warehouse and manufacturing roles.", source: "Arkansas DWS" },
      { title: "Arkansas JobLink — statewide job search",          body: "State-run job board with reentry-friendly employers flagged.",           source: "Arkansas DWS" },
      { title: "CareerOneStop — Fair-chance job resources",        body: "Federal fair-chance job boards, expungement basics, and bonding programs.", source: "U.S. DOL" },
    ],
  },
  money: {
    label: "No bank account yet",
    resources: [
      { title: "FDIC Money Smart — free financial education",      body: "Multi-module course on banking, budgeting, credit, and consumer protection.", source: "FDIC" },
      { title: "Second-chance checking accounts — local banks",    body: "Two Arkansas credit unions accept applicants without ChexSystems clearance.", source: "In-app curated list" },
    ],
  },
  digital: {
    label: "Limited computer confidence",
    resources: [
      { title: "DigitalLearn.org — free digital literacy",         body: "Plain-language public-library classes: email, uploads, video calls, jobs.", source: "Public Library Association" },
      { title: "A Path Forward — Digital Life Readiness (in-app)", body: "12 in-app doorways with videos and copy-paste templates.",                  source: "A Path Forward" },
    ],
  },
};

export const DEMO_PROGRESS = {
  starting_point: [
    "5 priority barriers identified",
    "2 important documents missing (ID + resume)",
    "No completed resume",
    "Employment pathway not started",
    "No workforce credential",
  ],
  current: [
    "2 barriers resolved (birth certificate secured, workforce readiness complete)",
    "3 documents secured (release papers, birth certificate, SSN card)",
    "Resume drafted — dates pending",
    "Workforce education completed (OSHA-10 basics)",
    "Employment applications: preparation phase",
  ],
  next: [
    "Book DMV appointment for replacement state ID",
    "Add dates to resume and export final PDF",
    "Enroll in rural transit voucher program",
    "Apply to 2 warehouse roles this week",
  ],
};

/**
 * Bridge AI demo responses — scripted contextual guidance keyed off the
 * fictional participant's real Blueprint/Vault/progress. This is NOT the
 * production LLM. It demonstrates the *pattern* of contextual answers.
 */
export const DEMO_BRIDGE_SUGGESTIONS = [
  "What should I do next?",
  "Which documents am I missing?",
  "How can I find transportation?",
  "What do I need before applying for jobs?",
  "Show me my progress.",
  "Why is getting my ID a priority?",
];

export function demoBridgeAnswer(question) {
  const q = (question || "").toLowerCase();
  if (/next|first|start/.test(q)) {
    return {
      text: "Your highest-leverage next step is **booking a DMV appointment for your replacement state ID**. Without it, four downstream Blueprint items are blocked: leasing, hiring paperwork, direct deposit, and the transit voucher program.",
      actions: [
        { label: "Open the Blueprint",          route: "/demo/blueprint" },
        { label: "See mapped ID resources",     route: "/demo/resources" },
      ],
    };
  }
  if (/document|vault|missing|paper/.test(q)) {
    return {
      text: "Looking at your Vault: **birth certificate ✓, SSN card ✓, release papers ✓, workforce cert ✓, resume draft ✓**. What's outstanding: **state ID (replacement needed)** and **finalized resume with dates**. Everything else is on file.",
      actions: [
        { label: "Open my Vault",               route: "/demo/vault" },
        { label: "Fix the resume dates",        route: "/demo/learn" },
      ],
    };
  }
  if (/transport|ride|bus|drive|car/.test(q)) {
    return {
      text: "You've got three options mapped to your county: the **Arkansas rural transit voucher pilot** (free ride credits for DMV, medical, and interviews), the **CADC ride-to-work** program, and **United Way 211** which surfaces same-day rides.",
      actions: [
        { label: "Show transportation resources", route: "/demo/resources" },
      ],
    };
  }
  if (/apply|job|employ|work|resume/.test(q)) {
    return {
      text: "Before applications, you need three things in order: (1) **replacement state ID** — blocked, in progress; (2) **resume with dates** — draft ready in the Vault; (3) **workforce readiness certificate** — ✓ completed. Once (1) and (2) close, we open the Arkansas Workforce Centers referral.",
      actions: [
        { label: "Continue Workforce Readiness", route: "/demo/learn" },
        { label: "Employment resources",         route: "/demo/resources" },
      ],
    };
  }
  if (/progress|how am i doing|far|status/.test(q)) {
    return {
      text: "You're at **~42%** of your current Blueprint. You've resolved 2 of 5 barriers, completed workforce readiness, and secured 3 of the 5 core documents. Next unblock: the DMV appointment. That single action moves you to roughly 60%.",
      actions: [
        { label: "See progress",                route: "/demo/progress" },
      ],
    };
  }
  if (/id|driver.*license|state.*id/.test(q)) {
    return {
      text: "State ID sits under **four** Blueprint items — housing, employment paperwork, direct-deposit bank account, and the transit voucher program. That's why it's the #1 priority even though it isn't the most 'urgent' feeling task.",
      actions: [
        { label: "Open the ID resources",       route: "/demo/resources" },
      ],
    };
  }
  return {
    text: "In the full app I answer with your live Blueprint, Vault, and progress in context. In this demo I respond from Jordan Carter's sample plan — try one of the suggested questions above.",
    actions: [{ label: "See what I know about Jordan", route: "/demo/blueprint" }],
  };
}
