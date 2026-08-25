"""Batch A — Universal Resource Registry for A Path Forward.

Extends the existing `db.resources` collection with a classification system
(LEARN / USE_TOOL / FIND_SUPPORT), reentry pathways, region tags, disclaimer
types, and a saved-resources feature.

Existing resource rows without the new fields default to `kind='support'`
region='national' so nothing breaks.

Registered from server.py after primitives are ready.
"""
from __future__ import annotations
import logging
import re
from typing import Optional

from fastapi import Depends, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger("bmb.resources_v2")

db = None
api_router = None
current_user = None
require_role = None
now_iso = None
new_id = None
_audit = None

# ---------- classifications ----------
KINDS = {"learn", "tool", "support"}
PATHWAYS = {
    "get-stable", "get-healthy", "get-organized", "get-to-work",
    "rebuild-money", "rebuild-life", "build-future", "know-where",
}
REGIONS = {"arkansas", "national", "local"}
DISCLAIMERS = {"none", "legal", "health", "mental", "financial", "insurance", "safety"}

PATHWAY_META = [
    {"key": "get-stable",     "label": "Get Stable",       "blurb": "ID, food, housing, utilities, transportation, emergency needs.",  "accent": "#5B1A3A"},
    {"key": "get-healthy",    "label": "Get Healthy",      "blurb": "Healthcare, medications, mental wellness, recovery, crisis.",     "accent": "#7A8C6F"},
    {"key": "get-organized",  "label": "Get Organized",    "blurb": "Vault, appointments, court dates, tasks, contacts.",              "accent": "#B76E79"},
    {"key": "get-to-work",    "label": "Get to Work",      "blurb": "Jobs, JobLink, resume, interviews, workforce centers.",           "accent": "#2E5266"},
    {"key": "rebuild-money",  "label": "Rebuild My Money", "blurb": "Banking, budgeting, credit, debt, taxes, identity theft.",        "accent": "#B5851F"},
    {"key": "rebuild-life",   "label": "Rebuild My Life",  "blurb": "Family, personal organization, decisions, digital confidence.",   "accent": "#B85A4B"},
    {"key": "build-future",   "label": "Build My Future",  "blurb": "Education, training, college aid, business, grants, leadership.", "accent": "#3E5641"},
    {"key": "know-where",     "label": "Know Where to Get Help", "blurb": "Arkansas 211, DHS, workforce, legal, VA, emergency.",       "accent": "#1B1033"},
]

