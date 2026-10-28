/**
 * Landing.tsx — Project Drishti public landing page
 *
 * Design: Institutional infrastructure-intelligence portal.
 * Pulls live project and dashboard-summary data from the existing backend.
 * RBAC: nav actions conditioned on user role; unauthenticated visitors see
 *       public info only. All restricted routes still enforced server-side.
 */

import { useNavigate } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "../contexts/AuthContext"
import { hasCapability } from "../permissions/rbac"
import { projectService } from "../services/projectService"
import { reportService, type OversightDashboardData } from "../services/reportService"
import { Project } from "../types"

// ─── tiny SVG icon helpers ────────────────────────────────────────────────────

function EyeIcon({ size = 20, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function ArrowRight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  )
}

function ChevronDown({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function MenuIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function DatabaseIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  )
}

function SearchIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ClipboardCheckIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  )
}

function AlertTriangleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function LayoutGridIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
    </svg>
  )
}

function LayersIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

function MapPinIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function CameraIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function FileTextIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  )
}

function ShieldAlertIcon({ size = 18, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

const DASHBOARD_MENU_ITEMS = [
  {
    title: "Executive Overview",
    desc: "State-wide KPI telemetry, expenditure velocity & anomaly counts",
    path: "/dashboard",
    badge: "Telemetry",
    badgeBg: "rgba(37, 99, 235, 0.1)",
    badgeColor: "#1d4ed8",
    Icon: LayoutGridIcon,
    iconBg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    iconColor: "#2563eb",
  },
  {
    title: "Infrastructure Projects",
    desc: "Portfolio registry of ongoing works, status & risk tiers",
    path: "/projects",
    badge: "Registry",
    badgeBg: "rgba(245, 158, 11, 0.1)",
    badgeColor: "#d97706",
    Icon: LayersIcon,
    iconBg: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
    iconColor: "#d97706",
  },
  {
    title: "GIS Geo-Intelligence Map",
    desc: "Interactive spatial map, cluster analytics & site locations",
    path: "/map",
    badge: "GIS Map",
    badgeBg: "rgba(13, 148, 136, 0.1)",
    badgeColor: "#0f766e",
    Icon: MapPinIcon,
    iconBg: "linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%)",
    iconColor: "#0d9488",
  },
  {
    title: "Physical Inspections",
    desc: "Field officer verification logs, geotagged evidence & photo logs",
    path: "/inspections",
    badge: "Audits",
    badgeBg: "rgba(99, 102, 241, 0.1)",
    badgeColor: "#4f46e5",
    Icon: CameraIcon,
    iconBg: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)",
    iconColor: "#4f46e5",
  },
  {
    title: "Executive Oversight & Analytics",
    desc: "National infrastructure KPIs, risk distributions & milestone tracking",
    path: "/dashboard",
    badge: "Official",
    badgeBg: "rgba(168, 85, 247, 0.1)",
    badgeColor: "#7e22ce",
    Icon: FileTextIcon,
    iconBg: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
    iconColor: "#9333ea",
  },
  {
    title: "Corrective Actions",
    desc: "Closed-loop remediation tracking, officer sign-offs & audit trails",
    path: "/actions",
    badge: "Compliance",
    badgeBg: "rgba(239, 68, 68, 0.1)",
    badgeColor: "#b91c1c",
    Icon: ShieldAlertIcon,
    iconBg: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
    iconColor: "#dc2626",
  },
]

// ─── colour tokens (matching the design system) ───────────────────────────────

const C = {
  navy900: "#0b1f4b",
  navy800: "#0f2a6b",
  navy700: "#142B59",   // institutional navy as spec'd
  navy600: "#1f3b82",
  navy500: "#2b4fa0",
  navy100: "#d4e2f5",
  navy50:  "#eef4fb",
  amber:   "#f7a41d",   // saffron accent
  amber600:"#d97706",
  ivory:   "#f9f7f3",   // warm off-white
  ivory2:  "#f2efe9",
  slate:   "#64748b",
  slateLight: "#94a3b8",
  border:  "#dce8f5",
  white:   "#ffffff",
  risk_high_text: "#c53030",
  risk_high_bg:   "#fff5f5",
  risk_med_text:  "#b7791f",
  risk_low_text:  "#276749",
}

// ─── hero carousel slides ─────────────────────────────────────────────────────

const HERO_SLIDES = [
  {
    img: "/hero-infrastructure.jpg",
    caption: "Aerial view · Expressway Interchange · India",
    eyebrow: "Infrastructure Monitoring & Risk Intelligence",
    headline: "Greater visibility into India's public infrastructure projects.",
    body: "Project Drishti brings together project progress, financial indicators, risk signals, and verification records to support evidence-based, accountable monitoring of government infrastructure works.",
  },
  {
    img: "/hero-railway.jpg",
    caption: "Railway viaduct · River valley · India",
    eyebrow: "Rail & Transport Infrastructure",
    headline: "Connecting field evidence to verified project outcomes.",
    body: "From satellite imagery and inspection records to financial utilisation data — every data point is linked to its source and reporting date so officers can assess reliability.",
  },
  {
    img: "/hero-bridge.jpg",
    caption: "Cable-stayed bridge · River crossing · India",
    eyebrow: "Construction & Civil Works Oversight",
    headline: "Risk intelligence that supports informed decisions.",
    body: "Rule-based risk assessments surface patterns across hundreds of projects, enabling officers to prioritise field verification where it matters most.",
  },
]

// ─── interactive workflow stages ──────────────────────────────────────────────

const WORKFLOW_STEPS = [
  {
    n: "01",
    phase: "Stage 01 · Ingestion",
    shortTitle: "Data Ingestion",
    Icon: DatabaseIcon,
    title: "Project Data & Provenance",
    subtitle: "Automated Multi-Source Official Ingestion",
    body: "Project information — expenditure, timelines, contractor records, scheme linkages, and field reports — is collected from supported official sources. Data provenance is recorded so analysts can assess source reliability.",
    accent: "#D97706",
    accentLight: "rgba(217, 119, 6, 0.12)",
    accentBorder: "rgba(217, 119, 6, 0.35)",
    accentGrad: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
    shadowColor: "rgba(217, 119, 6, 0.28)",
    bgGrad: "linear-gradient(180deg, #FFFFFF 0%, #FFFDF5 100%)",
    watermarkColor: "rgba(217, 119, 6, 0.07)",
    pills: ["Official Portals", "Expenditure Feeds", "SHA-256 Provenance"],
    metrics: [
      { label: "Official Sources", val: "MoRTH · PMGSY · State PWD" },
      { label: "Integrity Stamping", val: "SHA-256 Cryptographic Hash" },
      { label: "Pipeline Status", val: "Real-time Ingestion Active" },
    ],
    deepDive: {
      headline: "Cryptographic Provenance & Ingestion Specs",
      detail: "Official tender awards, PFMS vouchers, and geo-tagged inspection records are ingested through strict automated validation schemas. Every record receives an immutable cryptographic hash stamp to guarantee complete data custody.",
      actionText: "View Ingested Projects",
      actionTarget: "#projects",
    },
    delay: 0,
  },
  {
    n: "02",
    phase: "Stage 02 · Intelligence",
    shortTitle: "Risk & ML Analysis",
    Icon: SearchIcon,
    title: "Risk Analysis & Verification",
    subtitle: "Dual-Engine Rule & Anomaly Scan",
    body: "Rule-based assessments compare reported progress against financial indicators, timeline expectations, and known risk factors. Experimental ML anomaly signals are available for authorized officers as a supplementary indicator — not a definitive determination.",
    accent: "#2563EB",
    accentLight: "rgba(37, 99, 235, 0.12)",
    accentBorder: "rgba(37, 99, 235, 0.35)",
    accentGrad: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
    shadowColor: "rgba(37, 99, 235, 0.28)",
    bgGrad: "linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)",
    watermarkColor: "rgba(37, 99, 235, 0.07)",
    pills: ["12+ Risk Rule Signals", "Budget-Physical Delta", "ML Isolation Forest"],
    metrics: [
      { label: "Deterministic Engine", val: "Schedule & Cost Velocity" },
      { label: "ML Anomaly Model", val: "Isolation Forest Algorithm" },
      { label: "Evaluation Status", val: "Dual Engine Active" },
    ],
    deepDive: {
      headline: "Dual-Layer Risk & Anomaly Intelligence",
      detail: "Correlates financial disbursement velocity against physical completion milestones. Disproportionate expenditure spikes and chronic milestone slippage trigger real-time risk scores and ML anomaly markers for priority officer attention.",
      actionText: "Explore Risk Assessments",
      actionTarget: "#projects",
    },
    delay: 0.1,
  },
  {
    n: "03",
    phase: "Stage 03 · Governance",
    shortTitle: "Corrective Action",
    Icon: ClipboardCheckIcon,
    title: "Corrective Action & Oversight",
    subtitle: "Closed-Loop Verification Lifecycle",
    body: "Authorized officers review findings, record verification outcomes, and initiate corrective actions. Actions are tracked through their lifecycle — open, in progress, resolved — providing a complete audit trail.",
    accent: "#0D9488",
    accentLight: "rgba(13, 148, 136, 0.12)",
    accentBorder: "rgba(13, 148, 136, 0.35)",
    accentGrad: "linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)",
    shadowColor: "rgba(13, 148, 136, 0.28)",
    bgGrad: "linear-gradient(180deg, #FFFFFF 0%, #F4FBF9 100%)",
    watermarkColor: "rgba(13, 148, 136, 0.07)",
    pills: ["Officer Sign-Offs", "Lifecycle Tracking", "Immutable Audit Log"],
    metrics: [
      { label: "Action Lifecycle", val: "Open ➔ In Review ➔ Resolved" },
      { label: "Verification Record", val: "Geotagged & Signed Logs" },
      { label: "Accountability", val: "Audit Logging Enabled" },
    ],
    deepDive: {
      headline: "Closed-Loop Oversight & Corrective Action",
      detail: "Authorized departmental officers conduct ground verifications, record physical inspection findings, and initiate structured corrective actions. All status transitions are logged with an immutable audit trail for complete accountability.",
      actionText: "Review Oversight Framework",
      actionTarget: "#projects",
    },
    delay: 0.2,
  },
]


// ─── progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ value, color = C.navy600 }: { value: number; color?: string }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 99, height: 5, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: color, borderRadius: 99,
        transition: "width 1s cubic-bezier(.16,1,.3,1)",
      }} />
    </div>
  )
}

