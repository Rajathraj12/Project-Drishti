import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { correctiveActionService } from "../services/correctiveActionService"
import { projectService } from "../services/projectService"
import { CorrectiveAction, ActionLifecycleStatus, ActionPriorityLevel } from "../types"
import { useAuth } from "../contexts/AuthContext"

export default function Actions() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  // State
  const [actions, setActions] = useState<CorrectiveAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get("status") || "ALL")
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL")
  const [overdueOnly, setOverdueOnly] = useState<boolean>(searchParams.get("overdue") === "true")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Modals & Active Action
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null)
  const [activeTab, setActiveTab] = useState<"overview" | "progress" | "review" | "audit">("overview")
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Create Form State
  const [createProject, setCreateProject] = useState(searchParams.get("project_id") || "DR-0001")
  const [createTitle, setCreateTitle] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [createReason, setCreateReason] = useState("")
  const [createPriority, setCreatePriority] = useState<ActionPriorityLevel>("HIGH")
  const [createDueDate, setCreateDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [createAssignee, setCreateAssignee] = useState("")
  const [createAgency, setCreateAgency] = useState("")
  const [createRiskId, setCreateRiskId] = useState("")
  const [createMlId, setCreateMlId] = useState("")
  const [createVerifId, setCreateVerifId] = useState("")
  const [createEvidence, setCreateEvidence] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Progress Update Form State
  const [progMessage, setProgMessage] = useState("")
  const [progPct, setProgPct] = useState<number>(50)
  const [progEvidence, setProgEvidence] = useState("")
  const [progLoading, setProgLoading] = useState(false)

  // Resolution Form State
  const [resSummary, setResSummary] = useState("")
  const [resEvidence, setResEvidence] = useState("")
  const [resLoading, setResLoading] = useState(false)

  // Review & Closure Form State
  const [reviewNotes, setReviewNotes] = useState("")
  const [reviewLoading, setReviewLoading] = useState(false)
  const [reopenReason, setReopenReason] = useState("")
  const [cancelReason, setCancelReason] = useState("")

  // Fetch Actions
  const fetchActions = async () => {
    setLoading(true)
    setError(null)
    try {
      const params: Record<string, any> = {}
      if (statusFilter !== "ALL") params.status = statusFilter
      if (priorityFilter !== "ALL") params.priority = priorityFilter
      if (overdueOnly) params.is_overdue = true

      const res = await correctiveActionService.getActions(params)
      setActions(res.results || [])
      
      // Update selected action if currently open
      if (selectedAction) {
        const updated = (res.results || []).find(a => a.action_id === selectedAction.action_id)
        if (updated) setSelectedAction(updated)
      }
    } catch (err: any) {
      console.error("Failed to load actions:", err)
      setError(err?.message || "Failed to load corrective actions from server.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActions()
  }, [statusFilter, priorityFilter, overdueOnly])

  // Filtered by Search
  const filteredActions = actions.filter(a => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      a.action_id.toLowerCase().includes(q) ||
      a.project_id.toLowerCase().includes(q) ||
      a.title.toLowerCase().includes(q) ||
      (a.assigned_to && a.assigned_to.toLowerCase().includes(q)) ||
      (a.assigned_agency && a.assigned_agency.toLowerCase().includes(q))
    )
  })

  // KPI Calculations
  const totalCount = actions.length
  const overdueCount = actions.filter(a => a.is_overdue).length
  const inProgressCount = actions.filter(a => a.status === "IN_PROGRESS" || a.status === "ASSIGNED").length
  const awaitingReviewCount = actions.filter(a => a.status === "AWAITING_REVIEW").length
  const closedCount = actions.filter(a => a.status === "CLOSED").length

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateLoading(true)
    setCreateError(null)
    try {
      const evidenceList = createEvidence
        .split(",")
        .map(s => s.trim())
        .filter(Boolean)

      const payload = {
        project_id: createProject,
        title: createTitle,
        description: createDesc,
        reason: createReason,
        priority: createPriority,
        due_date: createDueDate,
        assigned_to: createAssignee || undefined,
        assigned_agency: createAgency || undefined,
        risk_assessment_id: createRiskId || undefined,
        ml_assessment_id: createMlId || undefined,
        verification_id: createVerifId || undefined,
        evidence_ids: evidenceList.length > 0 ? evidenceList : undefined
      }

      await correctiveActionService.createAction(payload)
      setShowCreateModal(false)
      // Reset form
      setCreateTitle("")
      setCreateDesc("")
      setCreateReason("")
      setCreateAssignee("")
      setCreateAgency("")
      setCreateEvidence("")
      fetchActions()
    } catch (err: any) {
      console.error(err)
      setCreateError(err?.message || "Failed to create corrective action.")
    } finally {
      setCreateLoading(false)
    }
  }

  const handleProgressSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAction || !progMessage) return
    setProgLoading(true)
    try {
      const evList = progEvidence.split(",").map(s => s.trim()).filter(Boolean)
      const updated = await correctiveActionService.recordProgress(selectedAction.action_id, {
        message: progMessage,
        progress_pct: progPct,
        supporting_evidence: evList
      })
      setSelectedAction(updated)
      setProgMessage("")
      setProgEvidence("")
      fetchActions()
    } catch (err: any) {
      alert(err?.message || "Failed to record progress.")
    } finally {
      setProgLoading(false)
    }
  }

  const handleResolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAction || !resSummary) return
    setResLoading(true)
    try {
      const evList = resEvidence.split(",").map(s => s.trim()).filter(Boolean)
      const updated = await correctiveActionService.submitResolution(selectedAction.action_id, {
        resolution_summary: resSummary,
        supporting_evidence: evList
      })
      setSelectedAction(updated)
      setResSummary("")
      setResEvidence("")
      fetchActions()
    } catch (err: any) {
      alert(err?.message || "Failed to submit resolution.")
    } finally {
      setResLoading(false)
    }
  }

  const handleReview = async (approved: boolean) => {
    if (!selectedAction) return
    setReviewLoading(true)
    try {
      const updated = await correctiveActionService.reviewResolution(selectedAction.action_id, {
        approved,
        review_notes: reviewNotes || (approved ? "Resolution verified and accepted." : "Resolution returned for revisions.")
      })
      setSelectedAction(updated)
      setReviewNotes("")
      fetchActions()
    } catch (err: any) {
      alert(err?.message || "Review submission failed.")
    } finally {
      setReviewLoading(false)
    }
  }

  const handleReopen = async () => {
    if (!selectedAction || !reopenReason) return
    try {
      const updated = await correctiveActionService.reopenAction(selectedAction.action_id, {
        reopen_reason: reopenReason
      })
      setSelectedAction(updated)
      setReopenReason("")
      fetchActions()
    } catch (err: any) {
      alert(err?.message || "Failed to reopen action.")
    }
  }

  const handleCancel = async () => {
    if (!selectedAction || !cancelReason) return
    if (!confirm("Are you sure you want to cancel this corrective action? This will be recorded permanently in audit history.")) return
    try {
      const updated = await correctiveActionService.cancelAction(selectedAction.action_id, {
        cancellation_reason: cancelReason
      })
      setSelectedAction(updated)
      setCancelReason("")
      fetchActions()
    } catch (err: any) {
      alert(err?.message || "Failed to cancel action.")
    }
  }

  // Separation of Duties check for UI
  const isAssigneeOrSubmitter =
    selectedAction &&
    user?.username &&
    (selectedAction.assigned_to === user.username ||
      selectedAction.resolution_submitted_by === user.username)

  const canCreate = user?.role === "ADMIN" || user?.role === "GOVERNMENT_OFFICER"

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: "1.4rem" }}>🎯</span>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--color-navy-800)" }}>
              Corrective Actions & Follow-up
            </h1>
            <span style={{ fontSize: "0.72rem", background: "var(--color-navy-100)", color: "var(--color-navy-800)", padding: "2px 8px", borderRadius: 12, fontWeight: 600 }}>
              Audit-Ready Workflow
            </span>
          </div>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
            Lifecycle tracking, assignment, verification links, resolution reviews, and append-only audit trail.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="gov-button"
            style={{
              background: "var(--color-orange-500)",
              color: "white",
              padding: "8px 16px",
              borderRadius: 8,
              fontWeight: 600,
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 6px rgba(234,88,12,0.25)"
            }}
          >
            <span>+</span>
            <span>New Corrective Action</span>
          </button>
        )}
      </div>

      {/* Visible Escalation & Notification Gateway Notice */}
      <div
        style={{
          background: "linear-gradient(90deg, #fffbeb 0%, #fef3c7 100%)",
          border: "1px solid #fde68a",
          borderRadius: 8,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          fontSize: "0.8rem",
          color: "#92400e"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "1.1rem" }}>🔔</span>
          <span>
            <strong>System Notice:</strong> In-app deadline & overdue escalation tracking active. Actions exceeding their target due date are highlighted for administrative review.
          </span>
        </div>
        {overdueCount > 0 && (
          <span style={{ background: "#dc2626", color: "white", padding: "2px 10px", borderRadius: 12, fontWeight: 700, fontSize: "0.75rem" }}>
            {overdueCount} OVERDUE ACTIONS
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 22 }}>
        <div className="gov-card" style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Total Actions</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-navy-800)", marginTop: 4 }}>{totalCount}</div>
        </div>

        <div className="gov-card" style={{ padding: "14px 18px", borderLeft: overdueCount > 0 ? "4px solid #dc2626" : undefined }}>
          <div style={{ fontSize: "0.75rem", color: "#b91c1c", fontWeight: 600 }}>Overdue Escalations</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#dc2626", marginTop: 4 }}>
            {overdueCount}
          </div>
        </div>

        <div className="gov-card" style={{ padding: "14px 18px", borderLeft: "4px solid #0284c7" }}>
          <div style={{ fontSize: "0.75rem", color: "#0369a1", fontWeight: 600 }}>In Progress / Assigned</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0284c7", marginTop: 4 }}>{inProgressCount}</div>
        </div>

        <div className="gov-card" style={{ padding: "14px 18px", borderLeft: "4px solid #d97706" }}>
          <div style={{ fontSize: "0.75rem", color: "#b45309", fontWeight: 600 }}>Awaiting Review</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#d97706", marginTop: 4 }}>{awaitingReviewCount}</div>
        </div>

        <div className="gov-card" style={{ padding: "14px 18px", borderLeft: "4px solid #16a34a" }}>
          <div style={{ fontSize: "0.75rem", color: "#15803d", fontWeight: 600 }}>Closed & Resolved</div>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a", marginTop: 4 }}>{closedCount}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="gov-card"
        style={{
          padding: "12px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          {/* Status Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Status:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "white" }}
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="AWAITING_REVIEW">Awaiting Review</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{ fontSize: "0.78rem", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--color-border)", background: "white" }}
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Overdue checkbox */}
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, color: overdueOnly ? "#dc2626" : "var(--color-text-muted)" }}>
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={e => setOverdueOnly(e.target.checked)}
              style={{ accentColor: "#dc2626" }}
            />
            <span>⚠️ Overdue Only</span>
          </label>
        </div>

        {/* Search */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="text"
            placeholder="Search by ID, Project, Title, Assignee..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              padding: "5px 12px",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              fontSize: "0.78rem",
              width: 260
            }}
          />
        </div>
      </div>

      {/* Action Table / List */}
      {loading ? (
        <div className="gov-card" style={{ padding: 40, textAlign: "center", color: "var(--color-text-muted)" }}>
          Loading corrective actions...
        </div>
      ) : error ? (
        <div className="gov-card" style={{ padding: 30, textAlign: "center", color: "#dc2626", background: "#fef2f2", border: "1px solid #fecaca" }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Error Loading Actions</div>
          <div style={{ fontSize: "0.85rem" }}>{error}</div>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="gov-card" style={{ padding: 48, textAlign: "center", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: 12 }}>📋</div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 4 }}>No Corrective Actions Found</h3>
          <p style={{ fontSize: "0.82rem" }}>No records match the selected status, priority, or search criteria.</p>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="gov-button"
              style={{ marginTop: 14, background: "var(--color-navy-800)", color: "white", padding: "6px 14px", borderRadius: 6, fontSize: "0.8rem" }}
            >
              + Create First Corrective Action
            </button>
          )}
        </div>
      ) : (
        <div className="gov-card" style={{ overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "var(--color-navy-50)", borderBottom: "1px solid var(--color-border)", color: "var(--color-navy-900)" }}>
                <th style={{ padding: "12px 16px", fontWeight: 700 }}>Action ID & Project</th>
                <th style={{ padding: "12px 16px", fontWeight: 700 }}>Title & Reason</th>
                <th style={{ padding: "12px 16px", fontWeight: 700 }}>Priority & Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 700 }}>Assignee / Agency</th>
                <th style={{ padding: "12px 16px", fontWeight: 700 }}>Due Date & Escalation</th>
                <th style={{ padding: "12px 16px", fontWeight: 700, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.map(action => {
                const isOverdue = action.is_overdue
                const pColor =
                  action.priority === "CRITICAL"
                    ? "#dc2626"
                    : action.priority === "HIGH"
                    ? "#ea580c"
                    : action.priority === "MEDIUM"
                    ? "#d97706"
                    : "#2563eb"

                const sColor =
                  action.status === "CLOSED"
                    ? "#16a34a"
                    : action.status === "AWAITING_REVIEW"
                    ? "#d97706"
                    : action.status === "IN_PROGRESS"
                    ? "#0284c7"
                    : action.status === "CANCELLED"
                    ? "#6b7280"
                    : action.status === "REOPENED"
                    ? "#ef4444"
                    : "#4f46e5"

                return (
                  <tr
                    key={action.action_id}
                    style={{ borderBottom: "1px solid var(--color-border)", transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--color-surface-hover)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Action ID & Project */}
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <div style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-navy-900)" }}>
                        {action.action_id}
                      </div>
                      <div
                        onClick={() => navigate(`/projects/${action.project_id}`)}
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--color-orange-600)",
                          cursor: "pointer",
                          fontWeight: 600,
                          marginTop: 2
                        }}
                      >
                        Project: {action.project_id} ↗
                      </div>
                    </td>

                    {/* Title & Reason */}
                    <td style={{ padding: "12px 16px", verticalAlign: "top", maxWidth: 300 }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 3 }}>
                        {action.title}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", lineHeight: 1.3 }}>
                        {action.reason}
                      </div>

                      {/* Finding Link Tags */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                        {action.risk_assessment_id && (
                          <span style={{ fontSize: "0.65rem", background: "#fef3c7", color: "#92400e", padding: "1px 6px", borderRadius: 4 }}>
                            Rule Finding: {action.risk_assessment_id}
                          </span>
                        )}
                        {action.ml_assessment_id && (
                          <span style={{ fontSize: "0.65rem", background: "#f3e8ff", color: "#6b21a8", padding: "1px 6px", borderRadius: 4 }}>
                            ML Finding: {action.ml_assessment_id}
                          </span>
                        )}
                        {action.evidence_ids && action.evidence_ids.length > 0 && (
                          <span style={{ fontSize: "0.65rem", background: "#e0f2fe", color: "#0369a1", padding: "1px 6px", borderRadius: 4 }}>
                            📸 {action.evidence_ids.length} Evidence
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Priority & Status */}
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: pColor,
                            background: `${pColor}15`,
                            border: `1px solid ${pColor}30`,
                            padding: "2px 8px",
                            borderRadius: 6
                          }}
                        >
                          {action.priority}
                        </span>

                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: sColor,
                            background: `${sColor}15`,
                            border: `1px solid ${sColor}30`,
                            padding: "2px 8px",
                            borderRadius: 6
                          }}
                        >
                          {action.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>

                    {/* Assignee / Agency */}
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>
                        {action.assigned_to || "Unassigned"}
                      </div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        {action.assigned_agency || "Internal Officer"}
                      </div>
                    </td>

                    {/* Due Date & Escalation */}
                    <td style={{ padding: "12px 16px", verticalAlign: "top" }}>
                      <div>{action.due_date ? new Date(action.due_date).toLocaleDateString() : "—"}</div>
                      {isOverdue ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 3, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "2px 6px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700, marginTop: 4 }}>
                          <span>⚠️ Overdue by {action.days_overdue}d</span>
                        </div>
                      ) : action.days_remaining !== undefined && action.days_remaining !== null ? (
                        <div style={{ fontSize: "0.7rem", color: "#16a34a", marginTop: 2 }}>
                          ⏱️ {action.days_remaining}d remaining
                        </div>
                      ) : null}
                    </td>

                    {/* Action button */}
                    <td style={{ padding: "12px 16px", verticalAlign: "top", textAlign: "right" }}>
                      <button
                        onClick={() => {
                          setSelectedAction(action)
                          setActiveTab("overview")
                        }}
                        style={{
                          background: "var(--color-navy-700)",
                          color: "white",
                          border: "none",
                          padding: "5px 12px",
                          borderRadius: 6,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        Inspect & Update →
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* DETAIL DRAWER / MODAL */}
      {selectedAction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "flex-end"
          }}
          onClick={() => setSelectedAction(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 750,
              background: "white",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.15)"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "18px 24px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                background: "var(--color-navy-50)"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "1.1rem", color: "var(--color-navy-900)" }}>
                    {selectedAction.action_id}
                  </span>
                  <span style={{ fontSize: "0.7rem", background: "var(--color-orange-100)", color: "var(--color-orange-800)", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                    Project {selectedAction.project_id}
                  </span>
                  {selectedAction.is_overdue && (
                    <span style={{ fontSize: "0.7rem", background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", padding: "2px 8px", borderRadius: 10, fontWeight: 700 }}>
                      ⚠️ OVERDUE
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--color-navy-800)" }}>
                  {selectedAction.title}
                </div>
              </div>

              <button
                onClick={() => setSelectedAction(null)}
                style={{ background: "none", border: "none", fontSize: "1.2rem", cursor: "pointer", color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs inside Drawer */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", padding: "0 24px", background: "white" }}>
              <button
                onClick={() => setActiveTab("overview")}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: activeTab === "overview" ? "2px solid var(--color-orange-500)" : "2px solid transparent",
                  color: activeTab === "overview" ? "var(--color-orange-600)" : "var(--color-text-muted)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  background: "none"
                }}
              >
                Overview & Lineage
              </button>

              <button
                onClick={() => setActiveTab("progress")}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: activeTab === "progress" ? "2px solid var(--color-orange-500)" : "2px solid transparent",
                  color: activeTab === "progress" ? "var(--color-orange-600)" : "var(--color-text-muted)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  background: "none"
                }}
              >
                Progress Updates ({selectedAction.progress_updates?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab("review")}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: activeTab === "review" ? "2px solid var(--color-orange-500)" : "2px solid transparent",
                  color: activeTab === "review" ? "var(--color-orange-600)" : "var(--color-text-muted)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  background: "none"
                }}
              >
                Resolution & Governance
              </button>

              <button
                onClick={() => setActiveTab("audit")}
                style={{
                  padding: "10px 16px",
                  border: "none",
                  borderBottom: activeTab === "audit" ? "2px solid var(--color-orange-500)" : "2px solid transparent",
                  color: activeTab === "audit" ? "var(--color-orange-600)" : "var(--color-text-muted)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                  cursor: "pointer",
                  background: "none"
                }}
              >
                Audit Trail ({selectedAction.audit_history?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {/* TAB 1: OVERVIEW & LINEAGE */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {/* Status, Priority, Assignee Grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "var(--color-surface)", padding: 14, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Workflow Status</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-navy-800)", marginTop: 2 }}>
                        {selectedAction.status}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Priority</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-orange-600)", marginTop: 2 }}>
                        {selectedAction.priority}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Assigned To</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)", marginTop: 2 }}>
                        {selectedAction.assigned_to || "Unassigned"} ({selectedAction.assigned_agency || "N/A"})
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600 }}>Due Date</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)", marginTop: 2 }}>
                        {selectedAction.due_date ? new Date(selectedAction.due_date).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>

                  {/* Description & Reason */}
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 4 }}>Detailed Description</div>
                    <div style={{ fontSize: "0.82rem", background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid var(--color-border)", color: "var(--color-text-primary)", lineHeight: 1.4 }}>
                      {selectedAction.description}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 4 }}>Reason for Action</div>
                    <div style={{ fontSize: "0.82rem", background: "#f8fafc", padding: 12, borderRadius: 6, border: "1px solid var(--color-border)", color: "var(--color-text-primary)", lineHeight: 1.4 }}>
                      {selectedAction.reason}
                    </div>
                  </div>

                  {/* Connected Finding Lineage Trace */}
                  <div style={{ marginTop: 6, borderTop: "1px solid var(--color-border)", paddingTop: 14 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 8 }}>
                      Connected Project Findings Lineage
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: "0.78rem" }}>
                        <span style={{ fontWeight: 700, minWidth: 140 }}>Rule-Based Risk Finding:</span>
                        <span>{selectedAction.risk_assessment_id || "None linked directly"}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: "0.78rem" }}>
                        <span style={{ fontWeight: 700, minWidth: 140 }}>ML Anomaly Finding:</span>
                        <span>{selectedAction.ml_assessment_id || "None linked directly"}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: "0.78rem" }}>
                        <span style={{ fontWeight: 700, minWidth: 140 }}>Verification Record:</span>
                        <span>{selectedAction.verification_id || "None linked directly"}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f8fafc", borderRadius: 6, fontSize: "0.78rem" }}>
                        <span style={{ fontWeight: 700, minWidth: 140 }}>Supporting Evidence:</span>
                        <span>
                          {selectedAction.evidence_ids && selectedAction.evidence_ids.length > 0
                            ? selectedAction.evidence_ids.join(", ")
                            : "No evidence IDs linked"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Resolution Summary if available */}
                  {selectedAction.resolution_summary && (
                    <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 14, borderRadius: 6 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#065f46", marginBottom: 4 }}>
                        Submitted Resolution Summary (by {selectedAction.resolution_submitted_by})
                      </div>
                      <div style={{ fontSize: "0.82rem", color: "#047857" }}>
                        {selectedAction.resolution_summary}
                      </div>
                      {selectedAction.closure_reviewer && (
                        <div style={{ fontSize: "0.72rem", color: "#065f46", marginTop: 6, borderTop: "1px solid #a7f3d0", paddingTop: 4 }}>
                          Reviewed & Approved by: <strong>{selectedAction.closure_reviewer}</strong> ({selectedAction.closure_reviewed_at})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PROGRESS UPDATES */}
              {activeTab === "progress" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Submission form */}
                  {selectedAction.status !== "CLOSED" && selectedAction.status !== "CANCELLED" && (
                    <form onSubmit={handleProgressSubmit} style={{ background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 8 }}>
                        Record Work Progress Update
                      </div>

                      <textarea
                        required
                        placeholder="Describe completed work, field findings, or corrective steps executed..."
                        value={progMessage}
                        onChange={e => setProgMessage(e.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem", marginBottom: 8 }}
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                        <div>
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Progress Completed (%):</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={progPct}
                            onChange={e => setProgPct(Number(e.target.value))}
                            style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Supporting Evidence IDs (comma-separated):</label>
                          <input
                            type="text"
                            placeholder="e.g. E001, E005"
                            value={progEvidence}
                            onChange={e => setProgEvidence(e.target.value)}
                            style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={progLoading}
                        style={{
                          background: "var(--color-navy-800)",
                          color: "white",
                          border: "none",
                          padding: "6px 14px",
                          borderRadius: 6,
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          cursor: "pointer"
                        }}
                      >
                        {progLoading ? "Submitting..." : "Post Progress Update"}
                      </button>
                    </form>
                  )}

                  {/* Timeline list */}
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 12 }}>
                      Progress History Timeline
                    </div>

                    {(!selectedAction.progress_updates || selectedAction.progress_updates.length === 0) ? (
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.8rem", textAlign: "center", padding: 20 }}>
                        No progress updates recorded yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {selectedAction.progress_updates.map(upd => (
                          <div key={upd.update_id} style={{ borderLeft: "3px solid var(--color-orange-500)", paddingLeft: 12, paddingBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-800)" }}>
                                {upd.actor_name} ({upd.actor_role})
                              </span>
                              <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                                {new Date(upd.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-primary)", lineHeight: 1.3 }}>
                              {upd.message}
                            </div>

                            {upd.progress_pct !== undefined && upd.progress_pct !== null && (
                              <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                                <div style={{ flex: 1, background: "#e2e8f0", height: 6, borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{ width: `${upd.progress_pct}%`, background: "var(--color-orange-500)", height: "100%" }} />
                                </div>
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                                  {upd.progress_pct}%
                                </span>
                              </div>
                            )}

                            {upd.supporting_evidence && upd.supporting_evidence.length > 0 && (
                              <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
                                {upd.supporting_evidence.map(ev => (
                                  <span key={ev} style={{ fontSize: "0.65rem", background: "#e0f2fe", color: "#0284c7", padding: "1px 6px", borderRadius: 4 }}>
                                    📸 {ev}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: RESOLUTION & GOVERNANCE */}
              {activeTab === "review" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Separation of Duties Warning */}
                  {isAssigneeOrSubmitter && (
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", padding: 12, borderRadius: 6, color: "#b91c1c", fontSize: "0.78rem" }}>
                      <strong>⚠️ Separation of Duties Governance Notice:</strong>
                      <p style={{ marginTop: 2, marginBottom: 0 }}>
                        You are recorded as the assignee or resolution submitter for this corrective action.
                        Under Project Drishti governance policy, you cannot approve your own resolution closure. Another authorized officer must review and close this action.
                      </p>
                    </div>
                  )}

                  {/* 1. Submit Resolution for Review (Assignee or Field Officer) */}
                  {selectedAction.status !== "CLOSED" && selectedAction.status !== "CANCELLED" && (
                    <div className="gov-card" style={{ padding: 16 }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 6 }}>
                        1. Submit Resolution for Formal Review
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 10 }}>
                        Summarize corrective measures implemented and provide supporting evidence for closure.
                      </p>

                      <form onSubmit={handleResolutionSubmit}>
                        <textarea
                          required
                          placeholder="Provide detailed resolution summary explaining how the finding/risk was resolved..."
                          value={resSummary}
                          onChange={e => setResSummary(e.target.value)}
                          rows={3}
                          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem", marginBottom: 8 }}
                        />

                        <input
                          type="text"
                          placeholder="Evidence references (e.g. E001, E004)"
                          value={resEvidence}
                          onChange={e => setResEvidence(e.target.value)}
                          style={{ width: "100%", padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem", marginBottom: 10 }}
                        />

                        <button
                          type="submit"
                          disabled={resLoading || selectedAction.status === "AWAITING_REVIEW"}
                          style={{
                            background: "var(--color-orange-500)",
                            color: "white",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: 6,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            cursor: selectedAction.status === "AWAITING_REVIEW" ? "not-allowed" : "pointer",
                            opacity: selectedAction.status === "AWAITING_REVIEW" ? 0.6 : 1
                          }}
                        >
                          {resLoading ? "Submitting..." : selectedAction.status === "AWAITING_REVIEW" ? "Resolution Already Submitted" : "Submit Resolution for Review"}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* 2. Review Resolution & Closure Decision (Admin / Gov Officer only) */}
                  {selectedAction.status === "AWAITING_REVIEW" && (
                    <div className="gov-card" style={{ padding: 16, borderLeft: "4px solid #16a34a" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 4 }}>
                        2. Review Resolution & Closure Approval
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 10 }}>
                        Examine the submitted resolution and decide whether to close the action or return for rework.
                      </p>

                      <textarea
                        placeholder="Reviewer notes / feedback..."
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        rows={2}
                        style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem", marginBottom: 10 }}
                      />

                      <div style={{ display: "flex", gap: 10 }}>
                        <button
                          type="button"
                          disabled={reviewLoading || isAssigneeOrSubmitter}
                          onClick={() => handleReview(true)}
                          style={{
                            background: isAssigneeOrSubmitter ? "#9ca3af" : "#16a34a",
                            color: "white",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: 6,
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: isAssigneeOrSubmitter ? "not-allowed" : "pointer"
                          }}
                        >
                          ✓ Approve & Formally Close
                        </button>

                        <button
                          type="button"
                          disabled={reviewLoading}
                          onClick={() => handleReview(false)}
                          style={{
                            background: "#dc2626",
                            color: "white",
                            border: "none",
                            padding: "6px 14px",
                            borderRadius: 6,
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          ✕ Reject & Return to In-Progress
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 3. Reopen & Cancel Controls */}
                  <div className="gov-card" style={{ padding: 16 }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 10 }}>
                      3. Administrative Override (Reopen or Cancel)
                    </div>

                    {selectedAction.status === "CLOSED" && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>Reopen Closed Action:</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="text"
                            placeholder="State reason for reopening action..."
                            value={reopenReason}
                            onChange={e => setReopenReason(e.target.value)}
                            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                          />
                          <button
                            type="button"
                            onClick={handleReopen}
                            style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            Reopen Action
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedAction.status !== "CLOSED" && selectedAction.status !== "CANCELLED" && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 4 }}>Cancel Action:</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="text"
                            placeholder="State reason for cancelling (e.g. duplicate finding)..."
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                          />
                          <button
                            type="button"
                            onClick={handleCancel}
                            style={{ background: "#6b7280", color: "white", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: "0.75rem", fontWeight: 600, cursor: "pointer" }}
                          >
                            Cancel Action
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: AUDIT TRAIL */}
              {activeTab === "audit" && (
                <div>
                  <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 12 }}>
                    Append-Only Action Audit History
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(selectedAction.audit_history || []).map((evt, idx) => (
                      <div key={evt.event_id || idx} style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 6, border: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>
                            {evt.event_type}
                          </span>
                          <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: 4 }}>
                          Actor: <strong>{evt.actor_username}</strong> ({evt.actor_role})
                        </div>

                        {evt.details && Object.keys(evt.details).length > 0 && (
                          <pre style={{ margin: 0, padding: 6, background: "#f1f5f9", borderRadius: 4, fontSize: "0.68rem", overflowX: "auto" }}>
                            {JSON.stringify(evt.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 620,
              background: "white",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", background: "var(--color-navy-900)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 700, fontSize: "1rem" }}>Initiate Corrective Action</div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12, maxHeight: "80vh", overflowY: "auto" }}>
              {createError && (
                <div style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "8px 12px", borderRadius: 6, fontSize: "0.78rem" }}>
                  {createError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)" }}>Project ID *</label>
                  <input
                    required
                    type="text"
                    value={createProject}
                    onChange={e => setCreateProject(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)" }}>Priority *</label>
                  <select
                    value={createPriority}
                    onChange={e => setCreatePriority(e.target.value as ActionPriorityLevel)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)" }}>Action Title *</label>
                <input
                  required
                  placeholder="e.g. Rectify compaction failure on Chainage 12+000"
                  type="text"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)" }}>Detailed Description *</label>
                <textarea
                  required
                  placeholder="Detail the defect, non-compliance, or discrepancy..."
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)" }}>Reason / Finding Trigger *</label>
                <input
                  required
                  placeholder="e.g. Field inspection failure or ML expenditure-progress anomaly"
                  type="text"
                  value={createReason}
                  onChange={e => setCreateReason(e.target.value)}
                  style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)" }}>Due Date *</label>
                  <input
                    required
                    type="date"
                    value={createDueDate}
                    onChange={e => setCreateDueDate(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)" }}>Assign Responsibility</label>
                  <input
                    type="text"
                    placeholder="Assignee username"
                    value={createAssignee}
                    onChange={e => setCreateAssignee(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.78rem" }}
                  />
                </div>
              </div>

              {/* Finding Linkages */}
              <div style={{ background: "#f8fafc", padding: 10, borderRadius: 6, border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 6 }}>
                  Connect to Existing Findings (Optional)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <input
                    type="text"
                    placeholder="Risk Assessment ID"
                    value={createRiskId}
                    onChange={e => setCreateRiskId(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--color-border)", fontSize: "0.72rem" }}
                  />
                  <input
                    type="text"
                    placeholder="ML Assessment ID"
                    value={createMlId}
                    onChange={e => setCreateMlId(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--color-border)", fontSize: "0.72rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Verification ID"
                    value={createVerifId}
                    onChange={e => setCreateVerifId(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--color-border)", fontSize: "0.72rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Evidence IDs (e.g. E001, E003)"
                    value={createEvidence}
                    onChange={e => setCreateEvidence(e.target.value)}
                    style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid var(--color-border)", fontSize: "0.72rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "#f1f5f9", color: "var(--color-navy-800)", border: "none", padding: "7px 14px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{ background: "var(--color-orange-500)", color: "white", border: "none", padding: "7px 16px", borderRadius: 6, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {createLoading ? "Creating..." : "Save Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
