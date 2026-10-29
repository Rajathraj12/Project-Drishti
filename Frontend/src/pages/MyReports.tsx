import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { citizenReportService, CitizenReportItem } from "../services/citizenReportService"

type ReportStatus = "Submitted" | "Under Review" | "Verified" | "Resolved" | "Closed" | "Dismissed"

type CitizenReportRecord = CitizenReportItem

const STATUS_CONFIG: Record<ReportStatus, { color: string; bg: string; icon: string }> = {
  Submitted:      { color: "#1e40af", bg: "#eff6ff", icon: "📥" },
  "Under Review": { color: "#92400e", bg: "#fef3c7", icon: "🔍" },
  Verified:       { color: "#065f46", bg: "#ecfdf5", icon: "✅" },
  Resolved:       { color: "#065f46", bg: "#ecfdf5", icon: "✔️" },
  Closed:         { color: "#475569", bg: "#f1f5f9", icon: "🔒" },
  Dismissed:      { color: "#991b1b", bg: "#fef2f2", icon: "❌" },
}

const STATUS_STEPS: ReportStatus[] = ["Submitted", "Under Review", "Verified", "Resolved"]

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Submitted
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 12,
        background: cfg.bg,
        color: cfg.color,
        fontSize: "0.72rem",
        fontWeight: 700,
      }}
    >
      {cfg.icon} {status}
    </span>
  )
}

