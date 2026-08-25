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
  digital: "#2E5266",           // deep teal — matches the Employment family so
                                 // digital work-tech visually neighbors employment
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


// ==================== DIGITAL LIFE READINESS ====================
// 12 real doorways. Each carries video placeholder cards, plain-language Learn
// content, real Do actions, and (where appropriate) copy-to-clipboard templates.
Object.assign(DOORWAYS, {
  "digital-create-email": {
    section: "digital-readiness", eyebrow: "Create an Email",
    title: "Set up an email account you'll actually use",
    lead: "Email is how landlords, employers, benefits offices, and schools reach you. Pick one professional address and check it every day.",
    videos: [
      { title: "Video: How to Create an Email Account", note: "Video coming soon — step-by-step walkthrough of signing up with Gmail." },
      { title: "Video: Choosing a Professional Email Name", note: "Video coming soon — what makes a name look adult and trustworthy." },
    ],
    learn: [
      { title: "Why one main email matters", description: "Employers and benefits offices only send to the address you gave them. Pick one and check it daily." },
      { title: "Free providers you can use", description: "Gmail (google.com) · Outlook (outlook.com) · Proton (proton.me) · Yahoo. All are free. Gmail is the easiest starting point." },
      { title: "Choose a professional-sounding name", description: "Aim for firstname.lastname or firstname.lastname123 — not nicknames, not old handles, not anything with numbers that could be misread." },
      { title: "Save your recovery info", description: "Add a backup phone number and a second email you can access. If you forget the password, this is how you get back in." },
      { title: "Verify your account", description: "Providers text or email a code the first time. Enter it right away — otherwise the account can be frozen." },
    ],
    doActions: [
      { label: "Open Gmail (external)", route: "https://mail.google.com/", external: true },
      { label: "Open Outlook (external)", route: "https://outlook.live.com/", external: true },
      { label: "Save your login safely", route: "/app/doorway/digital-password-safety" },
    ],
    track: [
      { label: "Add your email to profile", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI which provider is best for me", route: "/app?bridge=email-provider" }],
  },

  "digital-email-basics": {
    section: "digital-readiness", eyebrow: "Email Basics",
    title: "Read, reply, forward, attach — day-to-day email",
    lead: "Once your account is created, the same handful of actions work in every email app. Learn them once and you're set.",
    videos: [
      { title: "Video: Reading and Replying to Email", note: "Video coming soon." },
      { title: "Video: Spotting Junk and Spam", note: "Video coming soon." },
    ],
    learn: [
      { title: "The folders you actually use", description: "Inbox (new mail) · Sent (what you sent) · Drafts (unsent) · Junk / Spam (auto-filtered) · Trash (deleted, recoverable for ~30 days)." },
      { title: "Read · Reply · Reply All · Forward", description: "Reply → replies just to the sender. Reply All → replies to everyone on the message. Forward → sends a copy to someone new. Choose carefully — Reply All to the wrong list is a common mistake." },
      { title: "Attachments", description: "The paperclip icon lets you add a file (resume, ID copy). Most email caps at 25 MB. Larger files → share a link instead." },
      { title: "Marking spam", description: "Right-click a suspicious message → 'Mark as spam' teaches your provider to filter similar messages next time." },
      { title: "Turn on notifications", description: "On your phone, allow notifications for your main email app so you don't miss a landlord, employer, or PO." },
    ],
    doActions: [
      { label: "Send yourself a test email", route: "https://mail.google.com/", external: true },
      { label: "Open Professional Template →", route: "/app/doorway/digital-email-template" },
    ],
    track: [
      { label: "Email on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI to explain a message", route: "/app?bridge=email-help" }],
  },

  "digital-email-template": {
    section: "digital-readiness", eyebrow: "Professional Email Template",
    title: "Copy-and-paste templates for real situations",
    lead: "Every professional email uses the same shape: subject · greeting · purpose · ask · thanks · your name. These templates are yours to keep.",
    videos: [
      { title: "Video: Writing a Professional Email", note: "Video coming soon — a two-minute walkthrough of the anatomy below." },
    ],
    learn: [
      { title: "Anatomy of a professional email", description: "1. Subject line (short, specific) 2. Greeting ('Hi [Name],') 3. One-line purpose 4. What you're asking for 5. 'Thank you,' + your name." },
      { title: "Do", description: "Use their name if you have it · keep it under 6 short lines · proofread once · reply within 24-48 hours." },
      { title: "Don't", description: "All caps · texting shortcuts (u, ur) · long paragraphs · demands or apologies without context." },
    ],
    templates: [
      { name: "Ask a support-staff question",
        subject: "Question about [what]",
        body: "Hi [Name],\n\nI'm reaching out about [what happened / what you need].\n\nCould you help me understand [specific question]? I'd appreciate any guidance.\n\nThank you for your time,\n[Your name]\n[Your phone number]" },
      { name: "Follow up on a job application",
        subject: "Following up: [Position] application",
        body: "Hi [Hiring Manager],\n\nI applied for the [Position] role on [date] and wanted to follow up on my application.\n\nI'm still very interested in the opportunity and happy to answer any questions or provide additional information.\n\nThank you for your time,\n[Your name]\n[Your phone number]" },
      { name: "Request a document from your case worker or PO",
        subject: "Request: [document name]",
        body: "Hi [Name],\n\nCould I get a copy of [specific document] for [reason — e.g., housing application, employer background check]?\n\nHappy to pick it up in person or receive it by email — whichever works best for you.\n\nThank you,\n[Your name]" },
      { name: "Contact a landlord",
        subject: "Interest in [address] rental",
        body: "Hi [Landlord's name],\n\nI saw your listing for [address / neighborhood] and I'm interested in learning more.\n\nA little about me: I'm [working / in training] and looking for a stable place to live. I can provide references and complete a rental application.\n\nWhen would be a good time to see the unit or speak by phone?\n\nThank you,\n[Your name]\n[Your phone number]" },
    ],
    doActions: [
      { label: "Copy a template above (tap Copy)", route: "/app/doorway/digital-email-template" },
      { label: "Send your first draft", route: "https://mail.google.com/", external: true },
    ],
    track: [
      { label: "Email on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI to rewrite a draft with me", route: "/app?bridge=email-rewrite" }],
  },

  "digital-spreadsheet": {
    section: "digital-readiness", eyebrow: "Create a Spreadsheet",
    title: "Spreadsheets: budgets, job tracking, appointments",
    lead: "A spreadsheet is a grid where you type facts and totals do themselves. You do not need advanced formulas to get real value.",
    videos: [
      { title: "Video: Spreadsheet Basics", note: "Video coming soon — creating a sheet, entering data, saving." },
    ],
    learn: [
      { title: "What a spreadsheet actually is", description: "Rows (side to side) × columns (top to bottom). Each box is a cell. Type facts in cells, and the sheet can add them up." },
      { title: "Free tools", description: "Google Sheets (sheets.google.com — free with any Gmail) · Excel Online (free with Microsoft account) · LibreOffice Calc (free desktop). Any of them will do." },
      { title: "Label the top row", description: "The first row is for headers: 'Date', 'Amount', 'What for' — so you know what each column means later." },
      { title: "The 3 spreadsheets worth having", description: "Monthly budget · job-application tracker · weekly appointments." },
    ],
    templates: [
      { name: "Monthly budget (tab-separated — paste into Sheets/Excel)",
        body: "Category\tPlanned\tActual\nRent\t\t\nUtilities\t\t\nPhone\t\t\nFood\t\t\nTransportation\t\t\nMedical\t\t\nFees / restitution\t\t\nSavings\t\t\nOther\t\t\nTOTAL\t=SUM(B2:B9)\t=SUM(C2:C9)" },
      { name: "Job applications tracker",
        body: "Company\tRole\tApplied on\tSource\tStatus\tNext step\tContact\n\t\t\t\t\t\t\n\t\t\t\t\t\t" },
      { name: "Weekly appointments",
        body: "Day\tTime\tWith\tWhere\tPurpose\tBring\nMon\t\t\t\t\t\nTue\t\t\t\t\t\nWed\t\t\t\t\t\nThu\t\t\t\t\t\nFri\t\t\t\t\t" },
    ],
    doActions: [
      { label: "Open Google Sheets and paste a template", route: "https://sheets.google.com/", external: true },
      { label: "Open Excel Online", route: "https://office.live.com/start/Excel.aspx", external: true },
    ],
    track: [
      { label: "Budget on file", value: "Add to Budgeting →", route: "/app/doorway/living-budgeting" },
    ],
    help: [{ label: "Ask Bridge AI to build a budget with me", route: "/app?bridge=budget-sheet" }],
  },

  "digital-internet-basics": {
    section: "digital-readiness", eyebrow: "Internet Basics",
    title: "Get around the web with confidence",
    lead: "Once you know how a browser works, most 'tech problems' turn into three or four familiar moves.",
    videos: [
      { title: "Video: Using a Web Browser", note: "Video coming soon — Chrome, Firefox, Safari, Edge basics." },
      { title: "Video: Searching Safely", note: "Video coming soon — finding trusted info and avoiding scams." },
    ],
    learn: [
      { title: "Browser vs. search bar", description: "The browser is the app (Chrome, Firefox, Safari, Edge). The address bar at the top can also search — you don't need to open Google separately." },
      { title: "Find trusted sources", description: "For benefits and government info, look for websites that end in .gov (e.g., ssa.gov, benefits.gov, dol.gov). These are the official sources." },
      { title: "Read the padlock", description: "A padlock icon left of the address means the site is encrypted. No padlock + asking for your SSN or payment = walk away." },
      { title: "Bookmarks save time", description: "The star icon (or Ctrl-D / ⌘-D) saves a site. Great for sites you use often: your bank, your case-manager portal, your email." },
      { title: "Common scam signals", description: "Urgency ('act now'), asking for payment in gift cards, unfamiliar sender, misspelled URLs (amaz0n.com, bank-of-arnerica.com)." },
    ],
    doActions: [
      { label: "Bookmark 3 sites you use often", route: "https://www.google.com/", external: true },
      { label: "Password safety →", route: "/app/doorway/digital-password-safety" },
    ],
    track: [
      { label: "Bookmarked sites", value: "Save →", route: "/app/doorway/living-community" },
    ],
    help: [{ label: "Ask Bridge AI if a website looks real", route: "/app?bridge=is-this-real" }],
  },

  "digital-online-forms": {
    section: "digital-readiness", eyebrow: "Online Forms & Applications",
    title: "Fill out an online form without losing progress",
    lead: "Most reentry paperwork now lives online — housing, benefits, jobs, court fees. The same rules apply to almost every form.",
    videos: [
      { title: "Video: Filling Out Online Forms", note: "Video coming soon — required fields, uploads, saving progress." },
    ],
    learn: [
      { title: "Read the whole form first", description: "Scroll to the bottom before you start typing so you know what you'll need — proof of address, past employer names, dates." },
      { title: "Required fields", description: "A red asterisk (*) or 'required' means you cannot submit without it. Fill them all before touching Submit." },
      { title: "Formatting matters", description: "SSN: 123-45-6789. Phone: (555) 123-4567. Dates usually MM/DD/YYYY. Get these right the first time — the form may reject and lose your work." },
      { title: "Uploading a document into a form", description: "Look for a button labeled 'Choose file', 'Browse', or 'Upload'. It opens your Files/Downloads folder. Pick the file, wait for the checkmark, then continue." },
      { title: "Save progress if you can", description: "Many forms have a 'Save and continue' button. Use it every few sections. Do NOT rely on the browser Back button." },
      { title: "Review before submit", description: "The last screen is usually a summary. Read every line — misspelled names or wrong SSNs cause weeks of delay." },
    ],
    templates: [
      { name: "Info-to-have-ready checklist",
        body: "Full legal name (exactly as on ID)\nDate of birth\nSSN\nCurrent mailing address\nPhone number\nEmail\nLast 3 addresses (with dates)\nLast 3 employers (with dates)\nEmergency contact name + phone\nRelease date (if asked)\nSupervision status + officer contact\nID document ready to upload (driver's license, state ID)" },
    ],
    doActions: [
      { label: "Practice with the Blueprint intake", route: "/app/blueprint/intake" },
      { label: "Upload a doc into your Vault", route: "/app/documents/scan" },
    ],
    track: [
      { label: "Info on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI to walk me through a form", route: "/app?bridge=form-help" }],
  },

  "digital-documents": {
    section: "digital-readiness", eyebrow: "Digital Documents",
    title: "Open, save, rename, and organize your files",
    lead: "A tidy Documents folder is one of the highest-return habits in reentry. It lets you find anything in under 30 seconds.",
    videos: [
      { title: "Video: PDF Basics", note: "Video coming soon — opening, saving, and printing PDFs." },
    ],
    learn: [
      { title: "PDF vs Word vs Image", description: "PDF (.pdf) — locked layout, best for sending official docs. Word (.docx) — editable text. Image (.jpg / .png) — photo of a document; readable but harder to edit." },
      { title: "Open a file", description: "Double-click on a computer or tap on a phone. It opens in the default app. On Android/iPhone, downloaded files live in the Files app." },
      { title: "Save vs Save As", description: "Save = update the existing file. Save As = create a new copy with a new name — use this when you don't want to lose the original." },
      { title: "Rename clearly", description: "SmithJohn_Resume_2026.pdf beats Resume_final_FINAL(2).pdf every time. Future-you will thank present-you." },
      { title: "Organize into folders", description: "Suggested folders: /Identity · /Housing · /Employment · /Health · /Legal. Move files as soon as you save them." },
    ],
    doActions: [
      { label: "Open your Document Vault", route: "/app/section/documents" },
      { label: "Rename a document clearly", route: "/app/section/documents" },
    ],
    track: [
      { label: "Documents on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI how to organize my files", route: "/app?bridge=file-org" }],
  },

  "digital-upload-download": {
    section: "digital-readiness", eyebrow: "Upload and Download Files",
    title: "Move files between your phone, computer, and websites",
    lead: "'Download' pulls a file TO you. 'Upload' pushes a file FROM you to a website. Same idea, opposite direction.",
    videos: [
      { title: "Video: Uploading and Downloading", note: "Video coming soon — where files go and how to find them." },
    ],
    learn: [
      { title: "Where downloads go", description: "By default, downloads land in the Downloads folder — you can find it in your Files app or File Explorer / Finder." },
      { title: "How to upload", description: "On a form: click 'Choose file' or 'Upload'. A window opens showing your files. Pick the one you want, tap Open, and wait for the confirmation checkmark." },
      { title: "Common file types", description: ".pdf (official documents) · .jpg / .png (photos, ID scans) · .docx (Word) · .xlsx (Excel) · .txt (plain text)." },
      { title: "Cloud vs local storage", description: "Local = on your device. Cloud (Google Drive, iCloud, OneDrive, Dropbox) = accessible from any device you sign into. Save important files to cloud so a lost phone doesn't lose your records." },
      { title: "Size matters", description: "Camera photos are large (~3-8 MB each). Most upload forms cap around 5-10 MB per file. If a file is too big, save it as a smaller PDF." },
    ],
    doActions: [
      { label: "Upload a document to your Vault", route: "/app/documents/scan" },
      { label: "See Digital Documents →", route: "/app/doorway/digital-documents" },
    ],
    track: [
      { label: "Documents on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI where a downloaded file went", route: "/app?bridge=downloads" }],
  },

  "digital-attach-send": {
    section: "digital-readiness", eyebrow: "Attach and Send Documents",
    title: "Send a resume, ID copy, or paperwork by email",
    lead: "This is one of the most common workplace tasks after release. Do it once and it becomes muscle memory.",
    videos: [
      { title: "Video: Attaching a Document to an Email", note: "Video coming soon." },
    ],
    learn: [
      { title: "The three steps", description: "1. Open a new email. 2. Tap the paperclip icon. 3. Pick the file from your Files/Downloads folder, then send." },
      { title: "PDF is safer than photo", description: "A PDF looks the same to everyone. A phone photo might be sideways, blurry, or cut off. If you scanned into the Vault here, we already saved a PDF for you." },
      { title: "Size limits", description: "Most inboxes cap attachments at 25 MB. For larger files (like a video), share a Google Drive or Dropbox link instead." },
      { title: "Say what's attached", description: "Never send a naked attachment. In the message body, write one line: 'Attached: my resume for the [Position].'" },
    ],
    templates: [
      { name: "Resume attached — job application",
        subject: "Application: [Position]",
        body: "Hi [Hiring Manager],\n\nAttached is my resume for the [Position] role posted on [where you saw it].\n\nI'd welcome the chance to talk more about the role. My phone number is [phone] and I'm reachable most weekdays.\n\nThank you for your time,\n[Your name]" },
      { name: "Requested documents attached",
        subject: "Documents requested — [Your name]",
        body: "Hi [Name],\n\nAttached are the documents you requested:\n- [Document 1]\n- [Document 2]\n\nLet me know if anything is missing or if you'd prefer a different format.\n\nThank you,\n[Your name]\n[Your phone number]" },
    ],
    doActions: [
      { label: "Open your Vault to send a file", route: "/app/section/documents" },
      { label: "Open Gmail", route: "https://mail.google.com/", external: true },
    ],
    track: [
      { label: "Documents on file", value: "Open →", route: "/app/section/documents" },
    ],
    help: [{ label: "Ask Bridge AI to write the message for me", route: "/app?bridge=attach-email" }],
  },

  "digital-school-work-tech": {
    section: "digital-readiness", eyebrow: "School & Work Technology Basics",
    title: "Common tools you'll meet on the job or in a program",
    lead: "You do not need to master any of these. You need to recognize them and know where to click for help.",
    videos: [
      { title: "Video: Getting Started with School Portals", note: "Video coming soon — Canvas / Blackboard / Google Classroom." },
      { title: "Video: Common Work Tools", note: "Video coming soon — Slack, Teams, Zoom, Google Workspace, Microsoft 365." },
    ],
    learn: [
      { title: "School portals", description: "Canvas, Blackboard, Google Classroom, Moodle — different names, same idea. You sign in, see your classes, upload assignments, and message your instructor." },
      { title: "Work chat tools", description: "Slack and Microsoft Teams are the two big ones. Channels are conversations by topic; direct messages are private. Turn on notifications for your team's channel." },
      { title: "Meetings", description: "Zoom, Google Meet, Microsoft Teams meetings. See the dedicated Video Calls doorway." },
      { title: "Google Workspace vs Microsoft 365", description: "Different companies use different ones. Both do email, docs, sheets, slides, and video calls. If you can use one, you can use the other." },
      { title: "Typing", description: "The single biggest skill-per-hour investment. Free practice: typing.com and monkeytype.com. Aim for 30 words per minute." },
    ],
    doActions: [
      { label: "Open typing practice (typing.com)", route: "https://www.typing.com/", external: true },
      { label: "Video Calls doorway →", route: "/app/doorway/digital-video-calls" },
    ],
    track: [
      { label: "Learn & Resources", value: "Library →", route: "/app/library" },
    ],
    help: [{ label: "Ask Bridge AI what tool a job needs", route: "/app?bridge=work-tools" }],
  },

  "digital-password-safety": {
    section: "digital-readiness", eyebrow: "Password and Account Safety",
    title: "Strong passwords, 2FA, and spotting phishing",
    lead: "One good password habit prevents 95% of common account takeovers. This is worth 20 minutes today.",
    videos: [
      { title: "Video: Making a Strong Password", note: "Video coming soon." },
      { title: "Video: Spotting Phishing Emails", note: "Video coming soon." },
    ],
    learn: [
      { title: "The strong-password recipe", description: "Three random words + a number + a symbol. Example: coffee-elephant-river-27! is stronger than P@ssword1 and easier to remember." },
      { title: "Never reuse passwords for money accounts or email", description: "If a shopping site is breached and you reused your bank password there, they can now try it on your bank. Give money accounts and email their own unique passwords." },
      { title: "Password managers", description: "A password manager remembers every password so you only need one master. Free options: Bitwarden. Built-in: iCloud Keychain, Chrome, Edge, 1Password (paid, family-friendly)." },
      { title: "Turn on two-factor authentication (2FA)", description: "2FA sends a second code to your phone. Even if someone guesses the password, they can't get in without your phone. Turn it on for email FIRST, then bank, then everything else." },
      { title: "Phishing red flags", description: "'Urgent — act now', unexpected 'you won' messages, gift-card asks, misspelled sender addresses, links that don't match the real site." },
      { title: "What to do if you clicked a bad link", description: "Change the password on that account, turn on 2FA if you haven't, and scan your device with the free Malwarebytes app." },
    ],
    doActions: [
      { label: "Turn on 2FA for your email today", route: "https://myaccount.google.com/security", external: true },
      { label: "Try Bitwarden (free password manager)", route: "https://bitwarden.com/", external: true },
    ],
    track: [
      { label: "Login safety habits", value: "Open →", route: "/app/section/digital-readiness" },
    ],
    help: [{ label: "Ask Bridge AI if a message looks like phishing", route: "/app?bridge=phishing" }],
  },

  "digital-video-calls": {
    section: "digital-readiness", eyebrow: "Video Calls and Virtual Meetings",
    title: "Join a video meeting for a job, a class, or an appointment",
    lead: "Video calls are common for interviews, telehealth, court appearances, and classes. The same five buttons appear on almost every platform.",
    videos: [
      { title: "Video: Joining a Zoom or Google Meet Call", note: "Video coming soon — from a link to on-camera in 60 seconds." },
      { title: "Video: Camera and Microphone Basics", note: "Video coming soon — how to look and sound professional." },
    ],
    learn: [
      { title: "Joining a call", description: "You'll get a link (usually by email). Tap it 5-10 minutes early. The browser or app will ask for camera + microphone permission — allow both." },
      { title: "Mic and camera controls", description: "Bottom bar of every app. Mic icon = mute/unmute. Camera icon = video on/off. Mute yourself when you're not speaking so background noise doesn't distract." },
      { title: "Camera placement", description: "Eye level, not looking up your nose. Prop the phone against something. Sit facing a window (soft light on your face)." },
      { title: "Test before the meeting", description: "Zoom: zoom.us/test. Google Meet: meet.google.com and click 'Check your audio and video'. Do this once a week if you have upcoming appointments." },
      { title: "Professional behavior", description: "Neutral background, quiet room, no phone-scrolling on camera, wear what you'd wear in person, mute when others are speaking." },
      { title: "Screen sharing", description: "'Share screen' shows everyone your desktop. Only share what you need — close personal tabs first." },
    ],
    doActions: [
      { label: "Test your camera and mic (Zoom test)", route: "https://zoom.us/test", external: true },
      { label: "Test with Google Meet", route: "https://meet.google.com/", external: true },
    ],
    track: [
      { label: "Upcoming appointments", value: "Open →", route: "/app/section/requirements" },
    ],
    help: [{ label: "Ask Bridge AI to prep me for a video interview", route: "/app?bridge=video-interview" }],
  },
});