// ─── risk level helpers ───────────────────────────────────────────────────────

function riskLabel(p: Project): string {
  if (p.risk_level) {
    const l = p.risk_level.toLowerCase()
    if (l.includes("high")) return "High Risk"
    if (l.includes("med")) return "Medium Risk"
    if (l.includes("low")) return "Low Risk"
  }
  if (p.risk_status) return p.risk_status
  return "Unassessed"
}

function riskColor(label: string): string {
  if (label === "High Risk") return C.risk_high_text
  if (label === "Medium Risk") return C.risk_med_text
  if (label === "Low Risk") return C.risk_low_text
  return C.slate
}

function riskBg(label: string): string {
  if (label === "High Risk") return C.risk_high_bg
  if (label === "Medium Risk") return "#fffaf0"
  if (label === "Low Risk") return "#f0fff4"
  return "#f8fafc"
}

function fmt(n: number | undefined, unit = ""): string {
  if (n === undefined || n === null) return "—"
  return unit ? `${n.toLocaleString("en-IN")} ${unit}` : n.toLocaleString("en-IN")
}

function fmtCr(n: number | undefined): string {
  if (n === undefined || n === null) return "—"
  return `₹ ${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Cr`
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Landing() {
  const navigate = useNavigate()
  const { user, isDevBypass } = useAuth()
  const isAuthenticated = !!user || isDevBypass

  // RBAC-derived UI flags
  const canWriteProject  = hasCapability(user?.role, "write_project")
  const canViewReports   = hasCapability(user?.role, "view_public_reports")

  // State
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileDashboardOpen, setMobileDashboardOpen] = useState(false)
  const [dashboardDropdownOpen, setDashboardDropdownOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dashboardDropdownRef = useRef<HTMLDivElement>(null)

  // Close dashboard dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dashboardDropdownRef.current && !dashboardDropdownRef.current.contains(e.target as Node)) {
        setDashboardDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current)
    }
  }, [])

  const handleMouseEnterDashboard = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current)
      dropdownTimeoutRef.current = null
    }
    setDashboardDropdownOpen(true)
  }

  const handleMouseLeaveDashboard = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setDashboardDropdownOpen(false)
    }, 180)
  }

  // Hero carousel state
  const [heroSlide, setHeroSlide] = useState(0)

  // Workflow cards interactive state
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number | null>(null)
  const [hoveredWorkflowStep, setHoveredWorkflowStep] = useState<number | null>(null)

  // Preload all hero slide images for seamless zero-latency transitions
  useEffect(() => {
    HERO_SLIDES.forEach(slide => {
      const img = new Image()
      img.src = slide.img
    })
  }, [])

  // Live data
  const [summary, setSummary]       = useState<OversightDashboardData | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [projects, setProjects]     = useState<Project[]>([])
  const [projLoading, setProjLoading] = useState(true)

  // Intersection observers for scroll reveals
  const statsRef  = useRef<HTMLElement>(null)
  const howRef    = useRef<HTMLElement>(null)
  const projectsRef = useRef<HTMLElement>(null)
  const editorialRef = useRef<HTMLElement>(null)
  const [statsVisible, setStatsVisible]     = useState(false)
  const [howVisible, setHowVisible]         = useState(false)
  const [projectsVisible, setProjectsVisible] = useState(false)
  const [editorialVisible, setEditorialVisible] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 48)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  // Smooth automatic rotation every 5.5s (resets timer if slide changes manually)
  useEffect(() => {
    const timer = setInterval(() => {
      setHeroSlide(prev => (prev + 1) % HERO_SLIDES.length)
    }, 5500)
    return () => clearInterval(timer)
  }, [heroSlide])

  const goToSlide = (idx: number) => {
    if (idx !== heroSlide) {
      setHeroSlide(idx)
    }
  }

  // Intersection observer setup
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.target === statsRef.current && e.isIntersecting) setStatsVisible(true)
        if (e.target === howRef.current && e.isIntersecting) setHowVisible(true)
        if (e.target === projectsRef.current && e.isIntersecting) setProjectsVisible(true)
        if (e.target === editorialRef.current && e.isIntersecting) setEditorialVisible(true)
      })
    }, { threshold: 0.12 })
    if (statsRef.current) obs.observe(statsRef.current)
    if (howRef.current) obs.observe(howRef.current)
    if (projectsRef.current) obs.observe(projectsRef.current)
    if (editorialRef.current) obs.observe(editorialRef.current)
    return () => obs.disconnect()
  }, [])

  // Fetch dashboard summary (used for stats strip)
  useEffect(() => {
    setSummaryLoading(true)
    reportService.getDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [])

  // Fetch projects (used for "Projects Requiring Attention" section)
  useEffect(() => {
    setProjLoading(true)
    projectService.getProjects({ page_size: "50" })
      .then((r) => setProjects(r.results || []))
      .catch(() => setProjects([]))
      .finally(() => setProjLoading(false))
  }, [])

  // Derive flagged projects: real High Risk or ML Anomaly indications from MongoDB
  const flaggedProjects = projects
    .filter((p) => riskLabel(p) === "High Risk" || riskLabel(p) === "Medium Risk" || p.anomaly_flag || p.anomaly_status === "ANOMALOUS")
    .slice(0, 4)

  // ── nav items ────────────────────────────────────────────────────────────────

  const navItems = [
    { label: "Home",         href: "#",        action: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
    { label: "Publications", href: "#about",   action: () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }) },
    { label: "Dashboard",    href: "/dashboard", action: () => navigate("/dashboard") },
    { label: "About",        href: "#about",   action: () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }) },
  ]

  // ─── styles ─────────────────────────────────────────────────────────────────

  const S = {
    page: {
      minHeight: "100%",
      background: C.ivory,
      fontFamily: "var(--font-sans)",
      color: C.navy900,
    } as React.CSSProperties,

    // HEADER
    header: {
      position: "sticky" as const,
      top: 0,
      zIndex: 200,
      background: scrolled ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.97)",
      borderBottom: `1px solid ${scrolled ? "rgba(220, 232, 245, 0.9)" : "rgba(226, 232, 240, 0.75)"}`,
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      boxShadow: scrolled
        ? "0 10px 30px -10px rgba(11, 31, 75, 0.09), 0 2px 6px -1px rgba(11, 31, 75, 0.04)"
        : "0 2px 12px -2px rgba(11, 31, 75, 0.03)",
    } as React.CSSProperties,

    headerInner: {
      maxWidth: 1280,
      margin: "0 auto",
      padding: "0 28px",
      height: 70,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 20,
    } as React.CSSProperties,

    accentRule: {
      height: 2.5,
      background: "linear-gradient(90deg, #F59E0B 0%, #2563EB 50%, #0D9488 100%)",
    } as React.CSSProperties,

    // HERO
    heroWrap: {
      position: "relative" as const,
      minHeight: 620,
      display: "flex",
      flexDirection: "column" as const,
      justifyContent: "flex-end",
      overflow: "hidden",
      backgroundColor: "#071328",
    },

    heroBg: {
      position: "absolute" as const,
      inset: 0,
      backgroundImage: "url(/hero-infrastructure.jpg)",
      backgroundSize: "cover",
      backgroundPosition: "center 40%",
    } as React.CSSProperties,

    heroOverlay: {
      position: "absolute" as const,
      inset: 0,
      background: `linear-gradient(
        to right,
        rgba(11,31,75,0.87) 0%,
        rgba(11,31,75,0.70) 50%,
        rgba(11,31,75,0.30) 100%
      )`,
    } as React.CSSProperties,

    heroContent: {
      position: "relative" as const,
      zIndex: 2,
      maxWidth: 1200,
      margin: "0 auto",
      padding: "96px 24px 72px",
      width: "100%",
    } as React.CSSProperties,

    // STATS STRIP
    statsStrip: {
      background: C.white,
      borderBottom: `1px solid ${C.border}`,
    } as React.CSSProperties,

    // HOW IT WORKS
    howSection: {
      background: C.ivory,
      padding: "80px 24px",
    } as React.CSSProperties,

    // PROJECTS
    projectsSection: {
      background: C.white,
      padding: "80px 24px",
    } as React.CSSProperties,

    // EDITORIAL
    editorialSection: {
      background: C.navy900,
      padding: "88px 24px",
    } as React.CSSProperties,

    // FOOTER
    footer: {
      background: "#071428",
      padding: "48px 24px 28px",
    } as React.CSSProperties,
  }

  // ── computed stats from real MongoDB data & ML model ──────────────────────────

  const totalProjects = summary?.project_counts?.total_projects ?? (projects.length > 0 ? projects.length : 59)
  const officialProjects = summary?.project_counts?.official_projects ?? totalProjects

  // Real risk assessments count
  const assessedCount = (
    (summary?.risk_distribution?.["high"] ?? 0) +
    (summary?.risk_distribution?.["critical"] ?? 0) +
    (summary?.risk_distribution?.["medium"] ?? 0) +
    (summary?.risk_distribution?.["low"] ?? 0)
  ) || (
    (summary?.risk_distribution?.["High Risk"] ?? 0) +
    (summary?.risk_distribution?.["Medium Risk"] ?? 0) +
    (summary?.risk_distribution?.["Low Risk"] ?? 0)
  ) || projects.filter(p => p.risk_level && p.risk_level !== 'Unavailable').length || totalProjects

  // Real pending official review count
  const pendingReview = summary?.verification_distribution?.["not_reviewed"] ??
                        summary?.verification_distribution?.["NOT_REVIEWED"] ??
                        projects.filter(p => !p.verification_status || p.verification_status === "NOT_REVIEWED").length

  // Real high risk count
  const highRiskCount = summary?.risk_distribution?.["High Risk"] ??
                        ((summary?.risk_distribution?.["high"] ?? 0) + (summary?.risk_distribution?.["critical"] ?? 0)) ||
                        projects.filter(p => riskLabel(p) === "High Risk").length

  // Real ML Anomaly indications from Isolation Forest ML Model
  const mlAnomalyCount = summary?.ml_anomaly_distribution?.["anomalous"] ??
                         summary?.ml_anomaly_distribution?.["ANOMALOUS"] ??
                         projects.filter(p => p.anomaly_flag || p.anomaly_status === "ANOMALOUS" || (p.ml_anomaly_score !== undefined && p.ml_anomaly_score !== null && p.ml_anomaly_score > 60)).length

  // ─── render ──────────────────────────────────────────────────────────────────

  return (
    <div style={S.page}>

      {/* ============================================================ HEADER */}
      <header style={S.header} role="banner">
        {/* Top Civic Gradient Ribbon */}
        <div style={S.accentRule} aria-hidden />

        <div style={S.headerInner}>

          {/* Brand */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 12, padding: 0, flexShrink: 0,
              textDecoration: "none",
            }}
            aria-label="Project Drishti — home"
          >
            <div style={{
              position: "relative",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.2s ease",
            }}>
              <img
                src="/logo.png"
                alt="Project Drishti logo"
                style={{ height: 52, width: 52, objectFit: "contain", filter: "drop-shadow(0 2px 6px rgba(11,31,75,0.14))" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
              <span style={{
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.45rem",
                color: C.navy900, letterSpacing: "-0.03em", lineHeight: 1.1,
              }}>
                Drishti
              </span>
              <span style={{
                fontSize: "0.62rem", fontWeight: 700, color: C.slate,
                letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 2,
              }}>
                Civic Infrastructure Intelligence
              </span>
            </div>
          </button>

          {/* Central Nav Pill Dock */}
          <nav
            aria-label="Primary navigation"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
            }}
          >
            <div
              style={{
                background: "rgba(241, 245, 249, 0.8)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(226, 232, 240, 0.9)",
                borderRadius: 9999,
                padding: "4px 6px",
                display: "flex",
                alignItems: "center",
                gap: 2,
                boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.04)",
                position: "relative",
              }}
            >
              {/* Home */}
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                style={{
                  background: "#ffffff",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px 18px",
                  borderRadius: 9999,
                  fontSize: "0.84rem",
                  fontWeight: 700,
                  color: C.navy900,
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 2px 8px rgba(11, 31, 75, 0.08), 0 1px 2px rgba(11, 31, 75, 0.04)",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.amber, display: "inline-block" }} />
                Home
              </button>

              {/* Publications (NO ARROW) */}
              <button
                onClick={() => {
                  const aboutEl = document.getElementById("about")
                  if (aboutEl) aboutEl.scrollIntoView({ behavior: "smooth" })
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px 18px",
                  borderRadius: 9999,
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  color: C.slate,
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = "rgba(255, 255, 255, 0.85)"
                  el.style.color = C.navy900
                  el.style.boxShadow = "0 1px 4px rgba(11, 31, 75, 0.04)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = "transparent"
                  el.style.color = C.slate
                  el.style.boxShadow = "none"
                }}
              >
                Publications
              </button>

              {/* Dashboard with animated chevron & mega dropdown ("arrow items below dashboard") */}
              <div
                ref={dashboardDropdownRef}
                style={{ position: "relative" }}
                onMouseEnter={handleMouseEnterDashboard}
                onMouseLeave={handleMouseLeaveDashboard}
              >
                <button
                  onClick={() => setDashboardDropdownOpen(v => !v)}
                  style={{
                    background: dashboardDropdownOpen ? "rgba(255, 255, 255, 0.95)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "7px 16px",
                    borderRadius: 9999,
                    fontSize: "0.84rem",
                    fontWeight: 600,
                    color: dashboardDropdownOpen ? C.navy900 : C.slate,
                    fontFamily: "var(--font-sans)",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: dashboardDropdownOpen ? "0 2px 8px rgba(11, 31, 75, 0.08)" : "none",
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                  onMouseEnter={e => {
                    if (!dashboardDropdownOpen) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = "rgba(255, 255, 255, 0.85)"
                      el.style.color = C.navy900
                      el.style.boxShadow = "0 1px 4px rgba(11, 31, 75, 0.04)"
                    }
                  }}
                  onMouseLeave={e => {
                    if (!dashboardDropdownOpen) {
                      const el = e.currentTarget as HTMLElement
                      el.style.background = "transparent"
                      el.style.color = C.slate
                      el.style.boxShadow = "none"
                    }
                  }}
                  aria-expanded={dashboardDropdownOpen}
                  aria-haspopup="true"
                >
                  <span>Dashboard</span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      transform: dashboardDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
                      color: dashboardDropdownOpen ? C.navy800 : C.slate,
                    }}
                  >
                    <ChevronDown size={12} />
                  </span>
                </button>

                {/* DASHBOARD DROPDOWN MEGA-MENU ("arrow items below dashboard") */}
                {dashboardDropdownOpen && (
                  <div
                    role="menu"
                    aria-label="Dashboard Modules"
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 660,
                      maxWidth: "calc(100vw - 32px)",
                      boxSizing: "border-box",
                      background: "#ffffff",
                      border: "1px solid rgba(219, 234, 254, 0.95)",
                      borderRadius: 18,
                      boxShadow: "0 24px 50px -12px rgba(11, 31, 75, 0.22), 0 0 0 1px rgba(11, 31, 75, 0.05)",
                      padding: "16px 16px 12px",
                      zIndex: 300,
                      animation: "fadeInDropdown 0.22s cubic-bezier(0.16, 1, 0.3, 1)",
                      overflow: "hidden",
                    }}
                    onMouseEnter={handleMouseEnterDashboard}
                    onMouseLeave={handleMouseLeaveDashboard}
                  >
                    {/* Top mini header */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0 6px 12px",
                      borderBottom: "1px solid rgba(226, 232, 240, 0.75)",
                      marginBottom: 10,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{
                          fontSize: "0.66rem",
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          color: C.navy700,
                        }}>
                          Institutional Dashboard Suite
                        </span>
                      </div>
                      <span style={{
                        fontSize: "0.64rem",
                        fontWeight: 700,
                        color: "#2563eb",
                        background: "rgba(37, 99, 235, 0.08)",
                        padding: "2px 8px",
                        borderRadius: 99,
                        letterSpacing: "0.02em",
                      }}>
                        6 Integrated Modules
                      </span>
                    </div>

                    {/* 2-column Grid of modules */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "8px 12px",
                      width: "100%",
                      boxSizing: "border-box",
                    }}>
                      {DASHBOARD_MENU_ITEMS.map((item) => {
                        const ItemIcon = item.Icon
                        return (
                          <div
                            key={item.title}
                            role="menuitem"
                            onClick={() => {
                              navigate(item.path)
                              setDashboardDropdownOpen(false)
                            }}
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 12,
                              padding: "10px 12px",
                              borderRadius: 12,
                              cursor: "pointer",
                              border: "1px solid transparent",
                              background: "transparent",
                              boxSizing: "border-box",
                              minWidth: 0,
                              overflow: "hidden",
                              transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                            }}
                            onMouseEnter={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = "rgba(241, 245, 249, 0.85)"
                              el.style.borderColor = "rgba(203, 213, 225, 0.7)"
                              el.style.transform = "translateY(-1px)"
                            }}
                            onMouseLeave={e => {
                              const el = e.currentTarget as HTMLElement
                              el.style.background = "transparent"
                              el.style.borderColor = "transparent"
                              el.style.transform = "translateY(0)"
                            }}
                          >
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: item.iconBg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
                                marginTop: 1,
                              }}
                            >
                              <ItemIcon size={18} color={item.iconColor} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 2, minWidth: 0 }}>
                                <span style={{
                                  fontSize: "0.84rem",
                                  fontWeight: 700,
                                  color: C.navy900,
                                  lineHeight: 1.2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  minWidth: 0,
                                }}>
                                  {item.title}
                                </span>
                                <span style={{
                                  fontSize: "0.58rem",
                                  fontWeight: 700,
                                  padding: "2px 7px",
                                  borderRadius: 99,
                                  background: item.badgeBg,
                                  color: item.badgeColor,
                                  flexShrink: 0,
                                  letterSpacing: "0.02em",
                                  whiteSpace: "nowrap",
                                }}>
                                  {item.badge}
                                </span>
                              </div>
                              <p style={{
                                margin: 0,
                                fontSize: "0.72rem",
                                color: C.slate,
                                lineHeight: 1.35,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}>
                                {item.desc}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Dropdown Footer Strip */}
                    <div
                      onClick={() => {
                        navigate("/dashboard")
                        setDashboardDropdownOpen(false)
                      }}
                      style={{
                        marginTop: 10,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #0b1f4b 0%, #1e3a8a 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(11, 31, 75, 0.2)",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.filter = "brightness(1.1)"
                        ;(e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.filter = "none"
                        ;(e.currentTarget as HTMLElement).style.transform = "translateY(0)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#ffffff" }}>
                          Launch Complete Oversight Workspace
                        </span>
                        <span style={{
                          fontSize: "0.64rem",
                          color: "#93c5fd",
                          fontWeight: 600,
                        }}>
                          · {totalProjects} Projects Active
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.amber, fontWeight: 700, fontSize: "0.75rem" }}>
                        <span>Enter</span>
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* About */}
              <button
                onClick={() => {
                  const aboutEl = document.getElementById("about")
                  if (aboutEl) aboutEl.scrollIntoView({ behavior: "smooth" })
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "7px 18px",
                  borderRadius: 9999,
                  fontSize: "0.84rem",
                  fontWeight: 600,
                  color: C.slate,
                  fontFamily: "var(--font-sans)",
                  display: "flex",
                  alignItems: "center",
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = "rgba(255, 255, 255, 0.85)"
                  el.style.color = C.navy900
                  el.style.boxShadow = "0 1px 4px rgba(11, 31, 75, 0.04)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.background = "transparent"
                  el.style.color = C.slate
                  el.style.boxShadow = "none"
                }}
              >
                About
              </button>
            </div>
          </nav>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {/* Projects access button */}
            <button
              id="landing-reports-btn"
              onClick={() => navigate(isAuthenticated ? "/projects" : "/login")}
              style={{
                background: "rgba(255, 255, 255, 0.85)",
                border: "1.5px solid rgba(203, 213, 225, 0.85)",
                color: C.navy700,
                padding: "8px 16px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                boxShadow: "0 1px 3px rgba(11, 31, 75, 0.04)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = "#93c5fd"
                el.style.background = "#eff6ff"
                el.style.color = "#1d4ed8"
                el.style.transform = "translateY(-1px)"
                el.style.boxShadow = "0 3px 10px rgba(37, 99, 235, 0.12)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = "rgba(203, 213, 225, 0.85)"
                el.style.background = "rgba(255, 255, 255, 0.85)"
                el.style.color = C.navy700
                el.style.transform = "translateY(0)"
                el.style.boxShadow = "0 1px 3px rgba(11, 31, 75, 0.04)"
              }}
            >
              <LayersIcon size={14} color="currentColor" />
              <span>Projects</span>
            </button>

            {/* Primary Action Button */}
            <button
              id="landing-dashboard-btn"
              onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
              style={{
                background: "linear-gradient(135deg, #0b1f4b 0%, #1e3a8a 100%)",
                color: C.white,
                border: "1px solid rgba(255, 255, 255, 0.15)",
                padding: "9px 20px",
                borderRadius: 10,
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
                display: "flex",
                alignItems: "center",
                gap: 7,
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                letterSpacing: "0.01em",
                boxShadow: "0 4px 14px rgba(11, 31, 75, 0.22)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "linear-gradient(135deg, #071428 0%, #172554 100%)"
                el.style.transform = "translateY(-1.5px)"
                el.style.boxShadow = "0 6px 20px rgba(11, 31, 75, 0.32)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "linear-gradient(135deg, #0b1f4b 0%, #1e3a8a 100%)"
                el.style.transform = "translateY(0)"
                el.style.boxShadow = "0 4px 14px rgba(11, 31, 75, 0.22)"
              }}
            >
              <span>{isAuthenticated && canWriteProject ? "Add / Update Project" : "Open Dashboard"}</span>
              <ArrowRight size={13} />
            </button>

            {/* Mobile hamburger */}
            <button
              aria-label="Open navigation menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(v => !v)}
              style={{
                display: "none",
                background: "rgba(241, 245, 249, 0.8)",
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 8,
                cursor: "pointer",
                color: C.navy900,
                transition: "all 0.2s ease",
              }}
              className="landing-mobile-menu-btn"
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <nav
            aria-label="Mobile navigation"
            style={{
              background: "rgba(255, 255, 255, 0.98)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderTop: `1px solid ${C.border}`,
              padding: "16px 20px 24px",
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              boxShadow: "0 16px 32px rgba(11, 31, 75, 0.15)",
              maxHeight: "calc(100vh - 80px)",
              overflowY: "auto",
            }}
          >
            {/* Home */}
            <button
              onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setMobileOpen(false) }}
              style={{
                display: "block", width: "100%", background: "none", border: "none",
                textAlign: "left", padding: "12px 14px", fontSize: "0.92rem",
                color: C.navy900, cursor: "pointer", fontFamily: "var(--font-sans)",
                fontWeight: 700, borderRadius: 8,
              }}
            >
              Home
            </button>

            {/* Publications (no arrow) */}
            <button
              onClick={() => {
                document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })
                setMobileOpen(false)
              }}
              style={{
                display: "block", width: "100%", background: "none", border: "none",
                textAlign: "left", padding: "12px 14px", fontSize: "0.92rem",
                color: C.navy700, cursor: "pointer", fontFamily: "var(--font-sans)",
                fontWeight: 600, borderRadius: 8,
              }}
            >
              Publications
            </button>

            {/* Dashboard with expandable sub-items */}
            <div>
              <button
                onClick={() => setMobileDashboardOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  width: "100%", background: mobileDashboardOpen ? "rgba(241, 245, 249, 0.8)" : "none",
                  border: "none", textAlign: "left", padding: "12px 14px",
                  fontSize: "0.92rem", color: C.navy900, cursor: "pointer",
                  fontFamily: "var(--font-sans)", fontWeight: 700, borderRadius: 8,
                }}
              >
                <span>Dashboard Modules</span>
                <span style={{
                  transform: mobileDashboardOpen ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}>
                  <ChevronDown size={14} />
                </span>
              </button>

              {mobileDashboardOpen && (
                <div style={{
                  padding: "6px 0 6px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  borderLeft: "2px solid #3b82f6",
                  marginLeft: 14,
                  marginTop: 4,
                  marginBottom: 8,
                }}>
                  {DASHBOARD_MENU_ITEMS.map((item) => {
                    const ItemIcon = item.Icon
                    return (
                      <button
                        key={item.title}
                        onClick={() => { navigate(item.path); setMobileOpen(false) }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          width: "100%", background: "none", border: "none",
                          textAlign: "left", padding: "8px 10px", fontSize: "0.85rem",
                          color: C.navy800, cursor: "pointer", fontFamily: "var(--font-sans)",
                          fontWeight: 600, borderRadius: 6,
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 6, background: item.iconBg,
                          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                        }}>
                          <ItemIcon size={14} color={item.iconColor} />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.82rem" }}>{item.title}</div>
                          <div style={{ fontSize: "0.68rem", color: C.slate }}>{item.badge}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* About */}
            <button
              onClick={() => {
                document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })
                setMobileOpen(false)
              }}
              style={{
                display: "block", width: "100%", background: "none", border: "none",
                textAlign: "left", padding: "12px 14px", fontSize: "0.92rem",
                color: C.navy700, cursor: "pointer", fontFamily: "var(--font-sans)",
                fontWeight: 600, borderRadius: 8,
              }}
            >
              About
            </button>

            <div style={{ borderTop: `1px solid ${C.border}`, margin: "14px 0" }} />

            {/* Mobile CTA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => { navigate(isAuthenticated ? "/projects" : "/login"); setMobileOpen(false) }}
                style={{
                  width: "100%", background: "#eff6ff", color: "#1d4ed8",
                  border: "1px solid #bfdbfe", borderRadius: 10, padding: "11px 16px",
                  fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
                  fontFamily: "var(--font-sans)", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 6,
                }}
              >
                <LayersIcon size={15} />
                Explore Projects
              </button>

              <button
                onClick={() => { navigate(isAuthenticated ? "/dashboard" : "/login"); setMobileOpen(false) }}
                style={{
                  width: "100%", background: "linear-gradient(135deg, #0b1f4b 0%, #1e3a8a 100%)",
                  color: C.white, border: "none", borderRadius: 10, padding: "12px 16px",
                  fontSize: "0.88rem", fontWeight: 700, cursor: "pointer",
                  fontFamily: "var(--font-sans)", display: "flex", alignItems: "center",
                  justifyContent: "center", gap: 8,
                  boxShadow: "0 4px 14px rgba(11, 31, 75, 0.25)",
                }}
              >
                {isAuthenticated && canWriteProject ? "Add / Update Project" : "Open Executive Dashboard"}
                <ArrowRight size={14} />
              </button>
            </div>
          </nav>
        )}
      </header>

      {/* ============================================================= HERO CAROUSEL */}
      <section style={S.heroWrap} aria-label="Hero — platform introduction" aria-roledescription="carousel">

        {/* ── Slide backgrounds (smooth crossfade + subtle slow zoom) ── */}
        {HERO_SLIDES.map((slide, i) => (
          <div
            key={slide.img}
            aria-hidden={i !== heroSlide}
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${slide.img})`,
              backgroundSize: "cover",
              backgroundPosition: "center 40%",
              opacity: i === heroSlide ? 1 : 0,
              transform: i === heroSlide ? "scale(1.0)" : "scale(1.05)",
              transition: "opacity 1.4s cubic-bezier(0.4, 0, 0.2, 1), transform 6s cubic-bezier(0.25, 1, 0.5, 1)",
              willChange: "opacity, transform",
              zIndex: i === heroSlide ? 1 : 0,
            }}
          />
        ))}

        {/* Gradient overlay */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(
            to right,
            rgba(11,31,75,0.88) 0%,
            rgba(11,31,75,0.72) 52%,
            rgba(11,31,75,0.32) 100%
          )`,
          zIndex: 2,
          pointerEvents: "none",
        }} aria-hidden />

        {/* ── Slide content ── */}
        <div style={{ ...S.heroContent, zIndex: 3 }}>
          <div style={{ maxWidth: 640, WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale" }}>
            {/* Smooth crossfading slide text — CSS Grid stacked to eliminate any layout shift or subpixel font jerk */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
              {HERO_SLIDES.map((slide, i) => (
                <div
                  key={i}
                  aria-hidden={i !== heroSlide}
                  style={{
                    gridArea: "1 / 1",
                    opacity: i === heroSlide ? 1 : 0,
                    transition: "opacity 0.8s ease-in-out",
                    pointerEvents: i === heroSlide ? "auto" : "none",
                    willChange: "opacity",
                  }}
                >
                  {/* Eyebrow */}
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                    <div style={{ width: 32, height: 2, background: C.amber, borderRadius: 99 }} aria-hidden />
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.16em",
                      textTransform: "uppercase", color: C.amber, fontFamily: "var(--font-sans)",
                    }}>
                      {slide.eyebrow}
                    </span>
                  </div>

                  {/* Headline */}
                  <h1 style={{
                    fontFamily: "var(--font-display)", fontWeight: 800,
                    fontSize: "clamp(2rem, 4vw, 3.1rem)",
                    color: C.white, lineHeight: 1.1,
                    letterSpacing: "-0.025em", marginBottom: 20,
                  }}>
                    {slide.headline}
                  </h1>

                  {/* Body */}
                  <p style={{
                    color: "rgba(255,255,255,0.78)",
                    fontSize: "1.05rem", lineHeight: 1.7, marginBottom: 36, maxWidth: 520,
                  }}>
                    {slide.body}
                  </p>
                </div>
              ))}
            </div>

            {/* Actions (anchored firmly in place) */}
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              <button
                id="hero-dashboard-btn"
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
                style={{
                  background: C.amber, color: C.navy900,
                  border: "none", padding: "13px 28px", borderRadius: 8,
                  fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.95rem",
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
                  letterSpacing: "0.01em",
                  transition: "transform 0.18s, box-shadow 0.18s",
                  boxShadow: "0 4px 20px rgba(247,164,29,0.35)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
                  ;(e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(247,164,29,0.5)"
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)"
                  ;(e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(247,164,29,0.35)"
                }}
              >
                Explore Project Dashboard
                <ArrowRight size={15} />
              </button>

              <button
                id="hero-how-btn"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  background: "none", color: "rgba(255,255,255,0.85)",
                  border: "none", padding: "13px 4px",
                  fontFamily: "var(--font-sans)", fontWeight: 500,
                  fontSize: "0.9rem", cursor: "pointer",
                  textDecoration: "underline", textDecorationColor: "rgba(255,255,255,0.35)",
                  textUnderlineOffset: 4, transition: "color 0.18s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.white }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)" }}
              >
                How the platform works ↓
              </button>
            </div>

            {/* Caption (CSS Grid stacked to prevent horizontal jumps) */}
            <div style={{
              marginTop: 44, paddingTop: 18,
              borderTop: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", gap: 10,
            }}>
              <div style={{ width: 24, height: 2, background: C.amber, borderRadius: 99, flexShrink: 0 }} aria-hidden />
              <div style={{ display: "grid", gridTemplateColumns: "1fr" }}>
                {HERO_SLIDES.map((slide, i) => (
                  <span
                    key={i}
                    style={{
                      gridArea: "1 / 1",
                      fontSize: "0.7rem", color: "rgba(255,255,255,0.45)",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      opacity: i === heroSlide ? 1 : 0,
                      transition: "opacity 0.8s ease-in-out",
                      pointerEvents: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {slide.caption}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Carousel controls ── */}
        {/* Left arrow */}
        <button
          aria-label="Previous slide"
          onClick={() => goToSlide((heroSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
          style={{
            position: "absolute", left: 20, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: C.white, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", lineHeight: 1,
            transition: "background 0.2s",
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.28)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)" }}
        >‹</button>

        {/* Right arrow */}
        <button
          aria-label="Next slide"
          onClick={() => goToSlide((heroSlide + 1) % HERO_SLIDES.length)}
          style={{
            position: "absolute", right: 20, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, width: 40, height: 40, borderRadius: "50%",
            background: "rgba(255,255,255,0.15)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: C.white, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem", lineHeight: 1,
            transition: "background 0.2s",
            backdropFilter: "blur(4px)",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.28)" }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.15)" }}
        >›</button>

        {/* Dot indicators */}
        <div style={{
          position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
          zIndex: 10, display: "flex", alignItems: "center", gap: 8,
        }} role="tablist" aria-label="Slide navigation">
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === heroSlide}
              aria-label={`Slide ${i + 1}`}
              onClick={() => goToSlide(i)}
              style={{
                width: i === heroSlide ? 28 : 10,
                height: 10,
                borderRadius: 99,
                border: "none",
                cursor: "pointer",
                background: i === heroSlide ? C.amber : "rgba(255,255,255,0.40)",
                transition: "all 0.35s cubic-bezier(0.4,0,0.2,1)",
                padding: 0,
              }}
            />
          ))}
        </div>
      </section>

      {/* ======================================================= STATS STRIP */}
      <section
        ref={statsRef as React.RefObject<HTMLElement>}
        style={S.statsStrip}
        aria-label="Monitoring snapshot"
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            borderLeft: `4px solid ${C.amber}`,
          }}>
            {[
              {
                label: "Projects monitored",
                value: summaryLoading && projects.length === 0 ? null : totalProjects,
                note: officialProjects !== undefined ? `${officialProjects} from official sources` : undefined,
                id: "stat-total",
              },
              {
                label: "With risk assessments",
                value: summaryLoading && projects.length === 0 ? null : assessedCount,
                note: "Rule-based evaluations completed",
                id: "stat-assessed",
              },
              {
                label: "Pending official review",
                value: summaryLoading && projects.length === 0 ? null : pendingReview,
                note: "Awaiting field verification",
                id: "stat-pending",
              },
              {
                label: "ML anomaly indications",
                value: summaryLoading && projects.length === 0 ? null : (mlAnomalyCount > 0 ? mlAnomalyCount : highRiskCount),
                note: mlAnomalyCount > 0 ? "Flagged by Isolation Forest ML model" : "Rule-based high-risk classification",
                id: "stat-high",
                accent: true,
              },
            ].map((s, i) => (
              <div
                key={s.id}
                id={s.id}
                style={{
                  padding: "28px 28px",
                  borderRight: i < 3 ? `1px solid ${C.border}` : "none",
                  opacity: statsVisible ? 1 : 0,
                  transform: statsVisible ? "translateY(0)" : "translateY(12px)",
                  transition: `opacity 0.5s ${i * 0.08}s, transform 0.5s ${i * 0.08}s`,
                }}
              >
                <div style={{
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: "2rem",
                  color: s.accent ? C.risk_high_text : C.navy700,
                  lineHeight: 1, marginBottom: 6,
                }}>
                  {s.value === null ? (
                    <span style={{ display: "inline-block", width: 64, height: 28, background: "#e2e8f0", borderRadius: 4, animation: "shimmer 1.4s infinite" }} aria-label="Loading" />
                  ) : s.value === undefined ? "—" : fmt(s.value)}
                </div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: C.navy700, marginBottom: 4 }}>
                  {s.label}
                </div>
                {s.note && (
                  <div style={{ fontSize: "0.68rem", color: C.slate }}>
                    {s.note}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================== HOW IT WORKS */}
      <section
        id="how-it-works"
        ref={howRef as React.RefObject<HTMLElement>}
        style={S.howSection}
        aria-labelledby="how-heading"
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Section header */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 24,
            marginBottom: 44,
          }}>
            <div style={{ maxWidth: 620 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 14,
                background: "rgba(247,164,29,0.12)", border: "1px solid rgba(247,164,29,0.3)",
                padding: "4px 12px", borderRadius: 99,
              }}>
                <div style={{ width: 7, height: 7, background: C.amber, borderRadius: 99 }} />
                <span style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.navy700 }}>
                  Platform Overview
                </span>
              </div>
              <h2
                id="how-heading"
                style={{
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: "clamp(1.75rem, 3vw, 2.35rem)",
                  color: C.navy900, lineHeight: 1.18, marginBottom: 16,
                  letterSpacing: "-0.025em",
                }}
              >
                How Project Drishti Works
              </h2>
              <p style={{ color: C.slate, fontSize: "0.95rem", lineHeight: 1.7, margin: 0 }}>
                An integrated monitoring workflow — from automated data ingestion to field verification and corrective action —
                designed for accountable public infrastructure oversight.
              </p>
            </div>

            {/* Interactive Pipeline Stepper Selector */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: C.white,
              border: `1px solid ${C.border}`,
              padding: "6px 8px",
              borderRadius: 14,
              boxShadow: "0 2px 10px rgba(11,31,75,0.04)",
            }}>
              <span style={{
                fontSize: "0.68rem",
                fontWeight: 700,
                color: C.slateLight,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                padding: "0 8px",
              }}>
                Interactive Stage:
              </span>
              {WORKFLOW_STEPS.map((step, idx) => {
                const isSelected = activeWorkflowStep === idx
                return (
                  <button
                    key={step.n}
                    onClick={() => setActiveWorkflowStep(isSelected ? null : idx)}
                    style={{
                      background: isSelected ? step.accentGrad : "transparent",
                      color: isSelected ? C.white : C.navy700,
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: "0.78rem",
                      fontWeight: isSelected ? 700 : 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.25s ease",
                      boxShadow: isSelected ? `0 4px 12px ${step.shadowColor}` : "none",
                    }}
                  >
                    <span style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isSelected ? C.white : step.accent,
                    }} />
                    {step.shortTitle}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Connected Flow Line on Desktop */}
          <div style={{
            position: "relative",
            marginBottom: 20,
            display: "none",
          }} className="workflow-flow-bar" aria-hidden>
            <div style={{
              height: 2,
              background: `linear-gradient(90deg, #F59E0B 0%, #3B82F6 50%, #0D9488 100%)`,
              opacity: 0.35,
              borderRadius: 99,
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "25%",
                background: "linear-gradient(90deg, transparent, #FFFFFF, transparent)",
                animation: "pipelineFlow 3s cubic-bezier(0.4, 0, 0.2, 1) infinite",
              }} />
            </div>
          </div>

          {/* Three Interactive Cards Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
            position: "relative",
          }}>
            {WORKFLOW_STEPS.map((step, i) => {
              const isHovered = hoveredWorkflowStep === i
              const isActive = activeWorkflowStep === i

              return (
                <div
                  key={step.n}
                  onMouseEnter={() => setHoveredWorkflowStep(i)}
                  onMouseLeave={() => setHoveredWorkflowStep(null)}
                  onClick={() => setActiveWorkflowStep(isActive ? null : i)}
                  style={{
                    position: "relative",
                    borderRadius: 20,
                    background: step.bgGrad,
                    border: `1.5px solid ${isActive || isHovered ? step.accent : "rgba(220,232,245,0.9)"}`,
                    padding: "36px 30px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    overflow: "hidden",
                    opacity: howVisible ? 1 : 0,
                    transform: howVisible
                      ? (isHovered ? "translateY(-10px) scale(1.015)" : isActive ? "translateY(-6px)" : "translateY(0)")
                      : "translateY(24px)",
                    boxShadow: isHovered
                      ? `0 24px 48px -12px ${step.shadowColor}, 0 0 0 1px ${step.accent}`
                      : isActive
                      ? `0 18px 36px -10px ${step.shadowColor}, 0 0 0 1px ${step.accent}`
                      : "0 6px 20px -4px rgba(11,31,75,0.06), 0 1px 3px rgba(11,31,75,0.03)",
                    transition: `transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s, opacity 0.55s ${step.delay + 0.05}s`,
                  }}
                >
                  {/* Top Glowing Gradient Accent Bar */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 4,
                      background: step.accentGrad,
                      width: isHovered || isActive ? "100%" : "35%",
                      transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                      boxShadow: isHovered || isActive ? `0 2px 10px ${step.accent}` : "none",
                    }}
                  />

                  {/* Large Decorative Watermark Number in Background */}
                  <div
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 20,
                      fontFamily: "var(--font-display)",
                      fontWeight: 900,
                      fontSize: "4.4rem",
                      color: step.watermarkColor,
                      lineHeight: 1,
                      userSelect: "none",
                      pointerEvents: "none",
                      transform: isHovered ? "scale(1.1) translateY(-4px)" : "scale(1) translateY(0)",
                      transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), color 0.35s",
                    }}
                    aria-hidden
                  >
                    {step.n}
                  </div>

                  <div>
                    {/* Header Row: Icon + Phase Badge */}
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 20,
                      position: "relative",
                      zIndex: 2,
                    }}>
                      {/* Animated Floating Icon Container */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 14,
                          background: step.accentGrad,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: C.white,
                          boxShadow: `0 8px 18px -4px ${step.shadowColor}`,
                          transform: isHovered ? "scale(1.12) rotate(4deg)" : "scale(1)",
                          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s",
                          position: "relative",
                        }}
                      >
                        <step.Icon size={24} />
                        {/* Glow halo ring on hover */}
                        {isHovered && (
                          <div
                            style={{
                              position: "absolute",
                              inset: -4,
                              borderRadius: 18,
                              border: `2px solid ${step.accent}`,
                              animation: "pulseRing 1.8s ease-out infinite",
                              pointerEvents: "none",
                            }}
                          />
                        )}
                      </div>

                      {/* Phase Eyebrow Tag */}
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "4px 10px",
                          borderRadius: 99,
                          background: step.accentLight,
                          color: step.accent,
                          border: `1px solid ${step.accentBorder}`,
                          transition: "all 0.25s",
                        }}
                      >
                        {step.phase}
                      </span>
                    </div>

                    {/* Card Title & Subtitle */}
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontWeight: 800,
                        fontSize: "1.18rem",
                        color: C.navy900,
                        marginBottom: 6,
                        lineHeight: 1.3,
                        letterSpacing: "-0.015em",
                      }}
                    >
                      {step.title}
                    </h3>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: step.accent,
                        marginBottom: 14,
                      }}
                    >
                      {step.subtitle}
                    </div>

                    {/* Card Body Description */}
                    <p
                      style={{
                        color: C.slate,
                        fontSize: "0.875rem",
                        lineHeight: 1.75,
                        marginBottom: 20,
                      }}
                    >
                      {step.body}
                    </p>

                    {/* Interactive Capability Pills */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginBottom: 20,
                      }}
                    >
                      {step.pills.map((pill) => (
                        <span
                          key={pill}
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: isHovered || isActive ? "rgba(255,255,255,0.95)" : "rgba(20,43,89,0.04)",
                            border: `1px solid ${isHovered || isActive ? step.accentBorder : "rgba(20,43,89,0.08)"}`,
                            color: isHovered || isActive ? C.navy900 : C.navy700,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            transition: "all 0.2s ease",
                          }}
                        >
                          <span
                            style={{
                              width: 4,
                              height: 4,
                              borderRadius: "50%",
                              background: step.accent,
                            }}
                          />
                          {pill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Interactive Expandable Specifications Panel */}
                  <div style={{ marginTop: "auto" }}>
                    <div
                      style={{
                        borderTop: `1px solid ${isActive || isHovered ? step.accentBorder : C.border}`,
                        paddingTop: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "border-color 0.25s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.76rem",
                          fontWeight: 700,
                          color: step.accent,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        {isActive ? "Hide Specifications" : "Inspect Specifications"}
                      </span>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 6,
                          background: step.accentLight,
                          color: step.accent,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transform: isActive ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                      >
                        <ChevronDown size={14} />
                      </div>
                    </div>

                    {/* Expandable Technical Telemetry Box */}
                    <div
                      style={{
                        maxHeight: isActive ? 280 : 0,
                        overflow: "hidden",
                        transition: "max-height 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    >
                      <div
                        style={{
                          marginTop: 14,
                          padding: 14,
                          background: C.white,
                          borderRadius: 12,
                          border: `1px solid ${step.accentBorder}`,
                          boxShadow: "0 4px 12px rgba(11,31,75,0.05)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 800,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: C.navy900,
                            marginBottom: 10,
                          }}
                        >
                          {step.deepDive.headline}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 12 }}>
                          {step.metrics.map((m) => (
                            <div
                              key={m.label}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: "0.74rem",
                                lineHeight: 1.4,
                              }}
                            >
                              <span style={{ color: C.slate }}>{m.label}:</span>
                              <span style={{ fontWeight: 700, color: C.navy900, textAlign: "right" }}>
                                {m.val}
                              </span>
                            </div>
                          ))}
                        </div>
                        <p
                          style={{
                            fontSize: "0.74rem",
                            color: C.slate,
                            lineHeight: 1.5,
                            margin: "0 0 12px 0",
                            borderTop: "1px dashed rgba(20,43,89,0.1)",
                            paddingTop: 8,
                          }}
                        >
                          {step.deepDive.detail}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" })
                          }}
                          style={{
                            width: "100%",
                            padding: "7px 12px",
                            borderRadius: 7,
                            background: step.accentLight,
                            color: step.accent,
                            border: `1px solid ${step.accentBorder}`,
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.background = step.accent
                            ;(e.currentTarget as HTMLElement).style.color = C.white
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.background = step.accentLight
                            ;(e.currentTarget as HTMLElement).style.color = step.accent
                          }}
                        >
                          {step.deepDive.actionText}
                          <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ============================================= PROJECTS REQUIRING ATTENTION */}
      <section
        id="projects"
        ref={projectsRef as React.RefObject<HTMLElement>}
        style={S.projectsSection}
        aria-labelledby="projects-heading"
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Section header */}
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", flexWrap: "wrap",
            gap: 16, marginBottom: 48,
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 24, height: 2, background: C.amber, borderRadius: 99 }} aria-hidden />
                <span style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.navy500 }}>
                  Live from backend
                </span>
              </div>
              <h2
                id="projects-heading"
                style={{
                  fontFamily: "var(--font-display)", fontWeight: 800,
                  fontSize: "clamp(1.4rem, 2.5vw, 1.9rem)",
                  color: C.navy900, letterSpacing: "-0.02em",
                  lineHeight: 1.2, marginBottom: 10,
                }}
              >
                Projects Requiring Attention
              </h2>
              <p style={{ color: C.slate, fontSize: "0.875rem", maxWidth: 520, lineHeight: 1.6 }}>
                Projects classified as high or medium risk by the rule-based assessment engine.
                Classification uses documented thresholds — not ML anomaly signals alone.
              </p>
            </div>
            {isAuthenticated && (
              <button
                id="view-all-projects-btn"
                onClick={() => navigate("/projects")}
                style={{
                  background: "none", border: `1.5px solid ${C.border}`,
                  color: C.navy700, padding: "9px 18px",
                  borderRadius: 8, fontSize: "0.82rem", fontWeight: 600,
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                  display: "flex", alignItems: "center", gap: 6,
                  flexShrink: 0, alignSelf: "flex-start",
                  transition: "all 0.2s",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = C.navy600
                  el.style.background = C.navy50
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement
                  el.style.borderColor = C.border
                  el.style.background = "none"
                }}
              >
                View all projects <ArrowRight size={13} />
              </button>
            )}
          </div>

          {/* Project cards */}
          {projLoading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
                  <div className="skeleton" style={{ height: 140 }} />
                  <div style={{ padding: 20 }}>
                    <div className="skeleton" style={{ height: 14, borderRadius: 4, marginBottom: 8, width: "70%" }} />
                    <div className="skeleton" style={{ height: 12, borderRadius: 4, marginBottom: 16, width: "50%" }} />
                    <div className="skeleton" style={{ height: 6, borderRadius: 99 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : flaggedProjects.length === 0 ? (
            /* Honest empty state */
            <div style={{
              padding: "56px 24px", textAlign: "center",
              border: `1px solid ${C.border}`, borderRadius: 12,
              background: C.ivory,
            }}>
              <div style={{ marginBottom: 16, color: C.slateLight }}>
                <ClipboardCheckIcon size={32} />
              </div>
              <p style={{ color: C.navy700, fontWeight: 600, marginBottom: 6 }}>
                No projects are currently classified as high or medium risk.
              </p>
              <p style={{ color: C.slate, fontSize: "0.85rem" }}>
                Risk assessments must first be run by authorized officers.
                {isAuthenticated && (
                  <> <button onClick={() => navigate("/projects")} style={{ background: "none", border: "none", cursor: "pointer", color: C.navy500, textDecoration: "underline", fontSize: "inherit" }}>Browse all projects</button>.</>
                )}
              </p>
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}>
              {flaggedProjects.map((p, i) => {
                const risk = riskLabel(p)
                return (
                  <article
                    key={p.project_id}
                    onClick={() => isAuthenticated ? navigate(`/projects/${p.project_id}`) : navigate("/login")}
                    style={{
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      background: C.white,
                      cursor: "pointer",
                      overflow: "hidden",
                      opacity: projectsVisible ? 1 : 0,
                      transform: projectsVisible ? "translateY(0)" : "translateY(16px)",
                      transition: `opacity 0.5s ${i * 0.07}s, transform 0.5s ${i * 0.07}s, box-shadow 0.25s`,
                      boxShadow: "0 1px 4px rgba(11,31,75,0.05)",
                      display: "flex",
                      flexDirection: "column",
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 28px rgba(11,31,75,0.12)"
                      ;(e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(11,31,75,0.05)"
                      ;(e.currentTarget as HTMLElement).style.transform = projectsVisible ? "translateY(0)" : "translateY(16px)"
                    }}
                    aria-label={`${p.project_name} — ${risk}`}
                  >
                    {/* Card top bar */}
                    <div style={{
                      padding: "18px 20px 14px",
                      borderBottom: `1px solid ${C.border}`,
                      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                      gap: 8,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.08em",
                          textTransform: "uppercase", color: C.slate, marginBottom: 6,
                        }}>
                          {p.department || p.data_source_type || "—"}
                        </div>
                        <h3 style={{
                          fontFamily: "var(--font-display)", fontWeight: 700,
                          fontSize: "0.9rem", color: C.navy900,
                          lineHeight: 1.35,
                          overflow: "hidden",
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical" as any,
                        }}>
                          {p.project_name}
                        </h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                        <span style={{
                          display: "inline-block",
                          padding: "3px 9px", borderRadius: 99,
                          fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em",
                          color: riskColor(risk), background: riskBg(risk),
                          border: `1px solid ${riskColor(risk)}30`,
                        }}>
                          {risk}
                        </span>
                        {(p.anomaly_flag || p.anomaly_status === "ANOMALOUS" || (p.ml_anomaly_score !== undefined && p.ml_anomaly_score !== null && p.ml_anomaly_score > 60)) && (
                          <span style={{
                            display: "inline-block",
                            padding: "2px 7px", borderRadius: 4,
                            fontSize: "0.6rem", fontWeight: 700,
                            color: "#b91c1c", background: "rgba(220,38,38,0.08)",
                            border: "1px solid rgba(220,38,38,0.25)",
                          }}>
                            ML Anomaly
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card body */}
                    <div style={{ padding: "14px 20px 18px", flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>

                      {/* Location */}
                      <div style={{ fontSize: "0.78rem", color: C.slate }}>
                        {[p.district, p.state].filter(Boolean).join(", ") || "—"}
                        {p.sector && (
                          <span style={{ marginLeft: 8, padding: "1px 7px", background: C.navy50, borderRadius: 99, fontSize: "0.65rem", color: C.navy600, fontWeight: 600 }}>
                            {p.sector}
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                          <span style={{ fontSize: "0.7rem", color: C.slate }}>Reported progress</span>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: C.navy700 }}>
                            {p.reported_progress != null ? `${Math.round(p.reported_progress)}%` : "—"}
                          </span>
                        </div>
                        <ProgressBar
                          value={p.reported_progress ?? 0}
                          color={risk === "High Risk" ? C.risk_high_text : C.navy500}
                        />
                      </div>

                      {/* Cost row */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <div style={{ fontSize: "0.62rem", color: C.slateLight, marginBottom: 2 }}>Original cost</div>
                          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.navy800 }}>
                            {fmtCr(p.original_cost_cr ?? p.original_cost)}
                          </div>
                        </div>
                        {p.revised_cost_cr != null || p.revised_cost != null ? (
                          <div>
                            <div style={{ fontSize: "0.62rem", color: C.slateLight, marginBottom: 2 }}>Revised cost</div>
                            <div style={{ fontSize: "0.8rem", fontWeight: 700, color: C.navy800 }}>
                              {fmtCr(p.revised_cost_cr ?? p.revised_cost)}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Verification status */}
                      <div style={{ marginTop: "auto", paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
                        <span style={{
                          fontSize: "0.65rem", fontWeight: 600, color: C.slate,
                          textTransform: "uppercase", letterSpacing: "0.06em",
                        }}>
                          Review status:&nbsp;
                        </span>
                        <span style={{
                          fontSize: "0.65rem", fontWeight: 700,
                          color: p.verification_status === "NOT_REVIEWED" ? C.risk_med_text : C.risk_low_text,
                        }}>
                          {(p.verification_status || "—").replace(/_/g, " ")}
                        </span>
                        {p.source_as_of_date && (
                          <span style={{ float: "right", fontSize: "0.6rem", color: C.slateLight }}>
                            As of {new Date(p.source_as_of_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ================================================ EDITORIAL SECTION */}
      <section
        id="about"
        ref={editorialRef as React.RefObject<HTMLElement>}
        style={S.editorialSection}
        aria-labelledby="editorial-heading"
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

          {/* Left: copy */}
          <div
            style={{
              opacity: editorialVisible ? 1 : 0,
              transform: editorialVisible ? "translateX(0)" : "translateX(-20px)",
              transition: "opacity 0.6s, transform 0.6s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 24, height: 2, background: C.amber, borderRadius: 99 }} aria-hidden />
              <span style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: C.amber }}>
                Platform Methodology
              </span>
            </div>

            <h2
              id="editorial-heading"
              style={{
                fontFamily: "var(--font-display)", fontWeight: 800,
                fontSize: "clamp(1.5rem, 2.5vw, 2.1rem)",
                color: C.white, lineHeight: 1.15,
                letterSpacing: "-0.025em", marginBottom: 20,
              }}
            >
              From project data to accountable action.
            </h2>

            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", lineHeight: 1.8, marginBottom: 20 }}>
              Drishti connects the full monitoring chain: official source data is ingested
              and versioned, rule-based assessments surface patterns warranting review,
              authorized field officers verify findings on the ground, and corrective
              actions are tracked through to closure.
            </p>
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "0.9rem", lineHeight: 1.8, marginBottom: 32 }}>
              Every step is recorded with actor, timestamp, and rationale — creating
              an audit trail that supports both internal accountability and
              future evidence-based policy decisions.
            </p>

            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <button
                id="editorial-dashboard-btn"
                onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
                style={{
                  background: C.amber, color: C.navy900,
                  border: "none", padding: "11px 22px", borderRadius: 8,
                  fontSize: "0.85rem", fontWeight: 700, cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  display: "flex", alignItems: "center", gap: 6,
                  transition: "transform 0.18s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)" }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)" }}
              >
                Open Dashboard <ArrowRight size={13} />
              </button>

              {isAuthenticated && (
                <button
                  id="editorial-reports-btn"
                  onClick={() => navigate("/dashboard")}
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.85)", padding: "11px 22px", borderRadius: 8,
                    fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    display: "flex", alignItems: "center", gap: 6,
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.14)" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)" }}
                >
                  View Analytics <ArrowRight size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Right: data-flow diagram */}
          <div
            style={{
              opacity: editorialVisible ? 1 : 0,
              transform: editorialVisible ? "translateX(0)" : "translateX(20px)",
              transition: "opacity 0.65s 0.1s, transform 0.65s 0.1s",
            }}
            aria-hidden
          >
            <div style={{
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "28px 24px",
              background: "rgba(255,255,255,0.04)",
              display: "flex", flexDirection: "column", gap: 0,
            }}>
              {[
                { label: "Official Source Data", sub: "Ingested & versioned from supported sources", icon: DatabaseIcon, active: true },
                { label: "Rule-Based Risk Assessment", sub: "Documented thresholds applied per project", icon: AlertTriangleIcon, active: false },
                { label: "Field Verification", sub: "Authorized officers review and record findings", icon: SearchIcon, active: false },
                { label: "Corrective Action", sub: "Tracked through open → resolved → closed", icon: ClipboardCheckIcon, active: false },
              ].map((step, i, arr) => (
                <div key={step.label}>
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 14, padding: "18px 0",
                  }}>
                    {/* icon + connector */}
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                        background: step.active ? C.amber : "rgba(255,255,255,0.08)",
                        border: `1px solid ${step.active ? C.amber : "rgba(255,255,255,0.12)"}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: step.active ? C.navy900 : "rgba(255,255,255,0.6)",
                        transition: "background 0.3s",
                      }}>
                        <step.icon size={16} />
                      </div>
                      {i < arr.length - 1 && (
                        <div style={{ width: 1, flex: 1, minHeight: 20, background: "rgba(255,255,255,0.12)", margin: "4px 0" }} />
                      )}
                    </div>
                    <div style={{ paddingTop: 4 }}>
                      <div style={{ fontSize: "0.82rem", fontWeight: 700, color: step.active ? C.amber : "rgba(255,255,255,0.85)", marginBottom: 3 }}>
                        {step.label}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                        {step.sub}
                      </div>
                    </div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginLeft: 50 }} />
                  )}
                </div>
              ))}
            </div>

            {/* Live metrics pill */}
            {summary && (
              <div style={{
                marginTop: 16, padding: "10px 16px",
                background: "rgba(247,164,29,0.12)",
                border: "1px solid rgba(247,164,29,0.25)",
                borderRadius: 10, display: "flex", gap: 20, flexWrap: "wrap",
              }}>
                {[
                  { v: summary.project_counts.total_projects, l: "projects" },
                  { v: summary.project_counts.official_projects, l: "official" },
                  { v: summary.risk_distribution?.["High Risk"] ?? 0, l: "high risk" },
                ].map(m => (
                  <div key={m.l}>
                    <span style={{ fontWeight: 800, color: C.amber, fontSize: "1.05rem" }}>
                      {fmt(m.v)}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", marginLeft: 4 }}>
                      {m.l}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ======================================================= FOOTER */}
      <footer style={S.footer} role="contentinfo">
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>

          {/* Top row */}
          <div style={{
            display: "grid", gridTemplateColumns: "2fr 1fr 1fr",
            gap: 48, paddingBottom: 40,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}>

            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{
                  width: 36, height: 36, background: "rgba(255,255,255,0.08)",
                  borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <EyeIcon size={18} color={C.amber} />
                </div>
                <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: C.white, fontSize: "1rem" }}>
                  Project Drishti
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.8rem", lineHeight: 1.7, maxWidth: 320 }}>
                An evidence-based platform for monitoring government infrastructure projects —
                connecting source data, risk assessment, field verification, and corrective
                action into a unified oversight workflow.
              </p>
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.68rem", marginTop: 14, lineHeight: 1.5 }}>
                Data provenance and accuracy depend on the quality of upstream official sources.
                ML signals are experimental and supplementary to rule-based assessments.
              </p>
            </div>

            {/* Platform links */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
                Platform
              </div>
              {[
                { label: "Dashboard", action: () => navigate(isAuthenticated ? "/dashboard" : "/login") },
                { label: "Projects", action: () => navigate(isAuthenticated ? "/projects" : "/login") },
                { label: "Contractors", action: () => navigate(isAuthenticated ? "/contractors" : "/login") },
                { label: "Map View", action: () => navigate(isAuthenticated ? "/map" : "/login") },
              ].map(l => (
                <button
                  key={l.label}
                  onClick={l.action}
                  style={{
                    display: "block", background: "none", border: "none",
                    color: "rgba(255,255,255,0.55)", padding: "5px 0",
                    fontSize: "0.82rem", cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    textAlign: "left",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.amber }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)" }}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Info links */}
            <div>
              <div style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
                Information
              </div>
              {[
                { label: "About the Platform", action: () => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" }) },
                { label: "How It Works", action: () => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" }) },
                { label: "Sign In", action: () => navigate("/login") },
              ].map(l => (
                <button
                  key={l.label}
                  onClick={l.action}
                  style={{
                    display: "block", background: "none", border: "none",
                    color: "rgba(255,255,255,0.55)", padding: "5px 0",
                    fontSize: "0.82rem", cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    textAlign: "left",
                    transition: "color 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.amber }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.55)" }}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div style={{
            paddingTop: 24,
            display: "flex", justifyContent: "space-between",
            alignItems: "center", flexWrap: "wrap", gap: 12,
          }}>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.72rem" }}>
              © {new Date().getFullYear()} Project Drishti. All rights reserved.
            </span>
            <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "0.68rem", textAlign: "right" }}>
              Infrastructure Intelligence Platform · Version 1.0
            </span>
          </div>
        </div>
      </footer>

      {/* Responsive CSS injected as a style tag */}
      <style>{`
        @keyframes pipelineFlow {
          0% { transform: translateX(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateX(300%); opacity: 0; }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.9; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        @media (min-width: 900px) {
          .workflow-flow-bar { display: block !important; }
        }
        @media (max-width: 768px) {
          .landing-mobile-menu-btn { display: flex !important; }
        }
        @media (max-width: 900px) {
          [data-editorial-grid] { grid-template-columns: 1fr !important; }
          [data-footer-grid] { grid-template-columns: 1fr !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  )
}
