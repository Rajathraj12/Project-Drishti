import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { citizenReportService, CitizenReportItem } from "../services/citizenReportService"
import { PROJECT_COORDS } from "./MapView"
import {
  FileTextIcon,
  CheckIcon,
  CheckCircleIcon,
  SearchIcon,
  ClockIcon,
  MapPinIcon,
  ShieldCheckIcon,
  BuildingIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  AlertCircleIcon,
  SlidersIcon,
} from "../components/GrievanceIcons"

type ReportStatus = "Submitted" | "Under Review" | "Verified" | "Resolved" | "Closed" | "Dismissed"

type CitizenReportRecord = CitizenReportItem

const STATUS_CONFIG: Record<ReportStatus, { color: string; bg: string; border: string; label: string }> = {
  Submitted:      { color: "#1e40af", bg: "#eff6ff", border: "#bfdbfe", label: "Submitted" },
  "Under Review": { color: "#92400e", bg: "#fef3c7", border: "#fde68a", label: "Under Review" },
  Verified:       { color: "#0f766e", bg: "#f0fdfa", border: "#99f6e4", label: "Verified" },
  Resolved:       { color: "#166534", bg: "#f0fdf4", border: "#bbf7d0", label: "Resolved" },
  Closed:         { color: "#334155", bg: "#f8fafc", border: "#e2e8f0", label: "Closed" },
  Dismissed:      { color: "#991b1b", bg: "#fef2f2", border: "#fecaca", label: "Dismissed" },
}

const STATUS_STEPS: ReportStatus[] = ["Submitted", "Under Review", "Verified", "Resolved"]

const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  gurugram: { lat: 28.4595, lng: 77.0266 },
  gurgaon: { lat: 28.4595, lng: 77.0266 },
  meerut: { lat: 28.9845, lng: 77.7064 },
  jaipur: { lat: 26.9124, lng: 75.7873 },
  kanpur: { lat: 26.4499, lng: 80.3319 },
  ghaziabad: { lat: 28.6692, lng: 77.4538 },
  bhopal: { lat: 23.2599, lng: 77.4126 },
  delhi: { lat: 28.6139, lng: 77.2090 },
  shimla: { lat: 31.1048, lng: 77.1734 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  ludhiana: { lat: 30.9010, lng: 75.8573 },
  mandi: { lat: 31.7087, lng: 76.9320 },
}

