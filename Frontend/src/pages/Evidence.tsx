import { useState } from "react"

type Tab = "all" | "photos" | "documents" | "inspections" | "remote"

const timelineItems = [
  { date: "Jan 2026", month: "JAN", year: "2026", title: "Initial site photographs", source: "Implementing Agency", project: "DR-0001", status: "Verified", type: "photos", icon: "🏗️" },
  { date: "Apr 2026", month: "APR", year: "2026", title: "Progress update — 35% milestone", source: "Project Engineer", project: "DR-0001", status: "Verified", type: "documents", icon: "📄" },
  { date: "Jul 2026", month: "JUL", year: "2026", title: "Agency site photograph", source: "Implementing Agency", project: "DR-0001", status: "Verified", type: "photos", icon: "📸" },
  { date: "Aug 2026", month: "AUG", year: "2026", title: "Remote satellite imagery", source: "Remote Sensing Agency", project: "DR-0001", status: "Pending", type: "remote", icon: "🛰️" },
  { date: "Sep 2026", month: "SEP", year: "2026", title: "Field inspection report", source: "District Inspector", project: "DR-0001", status: "Verified", type: "inspections", icon: "✅" },
]

const allEvidence = [
  { id: "E001", title: "Site Photograph — Foundation", type: "photos", date: "10 Sep 2026", source: "Implementing Agency", project: "#4821", status: "Verified", size: "2.4 MB" },
  { id: "E002", title: "Completion Certificate (Partial)", type: "documents", date: "5 Sep 2026", source: "Project Engineer", project: "#7192", status: "Verified", size: "340 KB" },
  { id: "E003", title: "Inspection Report — Site Visit", type: "inspections", date: "2 Sep 2026", source: "District Inspector", project: "#4821", status: "Verified", size: "1.1 MB" },
  { id: "E004", title: "Satellite Imagery — Aug 2026", type: "remote", date: "28 Aug 2026", source: "Remote Sensing Agency", project: "#4821", status: "Pending", size: "8.7 MB" },
  { id: "E005", title: "Site Photograph — Superstructure", type: "photos", date: "20 Aug 2026", source: "Implementing Agency", project: "#3347", status: "Verified", size: "3.1 MB" },
  { id: "E006", title: "Financial Utilization Certificate", type: "documents", date: "15 Aug 2026", source: "Accounts Department", project: "#5518", status: "Verified", size: "210 KB" },
]

const typeIcons: Record<string, string> = { photos: "📸", documents: "📄", inspections: "✅", remote: "🛰️" }

const tabs: { k: Tab; label: string }[] = [
  { k: "all", label: "All Evidence" },
  { k: "photos", label: "Photos" },
  { k: "documents", label: "Documents" },
  { k: "inspections", label: "Inspection Reports" },
  { k: "remote", label: "Remote Evidence" },
]