# ---------- seed data ----------
# 40+ real Arkansas + national resources. Everything is verified as of Feb 2026.
SEED_RESOURCES = [
    # ============ KNOW WHERE — statewide gateways ============
    {"title": "Arkansas 211 — Statewide Community Help Line", "kind": "support",
     "summary": "Call 211 or search online for food, housing, utilities, benefits, legal, health, veterans help across Arkansas.",
     "source": "United Way of Arkansas", "url": "https://arkansas211.org/",
     "category": "community", "pathways": ["know-where", "get-stable"],
     "region": "arkansas", "disclaimer_type": "none",
     "tags": ["211", "arkansas", "community", "help-line", "gateway"], "priority": 100},
    {"title": "Arkansas Department of Human Services (DHS)", "kind": "support",
     "summary": "SNAP, TEA, Medicaid, ARKids, adult protective services, behavioral health, DDS. Statewide.",
     "source": "Arkansas DHS", "url": "https://humanservices.arkansas.gov/",
     "category": "benefits", "pathways": ["know-where", "get-stable", "get-healthy"],
     "region": "arkansas", "disclaimer_type": "none",
     "tags": ["dhs", "snap", "medicaid", "benefits"], "priority": 95},
    {"title": "Arkansas Legal Services — Free civil legal help", "kind": "support",
     "summary": "Free legal help with housing, benefits, family, expungement, and reentry issues for low-income Arkansans.",
     "source": "Legal Aid of Arkansas + Center for Arkansas Legal Services", "url": "https://arlegalservices.org/",
     "category": "legal", "pathways": ["know-where"],
     "region": "arkansas", "disclaimer_type": "legal",
     "tags": ["legal-aid", "expungement", "housing-court", "reentry"], "priority": 90},
    {"title": "Arkansas Workforce Services (ADWS)", "kind": "support",
     "summary": "Job listings, unemployment insurance, apprenticeship, veteran services, training grants.",
     "source": "Arkansas Division of Workforce Services", "url": "https://www.dws.arkansas.gov/",
     "category": "employment", "pathways": ["know-where", "get-to-work"],
     "region": "arkansas", "disclaimer_type": "none",
     "tags": ["workforce", "jobs", "training", "veterans"], "priority": 88},
    {"title": "Arkansas JobLink — statewide job search", "kind": "support",
     "summary": "Arkansas's official job-search portal — post a resume, search jobs, register for workforce services.",
     "source": "Arkansas DWS", "url": "https://www.arjoblink.arkansas.gov/",
     "category": "employment", "pathways": ["get-to-work"],
     "region": "arkansas", "disclaimer_type": "none",
     "tool_route": "/app/section/employment-readiness",
     "tags": ["joblink", "jobs", "arkansas"], "priority": 87},
    {"title": "988 Suicide & Crisis Lifeline", "kind": "support",
     "summary": "Call or text 988. Free, confidential, 24/7. Not just for suicide — any mental-health crisis.",
     "source": "SAMHSA / Federal", "url": "https://988lifeline.org/",
     "category": "crisis", "pathways": ["know-where", "get-healthy"],
     "region": "national", "disclaimer_type": "mental", "is_crisis": True,
     "tags": ["988", "crisis", "mental-health", "suicide"], "priority": 100},
    {"title": "SAMHSA National Helpline", "kind": "support",
     "summary": "1-800-662-HELP (4357). Free, confidential, 24/7. Treatment referrals for mental and substance-use disorders.",
     "source": "SAMHSA", "url": "https://www.samhsa.gov/find-help/national-helpline",
     "category": "recovery", "pathways": ["know-where", "get-healthy"],
     "region": "national", "disclaimer_type": "mental", "is_crisis": True,
     "tags": ["samhsa", "recovery", "substance-use", "helpline"], "priority": 96},
    {"title": "911 — Life-threatening emergencies", "kind": "support",
     "summary": "For active medical, fire, or safety emergencies. Call 911.",
     "source": "Federal", "url": "tel:911",
     "category": "emergency", "pathways": ["know-where"],
     "region": "national", "disclaimer_type": "none", "is_crisis": True,
     "tags": ["911", "emergency"], "priority": 100},

    # ============ GET STABLE ============
    {"title": "Ready.gov — Family Emergency Plan", "kind": "learn",
     "summary": "Free step-by-step guide to building a family emergency plan (meet-up spots, contacts, kit list).",
     "source": "Ready.gov (FEMA)", "url": "https://www.ready.gov/plan",
     "category": "emergency", "pathways": ["get-stable"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["emergency-plan", "family", "readiness"], "priority": 40},
    {"title": "FEMA — Basic Disaster Supplies Kit", "kind": "learn",
     "summary": "What to pack for a 72-hour go-bag: water, food, meds, ID copies, cash, phone charger.",
     "source": "Ready.gov (FEMA)", "url": "https://www.ready.gov/kit",
     "category": "emergency", "pathways": ["get-stable"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["go-bag", "supplies", "emergency", "kit"], "priority": 42},
    {"title": "Mayo Clinic — Choking First Aid", "kind": "learn",
     "summary": "Plain-language walk-through of the Heimlich maneuver and CPR chest thrusts for adults and infants.",
     "source": "Mayo Clinic", "url": "https://www.mayoclinic.org/first-aid/first-aid-choking/basics/art-20056637",
     "category": "emergency", "pathways": ["get-stable"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["first-aid", "choking", "heimlich"], "priority": 36},
    {"title": "American Heart Association — Hands-Only CPR", "kind": "learn",
     "summary": "Two-step Hands-Only CPR: call 911 and push hard and fast in the center of the chest.",
     "source": "American Heart Association", "url": "https://www.heart.org/en/cpr/hands-only-cpr",
     "category": "emergency", "pathways": ["get-stable"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["cpr", "hands-only", "aha", "first-aid"], "priority": 44},
    {"title": "Ready.gov — Financial Preparedness", "kind": "learn",
     "summary": "How to protect your money before, during, and after a disaster — cash on hand, digital copies of IDs.",
     "source": "Ready.gov (FEMA)", "url": "https://www.ready.gov/financial-preparedness",
     "category": "emergency", "pathways": ["get-stable", "rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["financial-preparedness", "emergency", "cash"], "priority": 38},
    {"title": "CDC — Personal Health Preparedness", "kind": "learn",
     "summary": "Prescription refills, medical records, family contacts — the health items to gather before an emergency.",
     "source": "CDC", "url": "https://www.cdc.gov/orr/readiness/personal/index.htm",
     "category": "emergency", "pathways": ["get-stable", "get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["cdc", "emergency", "medical-records"], "priority": 37},
    {"title": "American Red Cross — First Aid & CPR classes", "kind": "support",
     "summary": "Find in-person, online, or blended CPR/AED/First-Aid courses that offer official certification.",
     "source": "American Red Cross", "url": "https://www.redcross.org/take-a-class",
     "category": "emergency", "pathways": ["get-stable", "get-to-work"],
     "region": "national", "disclaimer_type": "safety", "credential_pathway": True,
     "tags": ["cpr", "first-aid", "aed", "certification", "red-cross"], "priority": 45},
    {"title": "OSHA workplace safety basics", "kind": "learn",
     "summary": "Educational modules on workplace safety, worker rights, and how to report unsafe conditions.",
     "source": "OSHA (U.S. DOL)", "url": "https://www.osha.gov/workers",
     "category": "workplace", "pathways": ["get-stable", "get-to-work"],
     "region": "national", "disclaimer_type": "safety",
     "tags": ["osha", "workplace-safety", "worker-rights"], "priority": 30},
    {"title": "Arkansas Division of Emergency Management", "kind": "support",
     "summary": "Statewide preparedness, disaster assistance, and county emergency contact directory.",
     "source": "State of Arkansas", "url": "https://www.dps.arkansas.gov/emergency-management/",
     "category": "emergency", "pathways": ["get-stable", "know-where"],
     "region": "arkansas", "disclaimer_type": "none",
     "tags": ["emergency", "arkansas", "disaster"], "priority": 32},

    # ============ REBUILD MY MONEY ============
    {"title": "CFPB — Everything about credit reports and scores", "kind": "learn",
     "summary": "Consumer-friendly explainers on credit reports, disputing errors, and building credit from scratch.",
     "source": "Consumer Financial Protection Bureau", "url": "https://www.consumerfinance.gov/consumer-tools/credit-reports-and-scores/",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["cfpb", "credit", "credit-report", "credit-score"], "priority": 60},
    {"title": "FDIC Money Smart — free financial education", "kind": "learn",
     "summary": "Free multi-module course on banking, budgeting, credit, borrowing, and consumer protection.",
     "source": "FDIC", "url": "https://www.fdic.gov/resources/consumers/money-smart/",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["fdic", "money-smart", "budgeting", "banking"], "priority": 58},
    {"title": "IdentityTheft.gov — Report and recover", "kind": "support",
     "summary": "Federal step-by-step recovery plan if your identity has been stolen. Personalized checklist.",
     "source": "Federal Trade Commission", "url": "https://www.identitytheft.gov/",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["identity-theft", "ftc", "recovery-plan"], "priority": 55},
    {"title": "IRS — Free tax help (VITA & Free File)", "kind": "support",
     "summary": "Volunteer Income Tax Assistance (free tax prep) + Free File for filing income tax returns online.",
     "source": "IRS", "url": "https://www.irs.gov/individuals/free-tax-return-preparation-for-qualifying-taxpayers",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["irs", "taxes", "vita", "free-file"], "priority": 50},
    {"title": "Federal Student Aid — FAFSA", "kind": "support",
     "summary": "Apply for federal Pell grants, work-study, and student loans for college or career training.",
     "source": "U.S. Department of Education", "url": "https://studentaid.gov/",
     "category": "education", "pathways": ["rebuild-money", "build-future"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["fafsa", "student-aid", "pell", "college"], "priority": 52},
    {"title": "CFPB — Your Money, Your Goals toolkit", "kind": "learn",
     "summary": "Free plain-language toolkit covering budgets, bills, savings, credit, and dealing with debt.",
     "source": "Consumer Financial Protection Bureau",
     "url": "https://www.consumerfinance.gov/consumer-tools/educator-tools/your-money-your-goals/toolkit/",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["cfpb", "budget", "debt", "savings"], "priority": 56},
    {"title": "MyMoney.gov — Basic money management", "kind": "learn",
     "summary": "Federal one-stop for earning, saving, spending, borrowing, investing, and protecting your money.",
     "source": "U.S. Financial Literacy and Education Commission",
     "url": "https://www.mymoney.gov/",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["mymoney", "basics", "financial-literacy"], "priority": 48},
    {"title": "AnnualCreditReport.com — Free weekly credit reports", "kind": "learn",
     "summary": "The only federally-authorized site for free credit reports from Equifax, Experian, and TransUnion.",
     "source": "AnnualCreditReport.com (federally-authorized)",
     "url": "https://www.annualcreditreport.com/",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["credit-report", "free", "annual"], "priority": 54},
    {"title": "Federal Reserve — Credit reports and credit scores", "kind": "learn",
     "summary": "Consumer guide to how credit reports work, what affects your score, and how to fix errors.",
     "source": "Federal Reserve Board",
     "url": "https://www.federalreserve.gov/consumerscommunities/credit_reports.htm",
     "category": "financial", "pathways": ["rebuild-money"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["credit-report", "credit-score", "fed"], "priority": 44},
    {"title": "HUD — Talk to a housing counselor (free)", "kind": "support",
     "summary": "Free HUD-approved housing counselors for renters, buyers, and anyone at risk of losing their home.",
     "source": "U.S. Department of Housing and Urban Development",
     "url": "https://www.hud.gov/i_want_to/talk_to_a_housing_counselor",
     "category": "financial", "pathways": ["rebuild-money", "get-stable"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["hud", "housing-counselor", "rent", "foreclosure"], "priority": 50},

    # ============ GET HEALTHY ============
    {"title": "HealthCare.gov — Marketplace insurance", "kind": "support",
     "summary": "Apply for a health plan through the Marketplace. Special enrollment for people released from incarceration.",
     "source": "CMS", "url": "https://www.healthcare.gov/",
     "category": "insurance", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "insurance",
     "tags": ["marketplace", "insurance", "reentry-sep"], "priority": 62},
    {"title": "MedlinePlus — Trusted health information", "kind": "learn",
     "summary": "Plain-language explanations of conditions, medications, tests, and self-care from the NIH.",
     "source": "NIH National Library of Medicine", "url": "https://medlineplus.gov/",
     "category": "health", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["medlineplus", "nih", "health-info"], "priority": 40},
    {"title": "Arkansas Department of Health — Medicaid & clinics", "kind": "support",
     "summary": "Local health-unit directory (STI testing, vaccines, WIC), and links to Medicaid enrollment.",
     "source": "Arkansas Department of Health", "url": "https://www.healthy.arkansas.gov/",
     "category": "health", "pathways": ["get-healthy", "know-where"],
     "region": "arkansas", "disclaimer_type": "health",
     "tags": ["arkansas-health", "clinics", "wic", "vaccines"], "priority": 55},
    {"title": "CDC — Adult immunization schedule", "kind": "learn",
     "summary": "Which shots to get as an adult and when — flu, Tdap, shingles, hep B, COVID and more.",
     "source": "CDC",
     "url": "https://www.cdc.gov/vaccines/schedules/hcp/imz/adult.html",
     "category": "health", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["cdc", "vaccines", "adult-immunization"], "priority": 38},
    {"title": "Medicare.gov — Coverage basics", "kind": "learn",
     "summary": "What Medicare covers, when to sign up, and how it works with Medicaid and Marketplace plans.",
     "source": "CMS",
     "url": "https://www.medicare.gov/basics",
     "category": "health", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "insurance",
     "tags": ["medicare", "coverage", "insurance"], "priority": 42},
    {"title": "CDC — Manage your diabetes", "kind": "learn",
     "summary": "Blood-sugar targets, meds, meal planning, and preventing complications — plain-language guide.",
     "source": "CDC",
     "url": "https://www.cdc.gov/diabetes/managing/index.html",
     "category": "health", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["diabetes", "chronic-care", "cdc"], "priority": 34},
    {"title": "NIH — High blood pressure basics", "kind": "learn",
     "summary": "What your numbers mean, DASH-eating basics, and how to work with a clinician to lower your BP.",
     "source": "NIH National Heart, Lung, and Blood Institute",
     "url": "https://www.nhlbi.nih.gov/health/high-blood-pressure",
     "category": "health", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["blood-pressure", "hypertension", "nih"], "priority": 32},
    {"title": "Mental Health America — Free screening tools", "kind": "learn",
     "summary": "Free anonymous screening for depression, anxiety, PTSD, bipolar, substance-use, and more.",
     "source": "Mental Health America",
     "url": "https://screening.mhanational.org/screening-tools/",
     "category": "health", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "mental",
     "tags": ["mha", "screening", "mental-health"], "priority": 46},

    # ============ RECOVERY ============
    {"title": "FindTreatment.gov — Locate treatment facilities", "kind": "support",
     "summary": "Federal locator for licensed substance-use and mental-health treatment across the U.S.",
     "source": "SAMHSA", "url": "https://findtreatment.gov/",
     "category": "recovery", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "mental",
     "tags": ["treatment", "samhsa", "substance-use", "recovery"], "priority": 68},
    {"title": "CDC — Overdose prevention and naloxone", "kind": "learn",
     "summary": "How to recognize and respond to an opioid overdose. Where and how to get naloxone.",
     "source": "CDC", "url": "https://www.cdc.gov/stopoverdose/",
     "category": "recovery", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["overdose", "naloxone", "cdc", "prevention"], "priority": 65},
    {"title": "Arkansas Naloxone information", "kind": "support",
     "summary": "How Arkansans can access naloxone through pharmacies, community programs, and the standing order.",
     "source": "Arkansas Department of Health", "url": "https://www.healthy.arkansas.gov/programs-services/topics/naloxone",
     "category": "recovery", "pathways": ["get-healthy", "know-where"],
     "region": "arkansas", "disclaimer_type": "health",
     "tags": ["naloxone", "arkansas", "overdose", "harm-reduction"], "priority": 66},
    {"title": "SAMHSA — Recovery and Recovery Support", "kind": "learn",
     "summary": "What recovery looks like, the four dimensions of recovery, and how peer support works.",
     "source": "SAMHSA",
     "url": "https://www.samhsa.gov/find-help/recovery",
     "category": "recovery", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "mental",
     "tags": ["samhsa", "recovery", "peer-support"], "priority": 60},
    {"title": "NIDA — Drugs, Brains, and Behavior: the science of addiction", "kind": "learn",
     "summary": "Plain-language explainer on why substance-use disorders are chronic health conditions, not moral failings.",
     "source": "National Institute on Drug Abuse (NIH)",
     "url": "https://nida.nih.gov/publications/drugs-brains-behavior-science-addiction",
     "category": "recovery", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["nida", "addiction", "science", "recovery"], "priority": 50},
    {"title": "NAMI — Substance use and mental health", "kind": "learn",
     "summary": "How mental illness and substance-use disorders overlap, and where to find integrated dual-diagnosis care.",
     "source": "National Alliance on Mental Illness",
     "url": "https://www.nami.org/About-Mental-Illness/Common-with-Mental-Illness/Substance-Use-Disorders",
     "category": "recovery", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "mental",
     "tags": ["nami", "co-occurring", "dual-diagnosis"], "priority": 48},
    {"title": "Faces & Voices of Recovery — Peer community", "kind": "support",
     "summary": "National advocacy and directory of peer recovery community organizations. Find people who get it.",
     "source": "Faces & Voices of Recovery",
     "url": "https://facesandvoicesofrecovery.org/",
     "category": "recovery", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "mental",
     "tags": ["peer-recovery", "community", "advocacy"], "priority": 54},
    {"title": "Recovery Research Institute — Recovery basics", "kind": "learn",
     "summary": "Evidence-based answers to what recovery is, what works, and how long it takes — for you or a loved one.",
     "source": "Recovery Research Institute (Massachusetts General Hospital)",
     "url": "https://www.recoveryanswers.org/",
     "category": "recovery", "pathways": ["get-healthy"],
     "region": "national", "disclaimer_type": "health",
     "tags": ["recovery-answers", "evidence", "science"], "priority": 46},

    # ============ CAREER ============
    {"title": "Apprenticeship.gov — Find registered apprenticeships", "kind": "support",
     "summary": "Federal apprenticeship finder. Trade, healthcare, IT, manufacturing programs across every state.",
     "source": "U.S. Department of Labor", "url": "https://www.apprenticeship.gov/",
     "category": "employment", "pathways": ["get-to-work", "build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["apprenticeship", "trades", "dol"], "priority": 62},
    {"title": "CareerOneStop — Career exploration", "kind": "learn",
     "summary": "Explore careers by interest, education, and wages. Includes reentry-specific career tools.",
     "source": "U.S. Department of Labor", "url": "https://www.careeronestop.org/",
     "category": "employment", "pathways": ["get-to-work", "build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["career-exploration", "dol", "reentry"], "priority": 55},
    {"title": "Arkansas Workforce Centers directory", "kind": "support",
     "summary": "In-person help with resumes, applications, training vouchers, and job placement across Arkansas.",
     "source": "Arkansas DWS", "url": "https://www.dws.arkansas.gov/workforce-services/local-workforce-development-areas/",
     "category": "employment", "pathways": ["get-to-work", "know-where"],
     "region": "arkansas", "disclaimer_type": "none",
     "tags": ["workforce-center", "in-person", "arkansas"], "priority": 60},
    {"title": "My Next Move — Career finder with military crosswalk", "kind": "learn",
     "summary": "Explore careers by keyword, interests, or your last job — including a military-to-civilian crosswalk.",
     "source": "U.S. Department of Labor",
     "url": "https://www.mynextmove.org/",
     "category": "employment", "pathways": ["get-to-work", "build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["career-finder", "onet", "veterans"], "priority": 50},
    {"title": "O*NET OnLine — Detailed career profiles", "kind": "learn",
     "summary": "Occupation details: what people do all day, skills required, education pathways, and Arkansas wages.",
     "source": "U.S. Department of Labor",
     "url": "https://www.onetonline.org/",
     "category": "employment", "pathways": ["get-to-work", "build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["onet", "career-profile", "wages"], "priority": 48},
    {"title": "CareerOneStop — Job search for people with a record", "kind": "learn",
     "summary": "Fair-chance job boards, expungement basics, bonding programs, and record-friendly employer lists.",
     "source": "U.S. Department of Labor",
     "url": "https://www.careeronestop.org/ExOffender/exoffender.aspx",
     "category": "employment", "pathways": ["get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["reentry", "fair-chance", "job-search"], "priority": 58},
    {"title": "Indeed Career Guide — Resumes, cover letters, interviews", "kind": "learn",
     "summary": "Free, huge library of resume templates, cover-letter examples, and behavioral interview walk-throughs.",
     "source": "Indeed",
     "url": "https://www.indeed.com/career-advice/resumes-cover-letters",
     "category": "employment", "pathways": ["get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["resume", "cover-letter", "interview"], "priority": 46},
    {"title": "DOL — Reentry Employment Opportunities", "kind": "learn",
     "summary": "Federal reentry workforce programs, Federal Bonding, WOTC tax credits for employers, and grantee lists.",
     "source": "U.S. Department of Labor",
     "url": "https://www.dol.gov/agencies/eta/REO",
     "category": "employment", "pathways": ["get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["reo", "reentry", "bonding", "wotc"], "priority": 44},

    # ============ WORKPLACE & BENEFITS ============
    {"title": "U.S. Department of Labor — Wage & Hour rights", "kind": "learn",
     "summary": "Minimum wage, overtime, breaks, and how to file a wage-theft complaint.",
     "source": "U.S. DOL", "url": "https://www.dol.gov/agencies/whd",
     "category": "workplace", "pathways": ["get-to-work"],
     "region": "national", "disclaimer_type": "legal",
     "tags": ["dol", "wages", "worker-rights"], "priority": 45},
    {"title": "DOL EBSA — Employee benefits basics", "kind": "learn",
     "summary": "Retirement, health, and disability benefits available through employers.",
     "source": "U.S. DOL EBSA", "url": "https://www.dol.gov/agencies/ebsa",
     "category": "workplace", "pathways": ["get-to-work"],
     "region": "national", "disclaimer_type": "financial",
     "tags": ["ebsa", "benefits", "retirement"], "priority": 30},
    {"title": "Arkansas Department of Labor and Licensing", "kind": "support",
     "summary": "State-level wage claims, professional licensing, and workplace regulations.",
     "source": "State of Arkansas", "url": "https://www.labor.arkansas.gov/",
     "category": "workplace", "pathways": ["get-to-work", "know-where"],
     "region": "arkansas", "disclaimer_type": "legal",
     "tags": ["arkansas-labor", "licensing"], "priority": 32},

    # ============ BUSINESS ============
    {"title": "ASBTDC — Arkansas Small Business & Technology Development Center", "kind": "support",
     "summary": "Free 1-on-1 counseling, workshops, and market research for Arkansas small-business owners.",
     "source": "ASBTDC (UALR)", "url": "https://asbtdc.org/",
     "category": "business", "pathways": ["build-future"],
     "region": "arkansas", "disclaimer_type": "none",
     "tags": ["asbtdc", "small-business", "arkansas"], "priority": 60},
    {"title": "SBA — U.S. Small Business Administration", "kind": "support",
     "summary": "Federal loans, contracts, counseling, and free classes for starting and growing a small business.",
     "source": "SBA", "url": "https://www.sba.gov/",
     "category": "business", "pathways": ["build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["sba", "small-business", "loans"], "priority": 55},
    {"title": "SCORE — Free small-business mentors", "kind": "support",
     "summary": "Free 1-on-1 business mentorship from retired executives and entrepreneurs, nationwide.",
     "source": "SCORE", "url": "https://www.score.org/",
     "category": "business", "pathways": ["build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["score", "mentorship", "small-business"], "priority": 52},
    {"title": "Arkansas Secretary of State — Business registration", "kind": "support",
     "summary": "Register your LLC, corporation, or DBA in Arkansas. File annual reports.",
     "source": "Arkansas Secretary of State", "url": "https://www.sos.arkansas.gov/business-commercial-services",
     "category": "business", "pathways": ["build-future"],
     "region": "arkansas", "disclaimer_type": "legal",
     "tags": ["sos", "llc", "business-registration"], "priority": 50},

    # ============ GRANTS ============
    {"title": "Grants.gov — Federal grant portal", "kind": "support",
     "summary": "Search and apply for federal grants across every agency. Registration required to submit.",
     "source": "Federal", "url": "https://www.grants.gov/",
     "category": "grants", "pathways": ["build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["grants", "federal"], "priority": 40},
    {"title": "Candid — Nonprofit + grant research", "kind": "learn",
     "summary": "Free grant-writing courses and searchable grant database (some content behind a paywall).",
     "source": "Candid", "url": "https://candid.org/",
     "category": "grants", "pathways": ["build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["candid", "grants", "nonprofit"], "priority": 35},
    {"title": "Arkansas Economic Development Commission", "kind": "support",
     "summary": "State grants, incentives, and rural-community programs for businesses and startups.",
     "source": "State of Arkansas", "url": "https://www.arkansasedc.com/",
     "category": "grants", "pathways": ["build-future", "know-where"],
     "region": "arkansas", "disclaimer_type": "none",
     "tags": ["arkansas-edc", "state-grants", "economic-development"], "priority": 38},

    # ============ DIGITAL LIFE ============
    {"title": "GCFGlobal — Free tech basics for adults", "kind": "learn",
     "summary": "Free plain-language courses on email, internet, computer basics, Google, Microsoft, and more.",
     "source": "Goodwill / GCFLearnFree", "url": "https://edu.gcfglobal.org/",
     "category": "technology", "pathways": ["rebuild-life"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["gcf", "basics", "tech-literacy"], "priority": 45},
    {"title": "FTC Consumer Advice — Avoiding scams", "kind": "learn",
     "summary": "Practical guides on phishing, gift-card scams, IRS scams, romance scams, and how to report.",
     "source": "Federal Trade Commission", "url": "https://consumer.ftc.gov/scams",
     "category": "technology", "pathways": ["rebuild-life"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["ftc", "scams", "phishing"], "priority": 40},
    {"title": "DigitalLearn.org — Free digital literacy", "kind": "learn",
     "summary": "Short, plain-language classes from public libraries: computer basics, internet, email, video calls, jobs.",
     "source": "Public Library Association",
     "url": "https://www.digitallearn.org/",
     "category": "technology", "pathways": ["rebuild-life", "get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["digital-literacy", "library", "basics"], "priority": 44},
    {"title": "Northstar Digital Literacy — Self-check your skills", "kind": "learn",
     "summary": "Free self-assessments for basic computer, internet, email, Word, Excel, and social media skills.",
     "source": "Northstar Digital Literacy",
     "url": "https://www.digitalliteracyassessment.org/",
     "category": "technology", "pathways": ["rebuild-life", "get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["assessment", "digital-literacy", "self-check"], "priority": 38},
    {"title": "Google Digital Garage — Free courses & certificates", "kind": "learn",
     "summary": "Free bite-sized courses on productivity, digital marketing, remote work, and job-search skills.",
     "source": "Google",
     "url": "https://grow.google/certificates/",
     "category": "technology", "pathways": ["rebuild-life", "get-to-work", "build-future"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["google", "certificate", "coursera"], "priority": 42},
    {"title": "Microsoft Digital Literacy — Learning path", "kind": "learn",
     "summary": "Microsoft's free digital-literacy learning path: computers, apps, security, and Microsoft 365.",
     "source": "Microsoft Learn",
     "url": "https://www.microsoft.com/en-us/digital-literacy",
     "category": "technology", "pathways": ["rebuild-life", "get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["microsoft", "digital-literacy", "365"], "priority": 36},
    {"title": "Khan Academy — Computers and the internet", "kind": "learn",
     "summary": "Free, plain-language mini-course on how computers, the internet, and cybersecurity actually work.",
     "source": "Khan Academy",
     "url": "https://www.khanacademy.org/computing/computers-and-internet",
     "category": "technology", "pathways": ["rebuild-life"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["khan-academy", "computing", "internet"], "priority": 34},

    # ============ INTERNAL TOOLS as USE_TOOL cards ============
    {"title": "Full Path Forward Blueprint (30-question)", "kind": "tool",
     "summary": "Save-and-resume 30-question intake that generates your personalized strengths, priorities, and support map.",
     "source": "A Path Forward", "url": None, "tool_route": "/app/blueprint/intake",
     "category": "self-assessment", "pathways": ["get-organized"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["blueprint", "assessment", "in-app"], "priority": 90},
    {"title": "Strengths, Values & Interests Assessments", "kind": "tool",
     "summary": "Four short assessments that map to career direction and Employment Readiness gates.",
     "source": "A Path Forward", "url": None, "tool_route": "/app/assessments",
     "category": "self-assessment", "pathways": ["get-to-work", "rebuild-life"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["assessment", "in-app", "work-style"], "priority": 85},
    {"title": "Employment Readiness — real gated tracker", "kind": "tool",
     "summary": "Ten items with real completion gates — assessments, lessons, quizzes, evidence uploads.",
     "source": "A Path Forward", "url": None, "tool_route": "/app/section/employment-readiness",
     "category": "employment", "pathways": ["get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["ereadiness", "in-app", "gated"], "priority": 80},
    {"title": "Private Journal — voice or type", "kind": "tool",
     "summary": "A private journal only you can see. Type or dictate with Bridge AI's voice input.",
     "source": "A Path Forward", "url": None, "tool_route": "/app/journal",
     "category": "wellness", "pathways": ["get-healthy", "rebuild-life"],
     "region": "national", "disclaimer_type": "mental",
     "tags": ["journal", "in-app", "voice", "private"], "priority": 70},
    {"title": "Emergency Profile & QR Code", "kind": "tool",
     "summary": "Curate what an emergency contact sees when they scan your QR. You control every field.",
     "source": "A Path Forward", "url": None, "tool_route": "/app/emergency",
     "category": "emergency", "pathways": ["get-organized"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["emergency", "qr", "in-app"], "priority": 75},
    {"title": "Document Center — scan, store, share", "kind": "tool",
     "summary": "Scan and store IDs, court docs, benefits letters. Send with short-lived signed links.",
     "source": "A Path Forward", "url": None, "tool_route": "/app/section/documents",
     "category": "documents", "pathways": ["get-organized"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["documents", "in-app", "vault"], "priority": 78},
    {"title": "Digital Life Readiness — 12 doorways", "kind": "tool",
     "summary": "Email, spreadsheets, forms, passwords, video calls, uploads. Videos + copy-paste templates.",
     "source": "A Path Forward", "url": None, "tool_route": "/app/section/digital-readiness",
     "category": "technology", "pathways": ["rebuild-life", "get-to-work"],
     "region": "national", "disclaimer_type": "none",
     "tags": ["digital-readiness", "in-app"], "priority": 82},
]


# ---------- models ----------
class ResourceIn(BaseModel):
    title: str
    kind: str                  # learn | tool | support
    summary: str
    description: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    tool_route: Optional[str] = None
    category: Optional[str] = "community"
    pathways: list[str] = []
    region: Optional[str] = "national"
    audience: Optional[str] = None
    credential_pathway: bool = False
    disclaimer_type: Optional[str] = "none"
    tags: list[str] = []
    active: bool = True
    priority: Optional[int] = 0
    is_crisis: bool = False


class ResourcePatch(BaseModel):
    title: Optional[str] = None
    kind: Optional[str] = None
    summary: Optional[str] = None
    description: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    tool_route: Optional[str] = None
    category: Optional[str] = None
    pathways: Optional[list[str]] = None
    region: Optional[str] = None
    audience: Optional[str] = None
    credential_pathway: Optional[bool] = None
    disclaimer_type: Optional[str] = None
    tags: Optional[list[str]] = None
    active: Optional[bool] = None
    priority: Optional[int] = None
    is_crisis: Optional[bool] = None


def _shape(row: dict) -> dict:
    """Normalize an existing resource row so front-end always sees the new
    fields even for legacy rows. Falls back from `title` → `name` for very old
    seed rows so nothing renders blank."""
    return {
        "id": row.get("id"),
        "title": row.get("title") or row.get("name") or "Untitled resource",
        "kind": row.get("kind") or "support",
        "summary": row.get("summary") or row.get("description") or "",
        "description": row.get("description"),
        "source": row.get("source"),
        "url": row.get("url"),
        "tool_route": row.get("tool_route"),
        "category": row.get("category") or "community",
        "pathways": row.get("pathways") or [],
        "region": row.get("region") or "national",
        "audience": row.get("audience"),
        "credential_pathway": bool(row.get("credential_pathway", False)),
        "disclaimer_type": row.get("disclaimer_type") or "none",
        "tags": row.get("tags") or [],
        "active": row.get("active", True),
        "is_crisis": bool(row.get("is_crisis", False)),
        "priority": int(row.get("priority") or 0),
        "last_verified": row.get("last_verified"),
    }


async def _seed():
    """Idempotent seed — inserts each seed row only if a resource with the
    same title doesn't exist yet. Also promotes legacy rows to `is_crisis`
    when their tags/category match so the crisis rail is never empty."""
    inserted = 0
    for r in SEED_RESOURCES:
        existing = await db.resources.find_one({"title": r["title"]}, {"_id": 0, "id": 1})
        payload = {**r, "active": True, "last_verified": now_iso(), "updated_at": now_iso()}
        if existing:
            await db.resources.update_one(
                {"title": r["title"]},
                {"$set": {k: v for k, v in payload.items() if k not in ("title",)}},
            )
        else:
            payload["id"] = new_id("res_")
            payload["created_at"] = now_iso()
            await db.resources.insert_one(payload)
            inserted += 1
    logger.info(f"resources seed: inserted={inserted}, total_seed_rows={len(SEED_RESOURCES)}")


def register(_db, _api_router, _current_user, _require_role, _now_iso, _new_id, _audit_fn):
    global db, api_router, current_user, require_role, now_iso, new_id, _audit
    db = _db; api_router = _api_router; current_user = _current_user
    require_role = _require_role; now_iso = _now_iso; new_id = _new_id
    _audit = _audit_fn

    # Seed at import time (idempotent).
    import asyncio as _asyncio
    try:
        _asyncio.get_event_loop().create_task(_seed())
    except Exception:
        pass

    @api_router.get("/resources/pathways")
    async def list_pathways():
        return {"pathways": PATHWAY_META}

    @api_router.get("/resources")
    async def list_resources(
        q: Optional[str] = Query(default=None),
        kind: Optional[str] = Query(default=None),
        pathway: Optional[str] = Query(default=None),
        category: Optional[str] = Query(default=None),
        region: Optional[str] = Query(default=None),
        is_crisis: Optional[bool] = Query(default=None),
        limit: int = Query(default=100, le=500),
        user: dict = Depends(current_user),
    ):
        # Exclude legacy rows (no `kind` field) so nothing renders as a blank card.
        query = {"active": {"$ne": False}, "kind": {"$exists": True}}
        if kind and kind in KINDS: query["kind"] = kind
        if pathway and pathway in PATHWAYS: query["pathways"] = pathway
        if category: query["category"] = category
        if region and region in REGIONS: query["region"] = region
        if is_crisis is not None: query["is_crisis"] = bool(is_crisis)
        if q:
            rx = re.compile(re.escape(q.strip()), re.I)
            query["$or"] = [{"title": rx}, {"summary": rx}, {"tags": rx}, {"source": rx}]
        rows = await db.resources.find(query, {"_id": 0}).sort([("priority", -1)]).limit(limit).to_list(limit)
        saved = await db.saved_resources.find({"user_id": user["user_id"]}, {"_id": 0, "resource_id": 1}).to_list(1000)
        saved_ids = {s["resource_id"] for s in saved}
        return {"resources": [{**_shape(r), "saved": r.get("id") in saved_ids} for r in rows],
                "count": len(rows)}

    @api_router.get("/resources/saved")
    async def my_saved(user: dict = Depends(current_user)):
        saved = await db.saved_resources.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
        if not saved:
            return {"resources": []}
        ids = [s["resource_id"] for s in saved]
        rows = await db.resources.find({"id": {"$in": ids}, "active": {"$ne": False}}, {"_id": 0}).to_list(500)
        by_id = {r["id"]: r for r in rows}
        # preserve save order
        out = []
        for s in saved:
            r = by_id.get(s["resource_id"])
            if r: out.append({**_shape(r), "saved": True, "saved_at": s.get("created_at")})
        return {"resources": out}

    @api_router.get("/resources/{res_id}")
    async def get_resource(res_id: str, user: dict = Depends(current_user)):
        r = await db.resources.find_one({"id": res_id, "active": {"$ne": False}}, {"_id": 0})
        if not r: raise HTTPException(404, "Not found")
        s = await db.saved_resources.find_one({"user_id": user["user_id"], "resource_id": res_id}, {"_id": 0})
        return {**_shape(r), "saved": bool(s)}

    @api_router.post("/resources/{res_id}/save")
    async def save_resource(res_id: str, user: dict = Depends(current_user)):
        r = await db.resources.find_one({"id": res_id, "active": {"$ne": False}}, {"_id": 0})
        if not r: raise HTTPException(404, "Not found")
        await db.saved_resources.update_one(
            {"user_id": user["user_id"], "resource_id": res_id},
            {"$set": {"user_id": user["user_id"], "resource_id": res_id, "updated_at": now_iso()},
             "$setOnInsert": {"id": new_id("sr_"), "created_at": now_iso()}},
            upsert=True,
        )
        return {"ok": True, "saved": True}

    @api_router.delete("/resources/{res_id}/save")
    async def unsave_resource(res_id: str, user: dict = Depends(current_user)):
        await db.saved_resources.delete_one({"user_id": user["user_id"], "resource_id": res_id})
        return {"ok": True, "saved": False}

    # ---- Admin CRUD (super_admin / program_admin only) ----
    @api_router.post("/admin/resources")
    async def admin_create(body: ResourceIn,
                           user: dict = Depends(require_role("super_admin", "program_admin"))):
        if body.kind not in KINDS: raise HTTPException(400, "Invalid kind")
        if body.region and body.region not in REGIONS: raise HTTPException(400, "Invalid region")
        if body.disclaimer_type and body.disclaimer_type not in DISCLAIMERS: raise HTTPException(400, "Invalid disclaimer")
        for p in body.pathways:
            if p not in PATHWAYS: raise HTTPException(400, f"Invalid pathway: {p}")
        doc = {**body.model_dump(), "id": new_id("res_"),
               "created_at": now_iso(), "updated_at": now_iso(),
               "last_verified": now_iso(),
               "created_by": user["user_id"]}
        await db.resources.insert_one(doc)
        await _audit(user["user_id"], user.get("_effective_role"), None,
                     "resource.create", "resource", doc["id"], None, {"title": body.title})
        return _shape(doc)

    @api_router.patch("/admin/resources/{res_id}")
    async def admin_update(res_id: str, body: ResourcePatch,
                           user: dict = Depends(require_role("super_admin", "program_admin"))):
        cur = await db.resources.find_one({"id": res_id}, {"_id": 0})
        if not cur: raise HTTPException(404, "Not found")
        upd = {k: v for k, v in body.model_dump(exclude_none=True).items()}
        if "kind" in upd and upd["kind"] not in KINDS: raise HTTPException(400, "Invalid kind")
        if "region" in upd and upd["region"] not in REGIONS: raise HTTPException(400, "Invalid region")
        if "disclaimer_type" in upd and upd["disclaimer_type"] not in DISCLAIMERS: raise HTTPException(400, "Invalid disclaimer")
        upd["updated_at"] = now_iso()
        await db.resources.update_one({"id": res_id}, {"$set": upd})
        r = await db.resources.find_one({"id": res_id}, {"_id": 0})
        await _audit(user["user_id"], user.get("_effective_role"), None,
                     "resource.update", "resource", res_id, None, upd)
        return _shape(r)
