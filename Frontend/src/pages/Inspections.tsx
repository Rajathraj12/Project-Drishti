import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { projectService } from "../services/projectService"

type Status = "Pending" | "Assigned" | "In Progress" | "Completed" | "Review Required"

type Inspection = {
  id: string
  project: string
  name: string
  risk: number
  assigned: string
  date: string
  status: Status
  location: string
}


const statusCls: Record<Status, string> = {
  "Pending": "status-pending",
  "Assigned": "status-assigned",
  "In Progress": "status-inprogress",
  "Completed": "status-completed",
  "Review Required": "status-review",
}

const checklist = [
  "Site exterior and boundary",
  "Main structural elements",
  "Work-in-progress areas",
  "Material storage and quality",
  "Surrounding area conditions",
  "Worker presence and activity",
  "Safety measures in place",
]

export default function Inspections() {
  const navigate = useNavigate()
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [selected, setSelected] = useState<Inspection | null>(null)
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [filterStatus, setFilterStatus] = useState("all")

  useEffect(() => {
    projectService.getProjects().then(res => {
      const projects = res.results || []
      const newInspections = projects.slice(0, 5).map((p, i) => {
        const statuses: Status[] = ["In Progress", "Review Required", "Pending", "Completed", "Assigned"]
        return {
          id: `INS-2026-00${i+1}`,
          project: p.project_id,
          name: p.project_name,
          risk: Math.floor(Math.random() * 40) + 50,
          assigned: ["K. Rajan", "S. Nair", "—", "P. Kumar", "M. Reddy"][i],
          date: `${10 + i} Sep 2026`,
          status: statuses[i],
          location: p.state
        }
      })
      setInspections(newInspections)
    })
  }, [])

  const toggle = (item: string) => setChecked(prev => ({ ...prev, [item]: !prev[item] }))
  const filtered = filterStatus === "all" ? inspections : inspections.filter(i => i.status === filterStatus)
  const completedCount = Object.values(checked).filter(Boolean).length

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ background: "var(--color-navy-700)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem" }}>Home</span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>›</span>
        <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 600 }}>Inspection Management</span>
      </div>

      <div className="wave-bg" style={{ padding: "24px 24px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--color-navy-700)", marginBottom: 3 }}>
                Inspection Management
              </h1>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>Track and manage field inspections across all projects</p>
            </div>
            <button className="btn-gov-primary" style={{ fontSize: "0.8rem", padding: "8px 16px", borderRadius: 6 }}>
              + New Inspection
            </button>
          </div>

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            {["all", "Pending", "Assigned", "In Progress", "Completed", "Review Required"].map(s => {
              const isActive = filterStatus === s
              const count = s === "all" ? inspections.length : inspections.filter(i => i.status === s).length
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  style={{
                    fontSize: "0.75rem", padding: "5px 14px", borderRadius: 20, cursor: "pointer",
                    fontWeight: 600, transition: "all 0.15s",
                    background: isActive ? "var(--color-orange-400)" : "white",
                    color: isActive ? "white" : "var(--color-navy-700)",
                    border: isActive ? "1px solid var(--color-orange-400)" : "1px solid var(--color-border)",
                    boxShadow: isActive ? "0 2px 6px rgba(247,164,29,0.3)" : "none",
                  }}
                >
                  {s === "all" ? "All" : s}
                  <span style={{
                    marginLeft: 5, fontSize: "0.65rem",
                    background: isActive ? "rgba(255,255,255,0.3)" : "var(--color-navy-50)",
                    color: isActive ? "white" : "var(--color-navy-500)",
                    padding: "1px 5px", borderRadius: 8, fontFamily: "var(--font-mono)",
                  }}>{count}</span>
                </button>
              )
            })}
          </div>

          {/* Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
            {/* Table */}
            <div className="gov-card" style={{ overflow: "hidden" }}>
              <div className="gov-card-header">Inspection Requests</div>
              <div style={{ overflowX: "auto" }}>
                <table className="gov-table">
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>Project</th>
                      <th>Risk Score</th>
                      <th>Assigned To</th>
                      <th>Inspection Date</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(insp => (
                      <tr
                        key={insp.id}
                        style={{ cursor: "pointer", background: selected?.id === insp.id ? "var(--color-navy-50)" : "transparent" }}
                        onClick={() => setSelected(insp)}
                      >
                        <td style={{ paddingLeft: 20 }}>
                          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "0.75rem" }}>{insp.project}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", maxWidth: 160 }} className="truncate">{insp.name}</div>
                          <div style={{ fontSize: "0.65rem", color: "var(--color-text-muted)" }}>📍 {insp.location}</div>
                        </td>
                        <td>
                          <span style={{
                            fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1rem",
                            color: insp.risk >= 80 ? "var(--color-risk-high)" : "var(--color-risk-medium)",
                          }}>{insp.risk}</span>
                        </td>
                        <td style={{ fontSize: "0.78rem" }}>{insp.assigned}</td>
                        <td style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontFamily: "var(--font-mono)" }}>{insp.date}</td>
                        <td>
                          <span className={`status-badge ${statusCls[insp.status]}`}>
                            {insp.status}
                          </span>
                        </td>
                        <td>
                          <button className="btn-gov-outline" style={{ padding: "3px 10px", fontSize: "0.7rem" }}>Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail panel */}
            {selected ? (
              <div className="gov-card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div className="gov-card-header">
                  Inspection Detail
                </div>
                <div style={{ padding: "16px", flex: 1, overflowY: "auto" }}>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--color-navy-600)", background: "var(--color-navy-50)", border: "1px solid var(--color-navy-100)", borderRadius: 4, padding: "2px 6px" }}>
                        {selected.id}
                      </span>
                      <span className={`status-badge ${statusCls[selected.status]}`}>{selected.status}</span>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "0.9rem", marginBottom: 4 }}>{selected.name}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>📍 {selected.location}</div>
                  </div>

                  {/* Details */}
                  <div style={{ background: "var(--color-surface)", borderRadius: 6, padding: "12px 14px", marginBottom: 16 }}>
                    {[
                      { label: "Project ID", value: selected.project },
                      { label: "Risk Score", value: selected.risk.toString(), highlight: true },
                      { label: "Assigned Officer", value: selected.assigned === "—" ? "Unassigned" : selected.assigned },
                      { label: "Inspection Date", value: selected.date },
                    ].map((d, i, arr) => (
                      <div key={d.label} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: i < arr.length - 1 ? "1px solid var(--color-border-light)" : "none" }}>
                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{d.label}</span>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: (d as any).highlight ? "var(--color-risk-high)" : "var(--color-navy-700)" }}>{d.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Checklist */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-700)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        Inspection Checklist
                      </div>
                      <span style={{ fontSize: "0.65rem", color: "var(--color-risk-low)", fontWeight: 600 }}>
                        {completedCount}/{checklist.length} done
                      </span>
                    </div>
                    {/* Progress */}
                    <div className="progress-track" style={{ height: 5, marginBottom: 12 }}>
                      <div className="progress-fill-orange" style={{ width: `${(completedCount / checklist.length) * 100}%`, height: "100%", borderRadius: 99, transition: "width 0.3s" }} />
                    </div>
                    {checklist.map(item => (
                      <label key={item} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                        <div
                          onClick={() => toggle(item)}
                          style={{
                            width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 1,
                            border: `1.5px solid ${checked[item] ? "var(--color-orange-400)" : "var(--color-border)"}`,
                            background: checked[item] ? "var(--color-orange-400)" : "white",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 0.15s",
                          }}
                        >
                          {checked[item] && <span style={{ color: "white", fontSize: "0.55rem", fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: "0.78rem", color: checked[item] ? "#a0aec0" : "var(--color-text-secondary)", textDecoration: checked[item] ? "line-through" : "none" }}>
                          {item}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* Upload */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-700)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      Upload Evidence
                    </div>
                    {[
                      { icon: "📸", label: "Photos", sub: "JPG, PNG up to 10MB" },
                      { icon: "🎥", label: "Video", sub: "MP4, MOV up to 100MB" },
                      { icon: "📄", label: "Inspection Report", sub: "PDF, DOCX" },
                    ].map(u => (
                      <div key={u.label} style={{
                        border: "1.5px dashed var(--color-border)", borderRadius: 6, padding: "9px 12px",
                        cursor: "pointer", marginBottom: 6, display: "flex", alignItems: "center", gap: 8,
                        background: "var(--color-surface)", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-navy-400)"; (e.currentTarget as HTMLElement).style.background = "var(--color-navy-50)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--color-border)"; (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; }}>
                        <span style={{ fontSize: "1.1rem" }}>{u.icon}</span>
                        <div>
                          <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-navy-700)" }}>{u.label}</div>
                          <div style={{ fontSize: "0.62rem", color: "var(--color-text-muted)" }}>{u.sub}</div>
                        </div>
                        <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--color-navy-500)", fontWeight: 600 }}>Upload</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => navigate(`/projects/${selected.project.replace("#", "")}`)}
                    className="btn-gov-secondary"
                    style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: "0.8rem", borderRadius: 6 }}
                  >
                    View Full Project Details →
                  </button>
                </div>
              </div>
            ) : (
              <div className="gov-card" style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: 32, minHeight: 280, textAlign: "center",
                border: "1.5px dashed var(--color-border)",
              }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 12, opacity: 0.5 }}>📋</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--color-navy-700)", fontSize: "0.9rem", marginBottom: 6 }}>
                  Select an Inspection
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.6 }}>
                  Click any row in the table to view inspection details and checklist
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