export default function Evidence() {
  const [tab, setTab] = useState<Tab>("all")
  const [sliderPos, setSliderPos] = useState(50)
  const [dragging, setDragging] = useState(false)

  const filtered = tab === "all" ? allEvidence : allEvidence.filter(e => e.type === tab)

  const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    setSliderPos(Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100)))
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ background: "var(--color-navy-700)", padding: "10px 24px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.78rem" }}>Home</span>
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.78rem" }}>›</span>
        <span style={{ color: "white", fontSize: "0.78rem", fontWeight: 600 }}>Project Evidence</span>
      </div>

      <div className="wave-bg" style={{ padding: "24px 24px 40px" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Header */}
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--color-navy-700)", marginBottom: 3 }}>
              Project Evidence Repository
            </h1>
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>
              All documentation, photographs, and inspection records — Project DR-0001 & others
            </p>
          </div>

          {/* Image Comparison */}
          <div className="gov-card" style={{ overflow: "hidden" }}>
            <div className="gov-card-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Site Progress Comparison — Project DR-0001, Expressway Phase-I, Punjab</span>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ fontSize: "0.7rem", background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 12, padding: "2px 10px", color: "white" }}>Jan 2026</span>
                <span style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.75rem" }}>→</span>
                <span style={{ fontSize: "0.7rem", background: "var(--color-orange-400)", border: "1px solid var(--color-orange-300)", borderRadius: 12, padding: "2px 10px", color: "white" }}>Sep 2026</span>
              </div>
            </div>
            <div style={{ padding: "16px 20px" }}>
              <div
                style={{ position: "relative", height: 220, borderRadius: 8, overflow: "hidden", cursor: "col-resize", userSelect: "none", border: "1px solid var(--color-border)" }}
                onMouseDown={() => setDragging(true)}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
                onMouseMove={handleSliderDrag}
              >
                {/* BEFORE */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #e2e8f0 0%, #cbd5e0 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{ fontSize: "3.5rem" }}>🏗️</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "#718096", fontSize: "0.9rem" }}>Foundation Stage</div>
                  <div style={{ fontSize: "0.75rem", color: "#a0aec0" }}>January 2026</div>
                </div>

                {/* AFTER */}
                <div style={{ position: "absolute", inset: 0, overflow: "hidden", clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
                  <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, var(--color-navy-50) 0%, var(--color-navy-100) 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <div style={{ fontSize: "3.5rem" }}>🏢</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--color-navy-700)", fontSize: "0.9rem" }}>Structure Progress</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-navy-400)" }}>September 2026</div>
                  </div>
                </div>

                {/* Labels */}
                <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.5)", color: "white", fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em" }}>BEFORE</div>
                <div style={{ position: "absolute", top: 10, right: 10, background: "var(--color-navy-700)", color: "white", fontSize: "0.62rem", fontWeight: 700, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.08em" }}>CURRENT</div>

                {/* Slider handle */}
                <div style={{ position: "absolute", top: 0, bottom: 0, width: 2, background: "var(--color-navy-700)", left: `${sliderPos}%` }}>
                  <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                    width: 28, height: 28, background: "var(--color-navy-700)", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "col-resize",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      <div style={{ width: 2, height: 10, background: "white", borderRadius: 1 }} />
                      <div style={{ width: 2, height: 10, background: "white", borderRadius: 1 }} />
                    </div>
                  </div>
                </div>
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", textAlign: "center", marginTop: 10 }}>
                Drag the slider left/right to compare site condition over time
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="gov-card" style={{ overflow: "hidden" }}>
            <div className="gov-card-header">Evidence Timeline — Project DR-0001</div>
            <div style={{ padding: "20px 22px" }}>
              <div style={{ position: "relative" }}>
                <div style={{ position: "absolute", left: 72, top: 6, bottom: 6, width: 2, background: "linear-gradient(180deg, var(--color-navy-100), var(--color-orange-300))" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {timelineItems.map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                      <div style={{ width: 56, textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", fontWeight: 700, color: "var(--color-navy-500)" }}>{item.month}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--color-text-muted)" }}>{item.year}</div>
                      </div>
                      <div style={{
                        width: 14, height: 14, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                        background: item.status === "Verified" ? "var(--color-risk-low)" : "var(--color-risk-medium)",
                        border: "2px solid white", position: "relative", zIndex: 1,
                        boxShadow: "0 0 0 2px " + (item.status === "Verified" ? "var(--color-risk-low-border)" : "var(--color-risk-medium-border)"),
                      }} />
                      <div style={{
                        flex: 1, background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        borderRadius: 8, padding: "12px 14px", transition: "all 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "white"; (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "var(--color-surface)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}>
                        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                            <span style={{ fontSize: "1.4rem" }}>{item.icon}</span>
                            <div>
                              <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.85rem", marginBottom: 3 }}>{item.title}</div>
                              <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                By <span style={{ fontWeight: 500, color: "var(--color-text-secondary)" }}>{item.source}</span>
                                <span style={{ margin: "0 5px" }}>·</span>
                                <span style={{ color: "var(--color-navy-600)", fontWeight: 600 }}>{item.project}</span>
                                <span style={{ margin: "0 5px" }}>·</span>
                                {item.date}
                              </div>
                            </div>
                          </div>
                          <span className={item.status === "Verified" ? "badge-low" : "badge-medium"} style={{ flexShrink: 0, fontSize: "0.65rem" }}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Evidence Table */}
          <div className="gov-card" style={{ overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{ borderBottom: "1px solid var(--color-border)", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-navy-50)" }}>
              <div style={{ display: "flex" }}>
                {tabs.map(t => (
                  <button
                    key={t.k}
                    onClick={() => setTab(t.k)}
                    style={{
                      padding: "12px 16px", cursor: "pointer", background: "transparent",
                      border: "none", borderBottom: tab === t.k ? `3px solid var(--color-orange-400)` : "3px solid transparent",
                      color: tab === t.k ? "var(--color-navy-700)" : "var(--color-text-muted)",
                      fontWeight: tab === t.k ? 700 : 500, fontSize: "0.78rem",
                      transition: "all 0.15s",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                Showing <strong>{filtered.length}</strong> records
              </div>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="gov-table">
                <thead>
                  <tr>
                    <th style={{ paddingLeft: 20 }}>Evidence</th>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Project</th>
                    <th>File Size</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => (
                    <tr key={e.id}>
                      <td style={{ paddingLeft: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 6, background: "var(--color-navy-50)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem", flexShrink: 0 }}>
                            {typeIcons[e.type]}
                          </div>
                          <div>
                            <div style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: "0.82rem" }}>{e.title}</div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.62rem", color: "var(--color-text-muted)" }}>{e.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{e.date}</td>
                      <td style={{ fontSize: "0.78rem" }}>{e.source}</td>
                      <td style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "0.78rem", color: "var(--color-navy-600)" }}>{e.project}</td>
                      <td style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{e.size}</td>
                      <td>
                        <span className={e.status === "Verified" ? "badge-low" : "badge-medium"}>
                          {e.status}
                        </span>
                      </td>
                      <td>
                        <button className="btn-gov-outline" style={{ padding: "3px 10px", fontSize: "0.7rem" }}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