function StatusStepper({ status }: { status: ReportStatus }) {
  const currentIdx = STATUS_STEPS.indexOf(status === "Closed" ? "Resolved" : status)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STATUS_STEPS.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.65rem",
                fontWeight: 700,
                border: "2px solid",
                borderColor: i <= currentIdx ? "#1e3a8a" : "#e2e8f0",
                background: i <= currentIdx ? "#1e3a8a" : "white",
                color: i <= currentIdx ? "white" : "#94a3b8",
              }}
            >
              {i <= currentIdx ? "✓" : i + 1}
            </div>
            <div
              style={{
                fontSize: "0.6rem",
                marginTop: 4,
                fontWeight: 600,
                color: i <= currentIdx ? "#1e3a8a" : "#94a3b8",
                whiteSpace: "nowrap",
              }}
            >
              {step}
            </div>
          </div>
          {i < STATUS_STEPS.length - 1 && (
            <div
              style={{
                width: 40,
                height: 2,
                marginBottom: 16,
                background: i < currentIdx ? "#1e3a8a" : "#e2e8f0",
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function ReportCard({ report }: { report: CitizenReportRecord }) {
  const [expanded, setExpanded] = useState(false)
  const submittedDate = new Date(report.submittedAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  })
  const updatedDate = new Date(report.lastUpdated).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  })

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 12,
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "14px 20px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "#1e3a8a",
                background: "#eff6ff",
                padding: "2px 8px",
                borderRadius: 6,
              }}
            >
              {report.referenceNo}
            </span>
            <StatusBadge status={report.status} />
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#0f172a", marginBottom: 2 }}>
            {report.issueType}
          </div>
          <div style={{ fontSize: "0.76rem", color: "#64748b" }}>
            📍 {report.location} &nbsp;·&nbsp; 📅 Submitted {submittedDate}
          </div>
          {report.projectName && (
            <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: 2 }}>
              Project: {report.projectId} — {report.projectName}
            </div>
          )}
        </div>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", flexShrink: 0 }}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "16px 20px 20px", background: "#fafafa" }}>
          {/* Status tracker */}
          <div style={{ marginBottom: 20 }}>
            <StatusStepper status={report.status} />
          </div>

          {/* Description */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Your Observation
            </div>
            <p style={{ fontSize: "0.82rem", color: "#334155", lineHeight: 1.6, margin: 0 }}>
              {report.description}
            </p>
          </div>

          {/* Resolution note */}
          {report.resolvedNote && (
            <div
              style={{
                background: "#ecfdf5",
                border: "1px solid #6ee7b7",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#065f46", marginBottom: 4 }}>
                ✅ Official Response
              </div>
              <p style={{ fontSize: "0.8rem", color: "#047857", margin: 0, lineHeight: 1.5 }}>
                {report.resolvedNote}
              </p>
            </div>
          )}

          <div style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
            Last updated: {updatedDate}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyReports() {
  const navigate = useNavigate()
  const { user, isGuest } = useAuth()
  const [reports, setReports] = useState<CitizenReportRecord[]>([])
  const [filter, setFilter] = useState<"All" | ReportStatus>("All")

  useEffect(() => {
    setReports(citizenReportService.getAll())
    const handleReportsUpdate = () => {
      setReports(citizenReportService.getAll())
    }
    window.addEventListener("drishti_reports_changed", handleReportsUpdate)
    return () => {
      window.removeEventListener("drishti_reports_changed", handleReportsUpdate)
    }
  }, [])

  const filtered = filter === "All"
    ? reports
    : reports.filter((r) => r.status === filter)

  const counts: Record<string, number> = {
    All: reports.length,
    Submitted: reports.filter((r) => r.status === "Submitted").length,
    "Under Review": reports.filter((r) => r.status === "Under Review").length,
    Verified: reports.filter((r) => r.status === "Verified").length,
    Resolved: reports.filter((r) => r.status === "Resolved").length,
    Closed: reports.filter((r) => r.status === "Closed").length,
  }

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--color-navy-900)",
              marginBottom: 4,
            }}
          >
            📋 My Reports
          </h1>
          <p style={{ fontSize: "0.83rem", color: "var(--color-text-muted)", margin: 0 }}>
            Track the status of issues you have reported. Click on a report to see details.
          </p>
        </div>
        <button
          onClick={() => navigate("/report")}
          style={{
            background: "var(--color-navy-800)",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: "0.83rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          ＋ New Report
        </button>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          { label: "Total Submitted", value: reports.length, icon: "📤", color: "#1e3a8a", bg: "#eff6ff" },
          { label: "Under Review / Pending", value: reports.filter((r) => r.status === "Submitted" || r.status === "Under Review").length, icon: "🔍", color: "#92400e", bg: "#fef3c7" },
          { label: "Resolved / Closed", value: reports.filter((r) => r.status === "Resolved" || r.status === "Closed").length, icon: "✅", color: "#065f46", bg: "#ecfdf5" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: s.bg,
              border: `1px solid ${s.color}22`,
              borderRadius: 10,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: "1.4rem" }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: "1.3rem", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.72rem", color: s.color, fontWeight: 600, opacity: 0.8 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["All", "Submitted", "Under Review", "Verified", "Resolved", "Closed"] as const).map((tab) => (
          counts[tab] > 0 || tab === "All" ? (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1.5px solid",
                borderColor: filter === tab ? "var(--color-navy-800)" : "#e2e8f0",
                background: filter === tab ? "var(--color-navy-800)" : "white",
                color: filter === tab ? "white" : "#64748b",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {tab} {counts[tab] > 0 && <span style={{ opacity: 0.7 }}>({counts[tab]})</span>}
            </button>
          ) : null
        ))}
      </div>

      {/* Report cards */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            background: "white",
            border: "1px dashed #e2e8f0",
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: 10 }}>📭</div>
          <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#334155", marginBottom: 6 }}>
            No reports in this category
          </div>
          <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            You haven't submitted any reports yet, or none match the selected filter.
          </p>
          <button
            onClick={() => navigate("/report")}
            style={{
              marginTop: 16,
              background: "var(--color-navy-800)",
              color: "white",
              border: "none",
              borderRadius: 8,
              padding: "8px 18px",
              fontSize: "0.82rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Submit Your First Report
          </button>
        </div>
      ) : (
        filtered.map((report) => <ReportCard key={report.id} report={report} />)
      )}

      {/* Info note */}
      <div
        style={{
          marginTop: 24,
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: "0.75rem",
          color: "#64748b",
          lineHeight: 1.6,
        }}
      >
        🔒 Your reports are confidential. Personal details (if provided) are only used to update you on progress and are never shared publicly. Reports are reviewed by authorized government officers.
      </div>
    </div>
  )
}