function resolveCoordinates(report: CitizenReportRecord): { lat: number; lng: number; formatted: string; source: string } {
  // 1. Check if location string has explicit GPS coordinates (from the Locate button)
  const gpsMatch = report.location?.match(/GPS:\s*([0-9]+\.[0-9]+)[^0-9]+([0-9]+\.[0-9]+)/i)
  if (gpsMatch) {
    const lat = parseFloat(gpsMatch[1])
    const lng = parseFloat(gpsMatch[2])
    return {
      lat,
      lng,
      formatted: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`,
      source: "Citizen GPS",
    }
  }

  // 2. Check project coordinates from project ID
  const cleanId = (report.projectId || "").trim().toUpperCase()
  if (cleanId && PROJECT_COORDS[cleanId]) {
    const p = PROJECT_COORDS[cleanId]
    return {
      lat: p.lat,
      lng: p.lng,
      formatted: `${p.lat.toFixed(4)}° N, ${p.lng.toFixed(4)}° E`,
      source: `Project ${cleanId} Site`,
    }
  }

  // 3. Check city/district names in location string
  const locLower = (report.location || "").toLowerCase()
  for (const [city, coords] of Object.entries(CITY_COORDS)) {
    if (locLower.includes(city)) {
      return {
        lat: coords.lat,
        lng: coords.lng,
        formatted: `${coords.lat.toFixed(4)}° N, ${coords.lng.toFixed(4)}° E`,
        source: "Geocoded Area",
      }
    }
  }

  // Fallback to central capital default
  return {
    lat: 28.6139,
    lng: 77.2090,
    formatted: "28.6139° N, 77.2090° E",
    source: "Regional Capital",
  }
}

function StatusBadge({ status }: { status: ReportStatus }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Submitted
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 9px",
        borderRadius: 6,
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.01em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: cfg.color,
        }}
      />
      {cfg.label}
    </span>
  )
}

function StatusStepper({ status }: { status: ReportStatus }) {
  const currentIdx = STATUS_STEPS.indexOf(status === "Closed" ? "Resolved" : status)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "6px 0" }}>
      {STATUS_STEPS.map((step, i) => {
        const isDone = i <= currentIdx
        const isCurrent = i === currentIdx
        return (
          <div key={step} style={{ display: "flex", alignItems: "center", flex: i < STATUS_STEPS.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  border: isDone ? "2px solid #0b1f4b" : "1.5px solid #cbd5e1",
                  background: isDone ? "#0b1f4b" : "#ffffff",
                  color: isDone ? "#ffffff" : "#94a3b8",
                  transition: "all 0.25s ease",
                  boxShadow: isCurrent ? "0 0 0 3px rgba(11, 31, 75, 0.15)" : "none",
                }}
              >
                {isDone ? <CheckIcon size={13} /> : i + 1}
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  marginTop: 5,
                  fontWeight: isDone ? 700 : 500,
                  color: isDone ? "#0b1f4b" : "#94a3b8",
                  whiteSpace: "nowrap",
                }}
              >
                {step === "Under Review" ? "Under Review" : step}
              </div>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  marginBottom: 16,
                  marginLeft: 8,
                  marginRight: 8,
                  background: i < currentIdx ? "#0b1f4b" : "#e2e8f0",
                  transition: "all 0.25s ease",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ReportCard({
  report,
  defaultExpanded = false,
  isOfficial = false,
  officerName = "Ministry Official",
}: {
  report: CitizenReportRecord
  defaultExpanded?: boolean
  isOfficial?: boolean
  officerName?: string
}) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [noteText, setNoteText] = useState(report.resolvedNote || "")
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [copiedCoord, setCopiedCoord] = useState(false)

  const coords = resolveCoordinates(report)

  useEffect(() => {
    setNoteText(report.resolvedNote || "")
  }, [report.resolvedNote])

  const submittedDate = new Date(report.submittedAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  })
  const updatedDate = new Date(report.lastUpdated).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
  })

  const handleUpdateStatus = (newStatus: ReportStatus, defaultNote?: string) => {
    const finalNote = noteText.trim() ? noteText : (defaultNote || report.resolvedNote)
    if (defaultNote && !noteText.trim()) {
      setNoteText(defaultNote)
    }

    citizenReportService.updateStatus(report.id, {
      status: newStatus,
      resolvedNote: finalNote,
      assignedOfficer: report.assignedOfficer || officerName,
    }).then(() => {
      setSuccessMsg(`Status updated to "${newStatus}". Redressal pipeline updated.`)
      setTimeout(() => setSuccessMsg(null), 3500)
    }).catch(() => {
      setSuccessMsg("Update failed. Please try again.")
      setTimeout(() => setSuccessMsg(null), 3500)
    })
  }

  const handleSaveNote = () => {
    citizenReportService.updateStatus(report.id, {
      status: report.status,
      resolvedNote: noteText,
      assignedOfficer: report.assignedOfficer || officerName,
    }).then(() => {
      setSuccessMsg("Inspection findings saved successfully.")
      setTimeout(() => setSuccessMsg(null), 3500)
    }).catch(() => {
      setSuccessMsg("Save failed. Please try again.")
      setTimeout(() => setSuccessMsg(null), 3500)
    })
  }

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        overflow: "hidden",
        marginBottom: 14,
        boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        transition: "border-color 0.15s ease",
      }}
    >
      {/* Card Header Row */}
      <div
        style={{
          padding: "16px 20px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          background: expanded ? "#f8fafc" : "#ffffff",
          transition: "background 0.15s ease",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "0.74rem",
                fontWeight: 700,
                color: "#0f172a",
                background: "#f1f5f9",
                padding: "2px 8px",
                borderRadius: 5,
                border: "1px solid #e2e8f0",
              }}
            >
              {report.referenceNo}
            </span>
            <StatusBadge status={report.status} />
            {report.priority && (
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  padding: "2px 7px",
                  borderRadius: 5,
                  background: report.priority === "CRITICAL" ? "#fef2f2" : report.priority === "HIGH" ? "#fff7ed" : "#f8fafc",
                  color: report.priority === "CRITICAL" ? "#991b1b" : report.priority === "HIGH" ? "#c2410c" : "#64748b",
                  border: report.priority === "CRITICAL" ? "1px solid #fecaca" : report.priority === "HIGH" ? "1px solid #fed7aa" : "1px solid #e2e8f0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {report.priority === "CRITICAL" || report.priority === "HIGH" ? <AlertCircleIcon size={11} /> : null}
                {report.priority}
              </span>
            )}
          </div>

          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a", marginBottom: 4 }}>
            {report.issueType}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: "0.75rem", color: "#64748b", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <MapPinIcon size={13} className="text-slate-400" />
              {report.location}
            </span>

            {/* Officer Coordinates Badge in Header */}
            {isOfficial && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: "0.72rem",
                  color: "#1e40af",
                  background: "#eff6ff",
                  padding: "1px 6px",
                  borderRadius: 4,
                  border: "1px solid #bfdbfe",
                  fontWeight: 600,
                }}
                title={`Exact Coordinates (${coords.source})`}
              >
                <MapPinIcon size={11} className="text-blue-700" />
                {coords.formatted}
              </span>
            )}

            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <ClockIcon size={13} className="text-slate-400" />
              Submitted {submittedDate}
            </span>
          </div>

          {report.projectName && (
            <div style={{ fontSize: "0.74rem", color: "#475569", marginTop: 4, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <BuildingIcon size={12} className="text-slate-400" />
                <span>Project: <strong>{report.projectId}</strong> — {report.projectName}</span>
              </div>

              {/* Fast links for Officer to inspect project right from header */}
              {isOfficial && report.projectId && report.projectId !== "DR-UNSPECIFIED" && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 4 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/map?project=${report.projectId}`)
                    }}
                    style={{
                      background: "#eff6ff",
                      color: "#1e40af",
                      border: "1px solid #bfdbfe",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                    title="Focus on Project Map"
                  >
                    <span>Map View ↗</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/projects/${report.projectId}`)
                    }}
                    style={{
                      background: "#f8fafc",
                      color: "#334155",
                      border: "1px solid #cbd5e1",
                      borderRadius: 4,
                      padding: "1px 6px",
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                    title="Open Master Project Details"
                  >
                    <span>Details ↗</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, marginTop: 2 }}>
          <span style={{ fontSize: "0.75rem", color: "#0b1f4b", fontWeight: 600 }}>
            {expanded ? "Hide" : "Details"}
          </span>
          <div style={{ color: "#64748b" }}>
            {expanded ? <ChevronUpIcon size={15} /> : <ChevronDownIcon size={15} />}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div style={{ borderTop: "1px solid #e2e8f0", padding: "18px 20px 22px", background: "#ffffff" }}>
          {/* Stepper */}
          <div style={{ marginBottom: 18, background: "#f8fafc", padding: "14px 16px", borderRadius: 10, border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Redressal Lifecycle Tracker
            </div>
            <StatusStepper status={report.status} />
          </div>

          {/* Citizen Observation */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Your Observation
            </div>
            <div style={{ fontSize: "0.82rem", color: "#334155", lineHeight: 1.6, background: "#f8fafc", padding: "12px 14px", borderRadius: 8, border: "1px solid #e2e8f0" }}>
              {report.description}
            </div>
          </div>

          {/* Official Response */}
          {report.resolvedNote ? (
            <div
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 8,
                padding: "12px 15px",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#166534", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                <ShieldCheckIcon size={14} className="text-emerald-700" />
                <span>Official Response & Inspection Findings</span>
                {report.assignedOfficer && (
                  <span style={{ fontWeight: 500, color: "#15803d", marginLeft: 4 }}>— {report.assignedOfficer}</span>
                )}
              </div>
              <p style={{ fontSize: "0.82rem", color: "#14532d", margin: 0, lineHeight: 1.55 }}>
                {report.resolvedNote}
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "11px 14px",
                marginBottom: 16,
                fontSize: "0.78rem",
                color: "#64748b",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ClockIcon size={14} className="text-slate-400 shrink-0" />
              <span>
                <strong>Awaiting Inspection:</strong> Report logged and assigned to regional field engineer.
              </span>
            </div>
          )}

          {/* Site Geolocation & Project Inspection Panel — VISIBLE TO OFFICIALS */}
          {isOfficial && (
            <div
              style={{
                marginTop: 14,
                marginBottom: 16,
                padding: "14px 16px",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPinIcon size={16} className="text-emerald-700" />
                  <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#14532d", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Site Geolocation & Project Inspection
                  </span>
                </div>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "#15803d",
                    background: "#dcfce7",
                    padding: "2px 8px",
                    borderRadius: 4,
                    border: "1px solid #86efac",
                  }}
                >
                  Verified Coordinates ({coords.source})
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>Exact GPS:</span>
                    <span
                      style={{
                        fontFamily: "var(--font-mono, monospace)",
                        fontWeight: 800,
                        fontSize: "0.86rem",
                        color: "#0f172a",
                        background: "#ffffff",
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "1px solid #86efac",
                      }}
                    >
                      {coords.formatted}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${coords.lat}, ${coords.lng}`)
                        setCopiedCoord(true)
                        setTimeout(() => setCopiedCoord(false), 2000)
                      }}
                      style={{
                        fontSize: "0.7rem",
                        color: "#166534",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontWeight: 600,
                      }}
                    >
                      {copiedCoord ? "Copied!" : "Copy Coordinates"}
                    </button>
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#15803d" }}>
                    Site Location: <strong>{report.location}</strong> &nbsp;·&nbsp; Target Project: <strong>{report.projectId}</strong>
                  </div>
                </div>

                {/* Quick Inspection Navigation Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/map?project=${report.projectId}&lat=${coords.lat}&lng=${coords.lng}`)}
                    style={{
                      background: "#0b1f4b",
                      color: "white",
                      border: "none",
                      borderRadius: 6,
                      padding: "7px 14px",
                      fontSize: "0.76rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 1px 3px rgba(11,31,75,0.15)",
                    }}
                  >
                    <MapPinIcon size={13} />
                    <span>View on Project Map →</span>
                  </button>

                  {report.projectId && report.projectId !== "DR-UNSPECIFIED" && (
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${report.projectId}`)}
                      style={{
                        background: "#ffffff",
                        color: "#0b1f4b",
                        border: "1px solid #0b1f4b",
                        borderRadius: 6,
                        padding: "6px 12px",
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <FileTextIcon size={13} />
                      <span>Inspect Project Details ({report.projectId}) →</span>
                    </button>
                  )}

                  <a
                    href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}&t=k`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: "0.74rem",
                      color: "#166534",
                      fontWeight: 600,
                      textDecoration: "underline",
                      padding: "4px 8px",
                    }}
                  >
                    Satellite View ↗
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Official Review & Status Transition Panel — ONLY VISIBLE TO AUTHORIZED OFFICIALS */}
          {isOfficial && (
            <div
              style={{
                marginTop: 16,
                padding: "16px",
                background: "#f8fafc",
                border: "1px solid #cbd5e1",
                borderRadius: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <SlidersIcon size={15} className="text-slate-700" />
                  <span style={{ fontSize: "0.76rem", fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Officer Grievance Triage & Resolution Actions
                  </span>
                </div>
                <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#0b1f4b", background: "#e0e7ff", padding: "2px 8px", borderRadius: 4 }}>
                  Officer: {officerName}
                </span>
              </div>

              <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0 0 12px", lineHeight: 1.4 }}>
                Update the official status of this complaint in the central monitoring pipeline:
              </p>

              {/* Status Action Buttons */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {[
                  { key: "Submitted", label: "1. Submitted", note: "Grievance received and logged into central tracking system." },
                  { key: "Under Review", label: "2. Under Review", note: "Grievance taken under process. Assigned to regional field engineer for on-site inspection." },
                  { key: "Verified", label: "3. Verified", note: "Site inspection completed. Deficiency verified by inspecting engineer. Rectification notice issued." },
                  { key: "Resolved", label: "4. Resolved", note: "Rectification work completed and certified by department. Grievance resolved." },
                  { key: "Closed", label: "Close Case", note: "Case formally closed in records." },
                ].map((st) => {
                  const isActive = report.status === st.key
                  return (
                    <button
                      key={st.key}
                      type="button"
                      onClick={() => handleUpdateStatus(st.key as ReportStatus, st.note)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 6,
                        fontSize: "0.74rem",
                        fontWeight: isActive ? 700 : 500,
                        cursor: "pointer",
                        border: isActive ? "1.5px solid #0b1f4b" : "1px solid #cbd5e1",
                        background: isActive ? "#0b1f4b" : "#ffffff",
                        color: isActive ? "#ffffff" : "#334155",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {st.label}
                    </button>
                  )
                })}
              </div>

              {/* Custom remarks input */}
              <div style={{ marginTop: 10 }}>
                <label style={{ display: "block", fontSize: "0.7rem", fontWeight: 700, color: "#334155", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                  Official Remarks / Action Taken
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Enter official observation, inspection date, or compliance directives..."
                    style={{
                      flex: 1,
                      border: "1px solid #cbd5e1",
                      borderRadius: 6,
                      padding: "7px 12px",
                      fontSize: "0.76rem",
                      color: "#0f172a",
                      background: "#ffffff",
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    style={{
                      background: "#0b1f4b",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: 6,
                      padding: "7px 14px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Save Remarks
                  </button>
                </div>
              </div>

              {successMsg && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "6px 10px",
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    borderRadius: 6,
                    color: "#166534",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <CheckIcon size={12} className="text-emerald-700" />
                  <span>{successMsg}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 12 }}>
            Last updated: {updatedDate}
          </div>
        </div>
      )}
    </div>
  )
}

export default function MyReports() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [reports, setReports] = useState<CitizenReportRecord[]>([])
  const [filter, setFilter] = useState<"All" | ReportStatus>("All")

  const isOfficial = !!user && (user.role === "GOVERNMENT_OFFICER" || user.role === "ADMIN" || user.role === "FIELD_OFFICER")
  const officerName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : (user?.username || "Ministry Official")

  useEffect(() => {
    // Show cached data immediately for instant render, then refresh from API
    const cached = citizenReportService.getCached()
    if (cached.length > 0) setReports(cached)

    citizenReportService.getAll().then((data) => {
      setReports(data)
    }).catch((err) => {
      console.warn("[MyReports] API fetch failed, using cache:", err)
    })

    const handleReportsUpdate = (e: Event) => {
      const custom = e as CustomEvent
      if (Array.isArray(custom.detail)) setReports(custom.detail)
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
    <div style={{ padding: "24px 28px 48px", maxWidth: 960, margin: "0 auto" }}>
      {/* Top Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <h1
              style={{
                fontFamily: "var(--font-display, sans-serif)",
                fontSize: "1.5rem",
                fontWeight: 800,
                color: "#0f172a",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              {isOfficial ? "Citizen Grievances & Oversight Desk" : "My Reports"}
            </h1>
            {isOfficial && (
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  background: "#eff6ff",
                  color: "#1e40af",
                  padding: "2px 8px",
                  borderRadius: 4,
                  border: "1px solid #bfdbfe",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Official Desk
              </span>
            )}
          </div>
          <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>
            {isOfficial
              ? "Review citizen site complaints, verify quality defects, and inspect project coordinates."
              : "Track the status and official inspection responses for issues you have reported."}
          </p>
        </div>

        {!isOfficial && (
          <div>
            <button
              onClick={() => navigate("/report")}
              style={{
                background: "#0b1f4b",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 3px rgba(11, 31, 75, 0.15)",
              }}
            >
              <PlusIcon size={14} />
              <span>Submit New Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Clean Executive Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          marginBottom: 20,
        }}
      >
        {[
          {
            label: "Total Reports Filed",
            sub: "Public grievances logged",
            value: reports.length,
            icon: <FileTextIcon size={16} className="text-blue-900" />,
            iconBg: "#eff6ff",
            borderColor: "#e2e8f0",
          },
          {
            label: "Under Active Review",
            sub: "In inspection & triage",
            value: reports.filter((r) => r.status === "Submitted" || r.status === "Under Review").length,
            icon: <SearchIcon size={16} className="text-amber-800" />,
            iconBg: "#fef3c7",
            borderColor: "#e2e8f0",
          },
          {
            label: "Verified & Resolved",
            sub: "Remedial action taken",
            value: reports.filter((r) => r.status === "Verified" || r.status === "Resolved" || r.status === "Closed").length,
            icon: <CheckCircleIcon size={16} className="text-emerald-800" />,
            iconBg: "#f0fdf4",
            borderColor: "#e2e8f0",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "#ffffff",
              border: `1px solid ${s.borderColor}`,
              borderRadius: 10,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <div>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {s.label}
              </div>
              <div style={{ fontSize: "1.45rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.2, marginTop: 2, fontFamily: "var(--font-mono, monospace)" }}>
                {s.value}
              </div>
              <div style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: 2 }}>
                {s.sub}
              </div>
            </div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: s.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {(["All", "Submitted", "Under Review", "Verified", "Resolved", "Closed"] as const).map((tab) => {
          const isActive = filter === tab
          return counts[tab] > 0 || tab === "All" ? (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: "6px 14px",
                borderRadius: 20,
                border: "1px solid",
                borderColor: isActive ? "#0b1f4b" : "#e2e8f0",
                background: isActive ? "#0b1f4b" : "#ffffff",
                color: isActive ? "#ffffff" : "#64748b",
                fontSize: "0.75rem",
                fontWeight: isActive ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {tab} {counts[tab] > 0 && <span style={{ opacity: 0.75, marginLeft: 2 }}>({counts[tab]})</span>}
            </button>
          ) : null
        })}
      </div>

      {/* List of Reports */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "50px 20px",
            background: "#ffffff",
            border: "1px dashed #cbd5e1",
            borderRadius: 12,
          }}
        >
          <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
            <FileTextIcon size={20} className="text-slate-400" />
          </div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#334155", marginBottom: 4 }}>
            No grievances in this category
          </div>
          <p style={{ fontSize: "0.78rem", color: "#94a3b8", maxWidth: 380, margin: "0 auto 16px" }}>
            No reports currently match the selected status filter.
          </p>
          {!isOfficial && (
            <button
              onClick={() => navigate("/report")}
              style={{
                background: "#0b1f4b",
                color: "#ffffff",
                border: "none",
                borderRadius: 6,
                padding: "7px 16px",
                fontSize: "0.76rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Submit an Observation
            </button>
          )}
        </div>
      ) : (
        filtered.map((report, idx) => (
          <ReportCard
            key={report.id}
            report={report}
            defaultExpanded={idx === 0}
            isOfficial={isOfficial}
            officerName={officerName}
          />
        ))
      )}
    </div>
  )
}
