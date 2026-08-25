// Content-driven doorway map. Each entry is rendered by <Doorway /> using
// the shared <HubLDTG /> shell — no dead-end pages. Every "do" item routes to
// a real destination, an internal tool, or Bridge AI.

// Color families per category (used by <Doorway /> for the accent).
export const ACCENT = {
  identity: "#B76E79",         // rose-gold
  documents: "#B76E79",
  housing: "#5B1A3A",           // plum
  health: "#7A8C6F",            // sage
  employment: "#2E5266",        // dark teal
  benefits: "#B5851F",          // amber
  wellness: "#B85A4B",          // terracotta
  support: "#6B4C7C",           // deep lavender
  compliance: "#1B1033",        // deep navy
  life: "#3E5641",              // forest
};

export const DOORWAYS = {
  // ============ RECOVERY & WELLNESS ============
  "recovery-wellness": {
    section: "wellness", eyebrow: "Recovery & Wellness", title: "A calm place to build steady habits",
    lead: "Education and organization — not treatment. If you are in crisis, call or text 988. For emergencies, call 911.",
    learn: [
      { title: "What 'wellness' means here", description: "Small daily practices that make everything else easier — sleep, movement, food, connection." },
      { title: "When to reach a professional", description: "Ongoing depression, thoughts of self-harm, urges that put you at risk — those are for a clinician, not a checklist." },
    ],
    doActions: [
      { label: "Habit change", route: "/app/doorway/wellness-habits" },
      { label: "Personal journal", route: "/app/doorway/wellness-journal" },
      { label: "Triggers & coping", route: "/app/doorway/wellness-triggers" },
      { label: "Stress tools", route: "/app/doorway/wellness-stress" },
    ],
    track: [
      { label: "Habits", value: "Manage →", route: "/app/doorway/wellness-habits" },
      { label: "Journal", value: "Open →", route: "/app/doorway/wellness-journal" },
      { label: "Support Circle", value: "Open →", route: "/app/section/support-circle" },
    ],
    help: [
      { label: "988 Suicide & Crisis Lifeline", phone: "988", hint: "Call or text" },
      { label: "SAMHSA National Helpline", phone: "1-800-662-4357", hint: "Free, 24/7" },
      { label: "Ask Bridge AI", route: "/app?bridge=1", hint: "About wellness resources" },
    ],
  },
  "wellness-habits": {
    section: "wellness", eyebrow: "Habit change", title: "Small daily practices",
    lead: "Habits are not willpower — they are cues, routines, and rewards. Change one, keep it small, keep it steady.",
    learn: [
      { title: "The habit loop", description: "Cue → routine → reward. Change the routine, keep the cue and reward." },
      { title: "Replacement, not removal", description: "Substituting a better habit for the old routine is easier than deleting it." },
      { title: "The 21-day rhythm", description: "Two weeks builds the pattern. A month makes it default." },
    ],
    doActions: [
      { label: "Add a habit to track", route: "/app/section/wellness" },
      { label: "Log today's check-in", route: "/app/section/wellness" },
    ],
    track: [
      { label: "Habits", value: "Manage →", route: "/app/section/wellness" },
      { label: "Last 7 days", value: "See →", route: "/app/section/wellness" },
    ],
    help: [
      { label: "Ask Bridge AI to design a starter habit", route: "/app?bridge=habits" },
    ],
  },
  "wellness-journal": {
    section: "wellness", eyebrow: "Personal journal", title: "Private space to think",
    lead: "Your journal is private to you. Staff cannot see the content. Writing for even five minutes lowers stress and improves decisions.",
    learn: [
      { title: "Why journaling helps", description: "Naming what happened lowers the intensity of the feeling." },
      { title: "Prompts if you're stuck", description: "One thing that went well · one thing that was hard · one thing I need tomorrow." },
    ],
    doActions: [
      { label: "Write today's entry", route: "/app/journal" },
      { label: "Speak an entry (voice)", route: "/app/journal" },
    ],
    track: [
      { label: "Journal entries", value: "Open →", route: "/app/journal" },
    ],
    help: [{ label: "Ask Bridge AI for a prompt", route: "/app?bridge=journal-prompt" }],
  },
  "wellness-triggers": {
    section: "wellness", eyebrow: "Triggers & coping", title: "Know what sets you off — plan for it",
    lead: "A trigger is a cue. An urge is a response. A coping plan is what you do instead. Naming them makes them smaller.",
    learn: [
      { title: "Trigger → urge → coping", description: "The pause between urge and action is where change happens." },
      { title: "Types of triggers", description: "People, places, times of day, feelings, situations." },
    ],
    doActions: [
      { label: "Add a trigger", route: "/app/section/wellness" },
      { label: "Write a coping plan", route: "/app/section/wellness" },
      { label: "Log an urge", route: "/app/section/wellness" },
    ],
    track: [
      { label: "Top triggers", value: "See →", route: "/app/section/wellness" },
      { label: "Urges logged", value: "See →", route: "/app/section/wellness" },
    ],
    help: [
      { label: "Support Circle", route: "/app/section/support-circle" },
      { label: "988 Crisis line", phone: "988" },
    ],
  },
  "wellness-stress": {
    section: "wellness", eyebrow: "Stress", title: "Breathe. Ground. Reset.",
    lead: "Stress isn't a weakness — it's a body response. These are two exercises that lower it in under two minutes.",
    learn: [
      { title: "Why your body reacts first", description: "Fight-or-flight fires before you can think. Slowing the exhale slows the body." },
      { title: "4-7-8 breathing", description: "Breathe in 4 seconds · hold 7 · out 8. Repeat 4 times." },
      { title: "5-4-3-2-1 grounding", description: "Name 5 things you see · 4 you touch · 3 you hear · 2 you smell · 1 you taste." },
    ],
    doActions: [
      { label: "4-7-8 breathing timer", route: "/app/section/wellness" },
      { label: "5-4-3-2-1 grounding", route: "/app/section/wellness" },
    ],
    track: [
      { label: "Stress trend (7d)", value: "See →", route: "/app/section/wellness" },
    ],
    help: [{ label: "Ask Bridge AI what helps", route: "/app?bridge=stress" }],
  },

  // ============ INDEPENDENT LIVING ============
  "living-housing": {
    section: "home-hub", eyebrow: "Housing", title: "Rental readiness — one step at a time",
    lead: "Even temporary safety unlocks everything else. This walks you through what landlords want and how to prepare.",
    learn: [
      { title: "Rental readiness basics", description: "ID · income proof · references · deposit · first month's rent." },
      { title: "Common barriers after incarceration", description: "Background · credit · gap in employment — and how to talk about them." },
      { title: "Understanding leases", description: "Term · rent · deposits · maintenance · what breaks the lease." },
      { title: "Deposits and utilities", description: "First-month + security + utility deposits can total 2-4x rent — plan for it." },
    ],
    doActions: [
      { label: "Housing readiness checklist", route: "/app/section/home-hub" },
      { label: "Gather required documents", route: "/app/section/documents" },
      { label: "Landlord question list", route: "/app/section/home-hub" },
    ],
    track: [
      { label: "Housing status", value: "Open →", route: "/app/section/home-hub" },
      { label: "Applications", value: "See →", route: "/app/section/home-hub" },
    ],
    help: [
      { label: "HUD housing counselors", hint: "1-800-569-4287" },
      { label: "211 community line", phone: "211" },
      { label: "Ask Bridge AI about my housing", route: "/app?bridge=housing" },
    ],
  },
  "living-budgeting": {
    section: "independent-living", eyebrow: "Budgeting", title: "Simple money plan",
    lead: "Not a lecture on money — a monthly plan you can actually keep. Start with what comes in and what has to go out.",
    learn: [
      { title: "50 / 30 / 20 — realistic version", description: "50% needs (rent + food + phone) · 30% obligations (fees, restitution, transport) · 20% future (any amount is progress)." },
      { title: "The pay-yourself-first idea", description: "Even $10 saved before spending anything else builds momentum." },
    ],
    doActions: [
      { label: "Add monthly income", route: "/app/section/independent-living" },
      { label: "Add monthly expense", route: "/app/section/independent-living" },
      { label: "Open Bank Setup", route: "/app/doorway/documents-bank-setup" },
    ],
    track: [
      { label: "Income logged", value: "Open →", route: "/app/section/independent-living" },
      { label: "Expenses logged", value: "Open →", route: "/app/section/independent-living" },
    ],
    help: [{ label: "Ask Bridge AI about a plan", route: "/app?bridge=budget" }],
  },
  "living-utilities": {
    section: "independent-living", eyebrow: "Utilities", title: "Getting the lights on",
    lead: "Utilities usually require a deposit if you don't have credit or a co-signer. LIHEAP and other programs can help.",
    learn: [
      { title: "What you'll need", description: "State ID · SSN · lease or proof of address · a phone number they can reach." },
      { title: "Deposits", description: "$100–$300 per utility is common. Ask about deposit waiver programs." },
      { title: "LIHEAP", description: "A federal program that helps low-income households pay heating/cooling bills." },
    ],
    doActions: [
      { label: "Add a utility account", route: "/app/section/home-hub" },
      { label: "Call script — set up service", route: "/app/section/home-hub" },
    ],
    track: [
      { label: "Utilities on file", value: "Open →", route: "/app/section/home-hub" },
    ],
    help: [
      { label: "LIHEAP finder", hint: "energyhelp.us" },
      { label: "211", phone: "211" },
      { label: "Ask Bridge AI", route: "/app?bridge=utilities" },
    ],
  },
  "living-banking": {
    section: "independent-living", eyebrow: "Banking", title: "Second-chance banking",
    lead: "Even if you were closed by a bank before, second-chance accounts exist and rebuild your record.",
    learn: [
      { title: "Second-chance checking", description: "Accounts designed for people with prior ChexSystems issues." },
      { title: "ChexSystems in one paragraph", description: "The 'credit report' banks use to decide whether to open an account. Bad marks fall off after 5 years." },
      { title: "Credit vs debit", description: "Debit spends your money now · credit borrows it. Rebuild credit slowly with a secured card." },
    ],
    doActions: [
      { label: "Bank Account Setup checklist", route: "/app/doorway/documents-bank-setup" },
      { label: "Upload account-opening letter", route: "/app/documents/scan" },
    ],
    track: [
      { label: "Banks on file", value: "Open →", route: "/app/section/independent-living" },
    ],
    help: [
      { label: "FDIC Money Smart", hint: "fdic.gov/moneysmart" },
      { label: "Ask Bridge AI which bank to try", route: "/app?bridge=banking" },
    ],
  },
  "living-community": {
    section: "independent-living", eyebrow: "Community resources", title: "Local help, close to you",
    lead: "211 connects you to food, clothing, shelter, and reentry-specific programs by ZIP code.",
    learn: [
      { title: "What 211 covers", description: "Food banks, clothing, utility help, shelter, addiction resources, veteran services." },
      { title: "Workforce centers", description: "State-run job centers that help with resumes, interviews, and training vouchers." },
    ],
    doActions: [
      { label: "Save a resource you use", route: "/app/section/support-circle" },
    ],
    track: [
      { label: "My saved resources", value: "Open →", route: "/app/section/support-circle" },
    ],
    help: [
      { label: "Call 211", phone: "211" },
      { label: "Ask Bridge AI for local help", route: "/app?bridge=211" },
    ],
  },
  "living-food": {
    section: "independent-living", eyebrow: "Food & groceries", title: "Food you can count on",
    lead: "SNAP, WIC, and food pantries can bridge the gap. Getting them started right after release matters.",
    learn: [
      { title: "SNAP basics", description: "Federal food benefits. Income-based. Most states honor a felony record for SNAP — check yours." },
      { title: "WIC", description: "For pregnant people, new parents, and children under 5." },
      { title: "Food pantries", description: "Free groceries with no application. 211 lists them by ZIP." },
    ],
    doActions: [
      { label: "Apply for SNAP checklist", route: "/app/section/benefits-hub" },
      { label: "Find nearby pantries via 211", route: "/app/doorway/living-community" },
    ],
    track: [
      { label: "Benefits status", value: "Open →", route: "/app/section/benefits-hub" },
    ],
    help: [{ label: "Ask Bridge AI about SNAP", route: "/app?bridge=snap" }],
  },

  // ============ DOCUMENTS ============
  "documents-release": {
    section: "documents", eyebrow: "Release documents", title: "Keep the paper trail intact",
    lead: "Your release papers prove where you've been and unlock everything from housing to employment.",
    learn: [
      { title: "What counts", description: "Certificate of discharge · release-planning paperwork · supervision terms · sentencing order." },
      { title: "Why keep them", description: "Landlords, employers, benefits offices, and background-check disputes all ask." },
    ],
    doActions: [
      { label: "Scan / upload a release document", route: "/app/documents/scan" },
      { label: "Link to a Requirement", route: "/app/section/requirements" },
    ],
    track: [
      { label: "Documents on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI what to keep", route: "/app?bridge=release-docs" }],
  },
  "documents-ssn": {
    section: "documents", eyebrow: "Social Security card", title: "Replace it — it's free",
    lead: "Your SSN card unlocks employment, benefits, and taxes. Replacing it is free through SSA and takes about 2 weeks.",
    learn: [
      { title: "You don't need a new number", description: "You need the physical card. The number never changes." },
      { title: "Proof of identity", description: "Most people need a state ID or driver's license. Passport works too." },
    ],
    doActions: [
      { label: "Step 1 · Confirm proof of ID", route: "/app/section/documents", testId: "ssn-step-1" },
      { label: "Step 2 · Fill Form SS-5", hint: "Downloadable PDF", route: "/app/section/documents", testId: "ssn-step-2" },
      { label: "Step 3 · Visit or mail SSA", hint: "ssa.gov/locator", route: "/app/section/documents", testId: "ssn-step-3" },
      { label: "Step 4 · Upload confirmation letter", route: "/app/documents/scan", testId: "ssn-step-4" },
      { label: "Step 5 · Note received date", route: "/app/section/documents", testId: "ssn-step-5" },
    ],
    track: [
      { label: "SSN on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [
      { label: "SSA office locator", hint: "ssa.gov/locator" },
      { label: "Ask Bridge AI", route: "/app?bridge=ssn" },
    ],
  },
  "documents-birth-certificate": {
    section: "documents", eyebrow: "Birth certificate", title: "Order or replace your birth certificate",
    lead: "Steps and cost vary by state. Vitalchek is a common third-party service; the state office is usually cheaper.",
    learn: [
      { title: "Why you need it", description: "Required to get a state ID, driver's license, and most benefits." },
      { title: "What varies by state", description: "Fees ($15-$40) · required IDs · mail vs online vs in-person." },
    ],
    doActions: [
      { label: "State picker · steps for your state", route: "/app/section/documents" },
      { label: "Upload the order receipt", route: "/app/documents/scan" },
    ],
    track: [
      { label: "Ordered date", value: "Open →", route: "/app/section/documents" },
      { label: "Received date", value: "Open →", route: "/app/section/documents" },
    ],
    help: [
      { label: "CDC state vital records", hint: "cdc.gov/nchs/w2w" },
      { label: "Ask Bridge AI about my state", route: "/app?bridge=birth-cert" },
    ],
  },
  "documents-court": {
    section: "documents", eyebrow: "Court documents", title: "Records of judgment & sentencing",
    lead: "Judgment · sentencing · supervision terms. Keep them together so you can hand them over quickly when asked.",
    learn: [
      { title: "What's in a court packet", description: "Judgment order · sentencing sheet · restitution terms · supervision conditions." },
      { title: "Why they help you", description: "They prove the exact terms — useful when a background report says something wrong." },
    ],
    doActions: [
      { label: "Scan / upload a court document", route: "/app/documents/scan" },
      { label: "Link to a Requirement", route: "/app/section/requirements" },
    ],
    track: [
      { label: "Documents on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI what I'm missing", route: "/app?bridge=court-docs" }],
  },
  "documents-bank-setup": {
    section: "documents", eyebrow: "Bank account setup", title: "Open a checking account",
    lead: "Second-chance accounts require the same 4 things as regular ones. Most banks accept online applications.",
    learn: [
      { title: "You'll need 4 things", description: "Photo ID · SSN · proof of address · a small opening deposit ($25-$50 for most)." },
    ],
    doActions: [
      { label: "Step 1 · Photo ID on file", route: "/app/doorway/documents-ssn" },
      { label: "Step 2 · SSN card on file", route: "/app/doorway/documents-ssn" },
      { label: "Step 3 · Proof of address", route: "/app/section/documents" },
      { label: "Step 4 · Opening deposit ready", route: "/app/doorway/living-budgeting" },
      { label: "Upload confirmation letter", route: "/app/documents/scan" },
    ],
    track: [
      { label: "Banks on file", value: "Open →", route: "/app/section/independent-living" },
    ],
    help: [{ label: "Ask Bridge AI which bank", route: "/app?bridge=banking" }],
  },

  // ============ HEALTH INSURANCE ============
  "health-insurance": {
    section: "health-hub", eyebrow: "Healthcare insurance", title: "Coverage that fits your situation",
    lead: "Post-release, many people qualify for Medicaid. If you don't, the healthcare marketplace has plans starting at $0/month.",
    learn: [
      { title: "Medicaid after release", description: "Reentry programs coordinate Medicaid enrollment — you may already qualify." },
      { title: "Marketplace basics", description: "healthcare.gov · open enrollment + special enrollment periods (release from incarceration is one)." },
      { title: "Employer-provided", description: "Ask HR about eligibility, waiting periods, and cost per pay period." },
    ],
    doActions: [
      { label: "Apply for Medicaid checklist", route: "/app/section/benefits-hub" },
      { label: "Upload insurance card", route: "/app/documents/scan" },
      { label: "Add a benefits record", route: "/app/section/benefits-hub" },
    ],
    track: [
      { label: "Coverage status", value: "Open →", route: "/app/section/benefits-hub" },
      { label: "Active benefits", value: "Open →", route: "/app/section/benefits-hub" },
    ],
    help: [
      { label: "Ask Bridge AI about coverage", route: "/app?bridge=insurance" },
    ],
  },

  // ============ LIFE SKILLS ============
  "life-skills": {
    section: "life-skills", eyebrow: "Decisions & life skills", title: "Frameworks you can use tomorrow",
    lead: "Not therapy, not a lecture. Practical thinking tools: how to make hard decisions, hold boundaries, and spot scams.",
    learn: [
      { title: "Decision-making 101", description: "Cost · benefit · reversibility. Which of the three actually matters here?" },
      { title: "Holding a boundary", description: "State it once, hold it quietly, don't re-argue it." },
      { title: "Spotting scams", description: "Urgency + secrecy + gift cards or wire transfers = almost always a scam." },
      { title: "Handling setbacks", description: "Setbacks are data. Ask what you learned, then move." },
    ],
    doActions: [
      { label: "Save a decision worksheet", route: "/app/section/life-skills" },
      { label: "Open the Library lessons", route: "/app/library" },
    ],
    track: [
      { label: "Worksheets saved", value: "Open →", route: "/app/section/life-skills" },
    ],
    help: [{ label: "Ask Bridge AI to think it through", route: "/app?bridge=decision" }],
  },
};

// Which existing "section" keys map to which primary doorway
export const SECTION_TO_DOORWAY = {
  wellness: "recovery-wellness",
  "life-skills": "life-skills",
};
