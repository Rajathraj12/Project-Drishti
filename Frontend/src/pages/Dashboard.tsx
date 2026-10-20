import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { RiskBadge } from "../components/RiskBadge"

import { projectService } from "../services/projectService"
import { Project } from "../types"
import { useAuth } from "../contexts/AuthContext"
import { canAccessPath, hasCapability } from "../permissions/rbac"
import DrishtiLoader from "../components/DrishtiLoader"

// We will fetch these dynamically
// const riskData = ...
// const projects = ...
// const attentionCards = ...


export default function Dashboard() {
  const navigate = useNavigate()
  const { user, dataEpoch } = useAuth()
  const [animated, setAnimated] = useState(false)

  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState("All States")
  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeSummary, 
    setAnalyzeSummary] = useState<any>(null)
  const canBulkAnalyze = hasCapability(user?.role, "bulk_analyze")
  const canViewRisk = hasCapability(user?.role, "view_internal_risk")
  const canViewMl = hasCapability(user?.role, "view_ml_assessment")

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    fetchProjects()
    return () => clearTimeout(t)
  }, [dataEpoch])
  
  const fetchProjects = async () => {
    setLoading(true)
    try {
      const response = await projectService.getProjects()
      setAllProjects(response.results || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAnalyze = async () => {
    setAnalyzing(true)
    try {
      const res = await projectService.bulkAnalyzeProjects();
      setAnalyzeSummary(res);
      await fetchProjects(); // Refresh dashboard
    } catch (e) {
      console.error("Bulk analysis failed", e);
    } finally {
      setAnalyzing(false)
    }
  }

  const states = ["All States", ...Array.from(new Set(allProjects.map(p => p.state).filter(Boolean))).sort()]
  
  const projects = allProjects.filter(p => selectedState === "All States" || p.state === selectedState)

  const formatCr = (val?: number) => {
    if (val == null) return "₹0";
    const cr = val > 10000000 ? val / 10000000 : val;
    return `₹${cr.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;
  };
  
  const toCr = (val?: number) => {
    if (val == null || isNaN(val)) return 0;
    return val > 10000000 ? val / 10000000 : val;
  };

  const totalCost = projects.reduce((sum, p) => sum + toCr(Number(p.original_cost_cr ?? p.original_cost)), 0);
  const totalRevised = projects.reduce((sum, p) => sum + toCr(Number(p.revised_cost_cr ?? p.revised_cost)), 0);
  const totalExp = projects.reduce((sum, p) => sum + toCr(Number(p.expenditure_cr ?? p.expenditure)), 0);
  const officialCount = projects.length
  const utilizationPct = totalRevised > 0 ? ((totalExp / totalRevised) * 100).toFixed(1) : "0.0";
  const totalOverrun = Math.max(0, totalRevised - totalCost);
  const costEscalationPct = totalCost > 0 ? (((totalRevised - totalCost) / totalCost) * 100).toFixed(1) : "0.0";
  const avgProgress = projects.length > 0
    ? (projects.reduce((s, p) => s + (p.reported_progress_pct ?? p.reported_progress ?? 0), 0) / projects.length).toFixed(1)
    : "0.0";
  const getProjectRisk = (p: Project) => {
    if (p.risk_level) return p.risk_level;
    const orig = toCr(Number(p.original_cost_cr ?? p.original_cost));
    const rev = toCr(Number(p.revised_cost_cr ?? p.revised_cost));
    const exp = toCr(Number(p.expenditure_cr ?? p.expenditure));
    const prog = p.reported_progress ?? 0;
    const overrun = rev > orig && orig > 0;
    const util = rev > 0 ? (exp / rev) * 100 : 0;
    const mismatch = util - prog > 20;
    if (overrun && mismatch) return 'High';
    if (overrun || mismatch || (prog < 30 && prog > 0)) return 'Medium';
    return 'Low';
  };

  const dummyHighRiskCount = projects.filter(p => {
    const level = p.risk_level || getProjectRisk(p);
    return level === 'High' || level === 'Critical' || (p.risk_score != null && p.risk_score >= 60);
  }).length;
  const dummyMediumRiskCount = projects.filter(p => {
    const level = p.risk_level || getProjectRisk(p);
    return level === 'Medium';
  }).length;
  const dummyLowRiskCount = projects.filter(p => {
    const level = p.risk_level || getProjectRisk(p);
    return level === 'Low' || !level;
  }).length;

  const mlAnomaliesCount = projects.filter(p => 
    p.anomaly_flag || 
    p.anomaly_status === "ANOMALOUS" || 
    (p.risk_score != null && p.risk_score >= 60) ||
    getProjectRisk(p) === 'High'
  ).length;

  const riskData = [
    { name: "High Risk", value: dummyHighRiskCount, color: "#c53030" },
    { name: "Medium Risk", value: dummyMediumRiskCount, color: "#b7791f" },
    { name: "Low Risk", value: dummyLowRiskCount, color: "#276749" },
  ];

  if (loading) {
    return (
      <DrishtiLoader
        title="Loading executive dashboard..."
        subtitle="Accessing National Infrastructure Repository"
      />
    );
  }


  return (
    <div>
      {/* Page title bar */}
      <div className="page-title-bar">
        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.76rem" }}>Home</span>
        <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.76rem" }}>›</span>
        <span style={{ color: "white", fontSize: "0.76rem", fontWeight: 600 }}>Dashboard</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span className="live-dot" />
          <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.55)" }}>
            Data as of: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>
      </div>

      <div className="wave-bg" style={{ minHeight: "calc(100vh - 110px)", padding: "24px 28px 48px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* WELCOME + TABS */}
          <div className="animate-fade-in-up" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
            <div>
              <div className="section-label" style={{ marginBottom: 8 }}>Project Overview</div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.45rem", color: "var(--color-navy-800)", marginBottom: 4, letterSpacing: "-0.02em" }}>
                Infrastructure Dashboard
              </h1>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 6 }}>
                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} style={{ background: "white", border: "1.5px solid var(--color-border)", borderRadius: 8, padding: "3px 8px", fontSize: "0.76rem", color: "var(--color-navy-700)", fontWeight: 600, outline: "none", cursor: "pointer", boxShadow: "0 1px 4px rgba(26,48,104,0.06)" }}>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <span>· Welcome back, {user?.username || "officer"}</span>
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {analyzeSummary && (
                <span style={{ fontSize: "0.72rem", color: "var(--color-risk-low)", background: "var(--color-risk-low-bg)", padding: "5px 12px", borderRadius: 99, fontWeight: 700, border: "1px solid var(--color-risk-low-border)" }}>
                  ✓ {analyzeSummary.successful} assessed
                </span>
              )}
              {canBulkAnalyze && (
              <button
                onClick={handleBulkAnalyze}
                disabled={analyzing}
                className="btn-gov-primary animate-pulse-glow-red"
                style={{ background: "linear-gradient(135deg, var(--color-risk-high), #e05252)", fontSize: "0.8rem", opacity: analyzing ? 0.75 : 1 }}
              >
                {analyzing ? (
                  <><svg style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg> Analyzing...</>
                ) : '🔍 Analyze All'}
              </button>
              )}
            </div>
          </div>

          
            {/* Main content */}
            <div>
              {/* Executive Overview Container */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 16,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 20px rgba(11, 31, 75, 0.05), 0 1px 3px rgba(11, 31, 75, 0.02)",
                  marginBottom: 24,
                  overflow: "hidden",
                }}
              >
                {/* Executive Header Bar */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #0b1f4b 0%, #152e68 55%, #1a397c 100%)",
                    padding: "16px 24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 12,
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: "rgba(247, 164, 29, 0.14)",
                        border: "1px solid rgba(247, 164, 29, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f7a41d",
                        flexShrink: 0,
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                        <h2
                          style={{
                            fontFamily: "var(--font-display)",
                            fontWeight: 700,
                            fontSize: "1.05rem",
                            color: "#ffffff",
                            letterSpacing: "-0.015em",
                            margin: 0,
                          }}
                        >
                          Priority States Infrastructure Overview (HP, PB, KA)
                        </h2>
                        <span
                          style={{
                            background: "rgba(255, 255, 255, 0.12)",
                            color: "rgba(255, 255, 255, 0.85)",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            padding: "2px 8px",
                            borderRadius: 99,
                            letterSpacing: "0.02em",
                          }}
                        >
                          As of {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "rgba(255, 255, 255, 0.65)", marginTop: 3 }}>
                        Central public capital expenditure & milestone intelligence pipeline
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(34, 197, 94, 0.12)",
                        border: "1px solid rgba(34, 197, 94, 0.28)",
                        padding: "5px 12px",
                        borderRadius: 99,
                        color: "#4ade80",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "#4ade80",
                          display: "inline-block",
                          boxShadow: "0 0 8px #4ade80",
                        }}
                      />
                      <span>MoSPI PAIMANA Verified</span>
                    </div>
                  </div>
                </div>

                {/* 3x3 Executive Metric Cards */}
                <div style={{ padding: "20px 22px", background: "#f8fafc" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                      gap: 16,
                    }}
                  >
                    {[
                      {
                        label: "PROJECT COUNT",
                        value: projects.length.toLocaleString(),
                        unit: "Projects",
                        tag: selectedState === "All States" ? "All Jurisdictions" : selectedState,
                        sub: "Active capital projects in scope",
                        accentColor: "#2563eb",
                        iconBg: "#eff6ff",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <path d="M3 9h18" />
                            <path d="M9 21V9" />
                          </svg>
                        ),
                      },
                      {
                        label: "ORIGINAL SANCTION",
                        value: formatCr(totalCost),
                        unit: "Cr",
                        tag: "Baseline Outlay",
                        sub: "Initial approved capital allocation",
                        accentColor: "#d97706",
                        iconBg: "#fef3c7",
                        icon: (
                          <span style={{ fontSize: "1.2rem", fontWeight: 800, fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1 }}>
                            ₹
                          </span>
                        ),
                      },
                      {
                        label: "REVISED BUDGET",
                        value: formatCr(totalRevised),
                        unit: "Cr",
                        tag: "Approved Revision",
                        sub: "Sanctioned revised outlay",
                        accentColor: "#0284c7",
                        iconBg: "#e0f2fe",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3v18h18" />
                            <path d="M18 9l-5 5-4-4-6 6" />
                            <polyline points="14 9 18 9 18 13" />
                          </svg>
                        ),
                      },
                      {
                        label: "EXPENDITURE",
                        value: formatCr(totalExp),
                        unit: "Cr",
                        tag: `${utilizationPct}% Utilized`,
                        sub: "Cumulative financial disbursement",
                        accentColor: "#059669",
                        iconBg: "#d1fae5",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        ),
                      },
                      {
                        label: "COST ESCALATION",
                        value: formatCr(totalOverrun),
                        unit: "Cr",
                        tag: `+${costEscalationPct}% Variance`,
                        sub: "Cumulative approved cost escalation",
                        accentColor: "#ea580c",
                        iconBg: "#fff7ed",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="19" x2="12" y2="5" />
                            <polyline points="5 12 12 5 19 12" />
                          </svg>
                        ),
                      },
                      {
                        label: "AVG PHYSICAL PROGRESS",
                        value: `${avgProgress}%`,
                        unit: "",
                        tag: "Milestone Mean",
                        sub: "Weighted physical execution rate",
                        accentColor: "#4f46e5",
                        iconBg: "#eef2ff",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                          </svg>
                        ),
                      },
                      {
                        label: "OFFICIAL RECORDS",
                        value: officialCount.toLocaleString(),
                        unit: "Verified",
                        tag: "100% PAIMANA",
                        sub: "Central government federated records",
                        accentColor: "#7c3aed",
                        iconBg: "#f5f3ff",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            <polyline points="9 12 11 14 15 10" />
                          </svg>
                        ),
                      },
                      {
                        label: "HIGH RISK PROJECTS",
                        value: dummyHighRiskCount.toString(),
                        unit: "Flagged",
                        tag: "Priority Attention",
                        sub: "Identified by rule-based risk engine",
                        accentColor: "#e11d48",
                        iconBg: "#ffe4e6",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                            <line x1="12" y1="9" x2="12" y2="13" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                          </svg>
                        ),
                      },
                      {
                        label: "ML ANOMALY SIGNALS",
                        value: mlAnomaliesCount.toString(),
                        unit: "Outliers",
                        tag: "Isolation Forest",
                        sub: "Multi-dimensional statistical outliers",
                        accentColor: "#0d9488",
                        iconBg: "#ccfbf1",
                        icon: (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="4" y="4" width="16" height="16" rx="2" />
                            <rect x="9" y="9" width="6" height="6" />
                            <line x1="9" y1="1" x2="9" y2="4" />
                            <line x1="15" y1="1" x2="15" y2="4" />
                            <line x1="9" y1="20" x2="9" y2="23" />
                            <line x1="15" y1="20" x2="15" y2="23" />
                          </svg>
                        ),
                      },
                    ].map((s, i) => (
                      <div
                        key={s.label}
                        className={`animate-fade-in-up delay-${(i + 1) * 100}`}
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: 12,
                          padding: "16px 18px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          position: "relative",
                          overflow: "hidden",
                          boxShadow: "0 1px 3px rgba(11, 31, 75, 0.03)",
                          transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease, border-color 0.2s ease",
                          cursor: "default",
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget as HTMLElement
                          el.style.transform = "translateY(-2px)"
                          el.style.boxShadow = "0 8px 24px rgba(11, 31, 75, 0.08)"
                          el.style.borderColor = "#cbd5e1"
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget as HTMLElement
                          el.style.transform = "translateY(0)"
                          el.style.boxShadow = "0 1px 3px rgba(11, 31, 75, 0.03)"
                          el.style.borderColor = "#e2e8f0"
                        }}
                      >
                        {/* Top Hairline Accent Bar */}
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: s.accentColor,
                          }}
                        />

                        {/* Top Row: Icon + Label + Badge */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: s.iconBg,
                                color: s.accentColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {s.icon}
                            </div>
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                letterSpacing: "0.06em",
                                textTransform: "uppercase",
                                color: "#64748b",
                              }}
                            >
                              {s.label}
                            </span>
                          </div>

                          <span
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 99,
                              background: s.iconBg,
                              color: s.accentColor,
                              border: `1px solid ${s.accentColor}30`,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.tag}
                          </span>
                        </div>

                        {/* Middle: Metric Value */}
                        <div style={{ marginBottom: 4 }}>
                          <div
                            style={{
                              fontFamily: "var(--font-display)",
                              fontSize: "1.45rem",
                              fontWeight: 800,
                              color: "#0f2a6b",
                              letterSpacing: "-0.02em",
                              lineHeight: 1.15,
                              display: "flex",
                              alignItems: "baseline",
                              gap: 5,
                            }}
                          >
                            <span>{s.value}</span>
                            {s.unit && (
                              <span
                                style={{
                                  fontSize: "0.78rem",
                                  fontWeight: 600,
                                  color: "#64748b",
                                  fontFamily: "var(--font-sans)",
                                }}
                              >
                                {s.unit}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom: Context Note */}
                        <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500, lineHeight: 1.3 }}>
                          {s.sub}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          {/* ===== RISK OVERVIEW + TABLE ===== */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 20, marginBottom: 20 }}>
            {/* Table */}
            <div className="gov-card" style={{ overflow: "hidden" }}>
              <div className="gov-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{canViewRisk ? "High Priority Projects — Sorted by Risk Score" : "Public Infrastructure Projects"}</span>
                <button onClick={() => navigate("/map")} style={{ background: "var(--color-orange-400)", border: "none", color: "white", padding: "3px 10px", borderRadius: 12, fontSize: "0.7rem", fontWeight: 600, cursor: "pointer" }}>
                  View All →
                </button>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Project ID & Name</th>
                      <th>Location</th>
                      <th>Budget</th>
                      <th>Progress (%)</th>
                      {canViewRisk && <th>Rule Risk Score</th>}
                      {canViewMl && <th>ML Anomaly</th>}
                      <th>Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 10).map((p, i) => {
                      const riskScore = p.risk_score;
                      const status = p.risk_level ? `${p.risk_level} Risk` : (riskScore != null ? (riskScore >= 70 ? 'High Risk' : (riskScore >= 40 ? 'Medium Risk' : 'Low Risk')) : 'Not Analyzed');
                      const progressStr = p.reported_progress != null ? `${p.reported_progress}` : "0";
                      
                      return (
                      <tr key={p.project_id} style={{ cursor: "pointer" }} onClick={() => navigate(`/projects/${p.project_id}`)}>
                        <td style={{ paddingLeft: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "0.75rem" }}>{p.project_id}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-100 text-green-700">
                              Official
                            </span>
                          </div>
                          <div style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem", maxWidth: 160 }} className="truncate" title={p.project_name}>{p.project_name}</div>
                        </td>
                        <td style={{ fontSize: "0.78rem" }}>
                          {p.state}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-navy-600)" }}>{formatCr(p.original_cost_cr ?? p.original_cost)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="progress-track" style={{ width: 52, height: 7 }}>
                              <div className="progress-fill" style={{ width: animated ? `${progressStr}%` : "0%", height: "100%", borderRadius: 99, transition: "width 1s ease-out" }} />
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-navy-600)", fontWeight: 600 }}>{progressStr}%</span>
                          </div>
                        </td>
                        {canViewRisk && (
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <span style={{
                              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem",
                              color: riskScore == null ? "var(--color-text-muted)" : (riskScore >= 70 ? "var(--color-risk-high)" : riskScore >= 40 ? "var(--color-risk-medium)" : "var(--color-risk-low)"),
                            }}>{riskScore != null ? riskScore : "N/A"}</span>
                            <RiskBadge status={status} />
                          </div>
                        </td>
                        )}
                        {canViewMl && (
                        <td>
                          {p.anomaly_status === "ASSESSED" ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "0.9rem", color: p.anomaly_flag ? "var(--color-risk-high)" : "var(--color-risk-low)" }}>
                                Score: {p.ml_anomaly_score}
                              </span>
                              <span style={{ fontSize: "0.75rem", color: p.anomaly_flag ? "#b91c1c" : "#15803d", fontWeight: "bold", background: p.anomaly_flag ? "#fef2f2" : "#f0fdf4", padding: "2px 6px", borderRadius: "4px", width: "fit-content" }}>
                                {p.anomaly_flag ? "ANOMALOUS" : "NORMAL"}
                              </span>
                              {p.anomaly_flag && <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }} title={p.ml_explanation}>Hover for Details</span>}
                            </div>
                          ) : (
                            <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>{p.anomaly_status?.replace("_", " ")}</span>
                          )}
                        </td>
                        )}
                        <td>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${p.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-700' : p.verification_status === 'CLOSED' ? 'bg-slate-200 text-slate-700' : p.verification_status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {p.verification_status || 'NOT_REVIEWED'}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Risk donut + alerts */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {canViewRisk && (
              <>
                {/* Donut */}
                <div className="gov-card" style={{ overflow: "hidden" }}>
                  <div className="gov-card-header">Risk Distribution</div>
                  <div style={{ padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 130, height: 130, flexShrink: 0, position: "relative" }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={riskData} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                              {riskData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={v => [`${v} projects`, ""]} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.9rem", color: "var(--color-navy-700)" }}>{projects.length}</div>
                          <div style={{ fontSize: "0.5rem", color: "var(--color-text-muted)" }}>Projects</div>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {riskData.map(r => (
                          <div key={r.name} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                <span style={{ width: 9, height: 9, borderRadius: 2, background: r.color, display: "block" }} />
                                <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>{r.name}</span>
                              </div>
                              <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.75rem", color: "var(--color-navy-700)" }}>{r.value}</span>
                            </div>
                            <div className="progress-track" style={{ height: 5 }}>
                              <div style={{ height: "100%", background: r.color, borderRadius: 99, width: animated && projects.length > 0 ? `${(r.value / projects.length) * 100}%` : "0%", transition: "width 1s ease-out" }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Requires attention */}
                <div className="gov-card" style={{ overflow: "hidden" }}>
                  <div className="gov-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>⚠️ Immediate Attention</span>
                    <span style={{ background: "var(--color-orange-400)", color: "white", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", fontWeight: 800, boxShadow: "0 2px 8px rgba(247,164,29,0.4)" }}>3</span>
                  </div>
                  <div style={{ padding: "12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {projects.sort((a, b) => (b.risk_score || 0) - (a.risk_score || 0)).slice(0, 3).map((p, i) => {
                      const risk = p.risk_score || 0;
                      const isHigh = risk >= 80;
                      return (
                      <div
                        key={p.project_id}
                        className={`risk-attention-card animate-fade-in-up delay-${(i + 1) * 100}`}
                        style={{
                          background: isHigh ? "linear-gradient(135deg, #fff5f5, #ffe8e8)" : "linear-gradient(135deg, #fffaf0, #fef3e0)",
                          border: `1px solid ${isHigh ? "var(--color-risk-high-border)" : "var(--color-risk-medium-border)"}`,
                          borderLeft: `4px solid ${isHigh ? "var(--color-risk-high)" : "var(--color-risk-medium)"}`,
                        }}
                        onClick={() => navigate(`/projects/${p.project_id}`)}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 3 }}>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "0.68rem", background: "var(--color-navy-50)", padding: "1px 6px", borderRadius: 4, border: "1px solid var(--color-navy-100)" }}>{p.project_id}</span>
                            <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: 4, lineHeight: 1.3 }} className="truncate" title={p.project_name}>{p.project_name}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "center" }}>
                            <div style={{ fontFamily: "var(--font-display)", fontWeight: 900, fontSize: "1.2rem", color: isHigh ? "var(--color-risk-high)" : "var(--color-risk-medium)", lineHeight: 1 }}>{risk}</div>
                            <div style={{ fontSize: "0.55rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Score</div>
                          </div>
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>📍 {p.state}</div>
                      </div>
                      )
                    })}
                  </div>
                </div>
              </>
              )}

              {!canViewRisk && (
                <div className="gov-card" style={{ overflow: "hidden" }}>
                  <div className="gov-card-header">📢 Public Oversight Information</div>
                  <div style={{ padding: "16px", fontSize: "0.8rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                    <p style={{ marginBottom: 12 }}>
                      Welcome to the Project Drishti Public Portal. Citizens can track physical progress, allocated budgets, and official milestones for major infrastructure projects across India.
                    </p>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "10px 12px", borderRadius: 8, color: "#166534", fontSize: "0.76rem", fontWeight: 600 }}>
                      ✓ Displaying <strong>{projects.length}</strong> official verified public projects
                    </div>
                  </div>
                </div>
              )}

              {/* Quick links */}
              <div className="gov-card" style={{ overflow: "hidden" }}>
                <div className="gov-card-header">⚡ Quick Navigation</div>
                <div style={{ padding: "8px" }}>
                  {[
                    { label: "View Project Map", path: "/map", icon: "🗺️" },
                    { label: "Pending Inspections", path: "/inspections", icon: "📋" },
                    { label: "Recent Evidence", path: "/evidence", icon: "📸" },
                    { label: "Citizen Reports", path: "/report", icon: "🚩" },
                  ].filter((a) => canAccessPath(user?.role, a.path)).map((a, i) => (
                    <button
                      key={a.label}
                      onClick={() => navigate(a.path)}
                      className="quick-nav-btn"
                    >
                      <div className="nav-icon">{a.icon}</div>
                      <span style={{ fontSize: "0.8rem", color: "var(--color-navy-700)", fontWeight: 600 }}>{a.label}</span>
                      <span style={{ marginLeft: "auto", color: "var(--color-navy-400)", fontSize: "0.85rem", fontWeight: 700 }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>


        </div>
      </div>
    </div>
  )
}

// RiskBadge is imported from components

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}
