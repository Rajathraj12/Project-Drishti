import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { RiskBadge } from "../components/RiskBadge"

import { projectService } from "../services/projectService"
import { Project } from "../types"

// We will fetch these dynamically
// const riskData = ...
// const projects = ...
// const attentionCards = ...


export default function Dashboard() {
  const navigate = useNavigate()
  const [animated, setAnimated] = useState(false)
  const [activeTab, setActiveTab] = useState<"ministry" | "sector">("ministry")

  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedState, setSelectedState] = useState("All States")

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    
    const fetchProjects = async () => {
      try {
        const response = await projectService.getProjects()
        setAllProjects(response.results || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchProjects()

    return () => clearTimeout(t)
  }, [])

  const states = ["All States", ...Array.from(new Set(allProjects.map(p => p.state).filter(Boolean))).sort()]
  
  const projects = allProjects.filter(p => selectedState === "All States" || p.state === selectedState)

  const formatCr = (val?: number) => val != null ? `₹${(val / 10000000).toLocaleString('en-IN', {maximumFractionDigits: 0})}` : "₹0"
  
  const totalCost = projects.reduce((sum, p) => sum + (p.original_cost || 0), 0)
  const totalRevised = projects.reduce((sum, p) => sum + (p.revised_cost || 0), 0)
  const totalExp = projects.reduce((sum, p) => sum + (p.expenditure || 0), 0)
  const officialCount = projects.filter(p => p.data_source_type === 'OFFICIAL').length
  const syntheticCount = projects.filter(p => p.data_source_type === 'SYNTHETIC_DEMO').length

  const dummyHighRiskCount = Math.floor(projects.length * 0.15)
  const dummyMediumRiskCount = Math.floor(projects.length * 0.40)
  const dummyLowRiskCount = projects.length - dummyHighRiskCount - dummyMediumRiskCount

  const riskData = [
    { name: "High Risk", value: dummyHighRiskCount, color: "#c53030" },
    { name: "Medium Risk", value: dummyMediumRiskCount, color: "#b7791f" },
    { name: "Low Risk", value: dummyLowRiskCount, color: "#276749" },
  ]


  return (
    <div>
      {/* Page title bar */}
      <div style={{ background: "var(--color-navy-700)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem" }}>Home</span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>›</span>
        <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 600 }}>Dashboard</span>
        <div style={{ marginLeft: "auto", fontSize: "0.72rem", color: "rgba(255,255,255,0.6)" }}>
          Data as of: {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>

      <div className="wave-bg" style={{ minHeight: "calc(100vh - 108px)", padding: "24px 24px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>

          {/* ===== WELCOME + TABS ===== */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--color-navy-700)", marginBottom: 2 }}>
                Project Overview Dashboard
              </h1>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
                <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} style={{ background: "transparent", border: "1px solid var(--color-border)", borderRadius: 4, padding: "2px 4px", fontSize: "0.75rem", color: "var(--color-navy-700)", fontWeight: 600, marginRight: 8, outline: "none" }}>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                · Welcome, Rajath
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setActiveTab("ministry")}
                className={`btn-gov-${activeTab === "ministry" ? "primary" : "outline"}`}
                style={{ padding: "7px 16px", fontSize: "0.78rem", borderRadius: 4 }}
              >
                Ministry-Wise
              </button>
              <button
                onClick={() => setActiveTab("sector")}
                className={`btn-gov-${activeTab === "sector" ? "primary" : "outline"}`}
                style={{ padding: "7px 16px", fontSize: "0.78rem", borderRadius: 4 }}
              >
                Sector-Wise
              </button>
            </div>
          </div>

          
            {/* Main content */}
            <div>
              {/* Department header card */}
              <div className="gov-card" style={{ marginBottom: 20, overflow: "hidden" }}>
                <div className="gov-card-header">
                  Priority States Infrastructure Overview (HP, PB, KA){" "}
                  <span style={{ opacity: 0.7, fontSize: "0.78rem", fontWeight: 400 }}>
                    (as of {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })})
                  </span>
                </div>
                <div style={{ padding: "20px 20px 16px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                    {[
                      { icon: "📋", label: "Project Count (No.)", value: projects.length.toLocaleString(), info: true },
                      { icon: "💰", label: "Original Cost (in Cr.)", value: formatCr(totalCost), info: true },
                      { icon: "📊", label: "Latest Revised Cost (in Cr.)", value: formatCr(totalRevised), info: true },
                      { icon: "📈", label: "Expenditure (Cumm.) (in Cr.)", value: formatCr(totalExp), info: true },
                      { icon: "✅", label: "Official Projects", value: officialCount.toLocaleString(), info: true },
                      { icon: "🧪", label: "Synthetic Demo Projects", value: syntheticCount.toLocaleString(), info: true },
                    ].map((s, i) => (
                      <div key={s.label} className="gov-stat-card" style={{ opacity: animated ? 1 : 0, transform: animated ? "none" : "translateY(10px)", transition: `all 0.4s ease ${i * 60}ms` }}>
                        <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{s.icon}</span>
                        <div>
                          <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 4, lineHeight: 1.4 }}>
                            {s.label}
                            {s.info && <span style={{ marginLeft: 4, fontSize: "0.6rem", color: "#a0aec0" }}>ⓘ</span>}
                          </div>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.05rem", color: i === 5 ? "var(--color-risk-high)" : "var(--color-navy-700)" }}>
                            {s.value}
                          </div>
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
                <span>High Priority Projects — Sorted by Risk Score</span>
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
                      <th>Expected (%)</th>
                      <th>Risk Score</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.slice(0, 10).map((p, i) => {
                      const riskScore = Math.floor(Math.random() * 40) + 50; // Random mock score between 50-90
                      const status = riskScore >= 80 ? 'High Risk' : (riskScore >= 60 ? 'Medium Risk' : 'Low Risk');
                      const progressStr = p.reported_progress != null ? `${p.reported_progress}` : "0";
                      
                      return (
                      <tr key={p.project_id} style={{ cursor: "pointer" }} onClick={() => navigate(`/projects/${p.project_id}`)}>
                        <td style={{ paddingLeft: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "0.75rem" }}>{p.project_id}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.data_source_type === 'SYNTHETIC_DEMO' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                              {p.data_source_type === 'SYNTHETIC_DEMO' ? 'Synthetic Demo' : 'Official'}
                            </span>
                          </div>
                          <div style={{ color: "var(--color-text-secondary)", fontSize: "0.78rem", maxWidth: 160 }} className="truncate" title={p.project_name}>{p.project_name}</div>
                        </td>
                        <td style={{ fontSize: "0.78rem" }}>
                          {p.state}
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem", color: "var(--color-navy-600)" }}>{formatCr(p.original_cost)}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div className="progress-track" style={{ width: 52, height: 7 }}>
                              <div className="progress-fill" style={{ width: animated ? `${progressStr}%` : "0%", height: "100%", borderRadius: 99, transition: "width 1s ease-out" }} />
                            </div>
                            <span style={{ fontSize: "0.75rem", color: "var(--color-navy-600)", fontWeight: 600 }}>{progressStr}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>-</td>
                        <td>
                          <span style={{
                            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem",
                            color: riskScore >= 80 ? "var(--color-risk-high)" : riskScore >= 60 ? "var(--color-risk-medium)" : "var(--color-risk-low)",
                          }}>{riskScore}</span>
                        </td>
                        <td>
                          <RiskBadge status={status} />
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
                  <span>Requires Immediate Attention</span>
                  <span style={{ background: "var(--color-orange-400)", color: "white", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", fontWeight: 700 }}>
                    {3}
                  </span>
                </div>
                <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                  {projects.slice(0, 3).map((p, i) => {
                    const risk = 85 - i*10; // dummy risk for cards
                    const issue = "Automated data scan flag";
                    return (
                    <div
                      key={p.project_id}
                      style={{
                        background: risk >= 80 ? "var(--color-risk-high-bg)" : "var(--color-risk-medium-bg)",
                        border: `1px solid ${risk >= 80 ? "var(--color-risk-high-border)" : "var(--color-risk-medium-border)"}`,
                        borderLeft: `4px solid ${risk >= 80 ? "var(--color-risk-high)" : "var(--color-risk-medium)"}`,
                        borderRadius: 6, padding: "10px 12px", cursor: "pointer",
                        transition: "box-shadow 0.15s",
                      }}
                      onClick={() => navigate(`/projects/${p.project_id}`)}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = "none"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 6, marginBottom: 4 }}>
                        <div className="flex-1 truncate">
                          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "0.72rem" }}>{p.project_id}</span>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: 1 }} className="truncate" title={p.project_name}>{p.project_name}</div>
                        </div>
                        <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem", color: risk >= 80 ? "var(--color-risk-high)" : "var(--color-risk-medium)", flexShrink: 0 }}>
                          {risk}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>📍 {p.state}</div>
                      <div style={{ fontSize: "0.7rem", color: risk >= 80 ? "var(--color-risk-high)" : "var(--color-risk-medium)", marginTop: 4, fontWeight: 500 }}>⚠ {issue}</div>
                    </div>
                    )
                  })}
                </div>
              </div>

              {/* Quick links */}
              <div className="gov-card" style={{ overflow: "hidden" }}>
                <div className="gov-card-header">Quick Navigation</div>
                <div style={{ padding: "8px 8px" }}>
                  {[
                    { label: "View Project Map", path: "/map", icon: "🗺️" },
                    { label: "Pending Inspections", path: "/inspections", icon: "📋" },
                    { label: "Recent Evidence", path: "/evidence", icon: "📸" },
                    { label: "Citizen Reports", path: "/report", icon: "🚩" },
                  ].map(a => (
                    <button
                      key={a.label}
                      onClick={() => navigate(a.path)}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 10px", cursor: "pointer", background: "transparent",
                        border: "none", borderBottom: "1px solid var(--color-border-light)",
                        textAlign: "left", transition: "background 0.12s",
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--color-navy-50)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                    >
                      <span style={{ fontSize: "1rem" }}>{a.icon}</span>
                      <span style={{ fontSize: "0.8rem", color: "var(--color-navy-700)", fontWeight: 500 }}>{a.label}</span>
                      <span style={{ marginLeft: "auto", color: "var(--color-navy-400)", fontSize: "0.75rem" }}>›</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ===== ACTIVITY FEED ===== */}
          <div className="gov-card" style={{ overflow: "hidden" }}>
            <div className="gov-card-header">Recent Activity</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
              {[
                { action: "Inspection completed", project: "#4821", time: "2h ago", color: "var(--color-risk-low)", bg: "var(--color-risk-low-bg)" },
                { action: "New evidence uploaded", project: "#7192", time: "4h ago", color: "var(--color-navy-500)", bg: "var(--color-navy-50)" },
                { action: "Risk score updated", project: "#3347", time: "6h ago", color: "var(--color-risk-medium)", bg: "var(--color-risk-medium-bg)" },
                { action: "Citizen report received", project: "#5518", time: "Yesterday", color: "#718096", bg: "#f7fafc" },
              ].map((a, i) => (
                <div key={i} style={{ padding: "14px 18px", borderRight: i < 3 ? "1px solid var(--color-border-light)" : "none", display: "flex", gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, flexShrink: 0, marginTop: 5 }} />
                  <div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>{a.action}</div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-navy-500)", fontWeight: 600, marginTop: 2 }}>{a.project}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", marginTop: 1 }}>{a.time}</div>
                  </div>
                </div>
              ))}
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
