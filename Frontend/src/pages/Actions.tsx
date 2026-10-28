import { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { correctiveActionService } from "../services/correctiveActionService"
import { CorrectiveAction, ActionPriorityLevel } from "../types"
import { useAuth } from "../contexts/AuthContext"

// --- Custom Modern SVG Icons (Zero Emojis) ---
function ShieldCheckIcon({ className = "w-5 h-5", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}

function AlertOctagonIcon({ className = "w-5 h-5", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ClockIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function CheckCircleIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}

function ActivityIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  )
}

function SearchIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function FilterIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

function PlusIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function ArrowUpRightIcon({ className = "w-3 h-3", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  )
}

function ChevronRightIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function UserIcon({ className = "w-3.5 h-3.5", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function RefreshIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function LayersIcon({ className = "w-4 h-4", color = "currentColor" }: { className?: string; color?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}

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

  const isAssigneeOrSubmitter =
    selectedAction &&
    user?.username &&
    (selectedAction.assigned_to === user.username ||
      selectedAction.resolution_submitted_by === user.username)

  const canCreate = user?.role === "ADMIN" || user?.role === "GOVERNMENT_OFFICER"

  return (
    <div style={{ padding: "28px 32px 64px", maxWidth: 1440, margin: "0 auto", color: "var(--color-text-secondary)" }}>
      {/* =========================================================================
          1. ENTERPRISE COMMAND HEADER
          ========================================================================= */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 20, marginBottom: 24 }}>
        <div>
          {/* Title with Icon */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, rgba(15, 42, 107, 0.08) 0%, rgba(245, 158, 11, 0.12) 100%)",
                border: "1px solid rgba(15, 42, 107, 0.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-navy-800)",
                boxShadow: "0 2px 8px rgba(15, 42, 107, 0.04)"
              }}
            >
              <ShieldCheckIcon color="#0f2a6b" />
            </div>
            <div>
              <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 800, color: "var(--color-navy-900)", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.2 }}>
                Corrective Actions & SLA Enforcement
              </h1>
              <p style={{ margin: "4px 0 0", color: "var(--color-text-muted)", fontSize: "0.85rem", maxWidth: 680, lineHeight: 1.45 }}>
                Enforce project milestones, track mitigation timelines, and orchestrate cross-agency accountability across all flagged infrastructure works.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                color: "white",
                padding: "10px 18px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 8,
                border: "none",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35)",
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = "translateY(-1.5px)"
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(217, 119, 6, 0.45)"
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(217, 119, 6, 0.35)"
              }}
            >
              <PlusIcon color="white" />
              <span>Issue Corrective Directive</span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          3. EXECUTIVE KPI COMMAND TILES
          ========================================================================= */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16, marginBottom: 26 }}>
        {/* Total Directives */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            padding: "18px 20px",
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 10px rgba(15, 42, 107, 0.03)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Remediation Directives
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--color-navy-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LayersIcon color="var(--color-navy-700)" />
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "var(--color-navy-900)", letterSpacing: "-0.03em" }}>
            {totalCount}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
            <span>Lifecycle registry</span>
          </div>
        </div>

        {/* Overdue Escalations */}
        <div
          style={{
            background: overdueCount > 0 ? "linear-gradient(180deg, #ffffff 0%, #fff5f5 100%)" : "white",
            borderRadius: 14,
            padding: "18px 20px",
            border: overdueCount > 0 ? "1px solid rgba(220, 38, 38, 0.3)" : "1px solid var(--color-border)",
            boxShadow: overdueCount > 0 ? "0 4px 14px rgba(220, 38, 38, 0.08)" : "0 2px 10px rgba(15, 42, 107, 0.03)",
            position: "relative",
            overflow: "hidden"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: overdueCount > 0 ? "#b91c1c" : "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              SLA Overdue
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: overdueCount > 0 ? "#fee2e2" : "var(--color-navy-50)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <AlertOctagonIcon color={overdueCount > 0 ? "#dc2626" : "var(--color-text-muted)"} />
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: overdueCount > 0 ? "#dc2626" : "var(--color-navy-900)", letterSpacing: "-0.03em" }}>
            {overdueCount}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.72rem", color: overdueCount > 0 ? "#dc2626" : "var(--color-text-muted)", fontWeight: 600 }}>
            <span>{overdueCount > 0 ? "Immediate officer attention required" : "Zero pending escalations"}</span>
          </div>
        </div>

        {/* In Progress */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            padding: "18px 20px",
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 10px rgba(15, 42, 107, 0.03)",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Field Execution
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ActivityIcon color="#0284c7" />
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#0284c7", letterSpacing: "-0.03em" }}>
            {inProgressCount}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
            <span>Active assignments</span>
          </div>
        </div>

        {/* Awaiting Review */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            padding: "18px 20px",
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 10px rgba(15, 42, 107, 0.03)",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#b45309", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Pending Verification
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ClockIcon color="#d97706" />
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#d97706", letterSpacing: "-0.03em" }}>
            {awaitingReviewCount}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
            <span>Awaiting supervisor sign-off</span>
          </div>
        </div>

        {/* Closed & Resolved */}
        <div
          style={{
            background: "white",
            borderRadius: 14,
            padding: "18px 20px",
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 10px rgba(15, 42, 107, 0.03)",
            position: "relative"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#15803d", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Verified & Closed
            </span>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircleIcon color="#16a34a" />
            </div>
          </div>
          <div style={{ fontSize: "1.9rem", fontWeight: 800, color: "#16a34a", letterSpacing: "-0.03em" }}>
            {closedCount}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4, fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
            <span>{totalCount > 0 ? `${Math.round((closedCount / totalCount) * 100)}% resolution rate` : "Audited records"}</span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. COMMAND BAR & SEGMENTED FILTER STRIP
          ========================================================================= */}
      <div
        style={{
          background: "white",
          borderRadius: 14,
          padding: "14px 18px",
          border: "1px solid var(--color-border)",
          boxShadow: "0 2px 8px rgba(15, 42, 107, 0.03)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20
        }}
      >
        {/* Quick Segmented Tabs */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {[
            { id: "ALL", label: "All Directives" },
            { id: "IN_PROGRESS", label: "In Execution" },
            { id: "AWAITING_REVIEW", label: "Pending Sign-off" },
            { id: "RESOLVED", label: "Resolved" },
            { id: "CLOSED", label: "Closed & Audited" }
          ].map(tab => {
            const isSelected = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  background: isSelected ? "var(--color-navy-800)" : "#f8fafc",
                  color: isSelected ? "white" : "var(--color-text-secondary)",
                  border: isSelected ? "1px solid var(--color-navy-800)" : "1px solid var(--color-border-light)",
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: "0.78rem",
                  fontWeight: isSelected ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Right Filter Selectors & Search */}
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          {/* Priority dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-muted)" }}>Priority:</span>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              style={{
                fontSize: "0.78rem",
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "#f8fafc",
                color: "var(--color-text-primary)",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <option value="ALL">All Levels</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "var(--color-text-muted)" }}>
              <SearchIcon color="var(--color-text-muted)" />
            </div>
            <input
              type="text"
              placeholder="Search ID, title, officer, agency..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: "7px 12px 7px 32px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "#f8fafc",
                fontSize: "0.78rem",
                width: 260,
                color: "var(--color-text-primary)",
                outline: "none",
                transition: "border-color 0.2s ease"
              }}
              onFocus={e => (e.target.style.borderColor = "var(--color-orange-500)")}
              onBlur={e => (e.target.style.borderColor = "var(--color-border)")}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. REGISTRY LIST & RECORD INSPECTION TABLE
          ========================================================================= */}
      {loading ? (
        <div
          style={{
            background: "white",
            borderRadius: 14,
            padding: "60px 20px",
            textAlign: "center",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
          }}
        >
          <div style={{ display: "inline-block", width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "var(--color-navy-800)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 14, fontSize: "0.85rem", fontWeight: 600 }}>Syncing corrective action records...</p>
        </div>
      ) : error ? (
        <div
          style={{
            background: "#fff5f5",
            borderRadius: 14,
            padding: "24px",
            textAlign: "center",
            border: "1px solid #fecaca",
            color: "#dc2626"
          }}
        >
          <AlertOctagonIcon color="#dc2626" className="mx-auto mb-2" />
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>Service Synchronization Interruption</div>
          <div style={{ fontSize: "0.82rem", marginTop: 4, color: "#b91c1c" }}>{error}</div>
          <button
            onClick={() => fetchActions()}
            style={{
              marginTop: 12,
              background: "#dc2626",
              color: "white",
              border: "none",
              padding: "6px 14px",
              borderRadius: 6,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Retry Connection
          </button>
        </div>
      ) : filteredActions.length === 0 ? (
        <div
          style={{
            background: "white",
            borderRadius: 14,
            padding: "60px 20px",
            textAlign: "center",
            border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)"
          }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "var(--color-navy-50)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 12
            }}
          >
            <ShieldCheckIcon color="var(--color-navy-700)" />
          </div>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--color-navy-900)", margin: "0 0 6px" }}>
            No Corrective Directives Matching Filter
          </h3>
          <p style={{ fontSize: "0.82rem", maxWidth: 440, margin: "0 auto", lineHeight: 1.45 }}>
            No records match the current status, urgency filter, or keyword criteria.
          </p>
          {canCreate && (
            <button
              onClick={() => setShowCreateModal(true)}
              style={{
                marginTop: 18,
                background: "var(--color-navy-800)",
                color: "white",
                padding: "8px 18px",
                borderRadius: 8,
                fontSize: "0.82rem",
                fontWeight: 600,
                border: "none",
                cursor: "pointer"
              }}
            >
              + Initiate New Corrective Action
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            background: "white",
            borderRadius: 14,
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 10px rgba(15, 42, 107, 0.03)",
            overflow: "hidden"
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1px solid var(--color-border)", color: "var(--color-navy-900)" }}>
                <th style={{ padding: "14px 18px", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Directive & Target</th>
                <th style={{ padding: "14px 18px", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Subject & Audit Trigger</th>
                <th style={{ padding: "14px 18px", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Urgency & Stage</th>
                <th style={{ padding: "14px 18px", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Assigned Authority</th>
                <th style={{ padding: "14px 18px", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>SLA Timeline</th>
                <th style={{ padding: "14px 18px", fontWeight: 800, fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.05em", textAlign: "right" }}>Operation</th>
              </tr>
            </thead>
            <tbody>
              {filteredActions.map((action, idx) => {
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
                    key={action.action_id || idx}
                    style={{
                      borderBottom: "1px solid var(--color-border-light)",
                      transition: "background 0.15s ease",
                      background: isOverdue ? "rgba(254, 242, 242, 0.35)" : "transparent"
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = isOverdue ? "rgba(254, 226, 226, 0.45)" : "#f8fafc")}
                    onMouseLeave={e => (e.currentTarget.style.background = isOverdue ? "rgba(254, 242, 242, 0.35)" : "transparent")}
                  >
                    {/* Action ID & Project */}
                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                      <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "0.82rem", color: "var(--color-navy-900)" }}>
                        {action.action_id}
                      </div>
                      <div
                        onClick={() => navigate(`/projects/${action.project_id}`)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          fontSize: "0.72rem",
                          color: "var(--color-navy-600)",
                          cursor: "pointer",
                          fontWeight: 700,
                          marginTop: 4,
                          padding: "2px 6px",
                          background: "var(--color-navy-50)",
                          borderRadius: 4,
                          border: "1px solid rgba(15, 42, 107, 0.08)"
                        }}
                      >
                        <span>Project: {action.project_id}</span>
                        <ArrowUpRightIcon color="var(--color-navy-600)" />
                      </div>
                    </td>

                    {/* Title & Reason */}
                    <td style={{ padding: "14px 18px", verticalAlign: "top", maxWidth: 320 }}>
                      <div style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "0.86rem", marginBottom: 4, lineHeight: 1.3 }}>
                        {action.title}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.4 }}>
                        {action.reason}
                      </div>

                      {/* Finding Link Tags */}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                        {action.risk_assessment_id && (
                          <span
                            title={`Rule-Based Risk Finding UUID: ${action.risk_assessment_id}\n(Links this corrective action to the deterministic rule engine finding)`}
                            style={{
                              fontSize: "0.68rem", background: "#fef3c7", color: "#92400e",
                              padding: "2px 7px", borderRadius: 4, fontWeight: 600,
                              cursor: "default", display: "inline-flex", alignItems: "center", gap: 4
                            }}
                          >
                            <span>📐 Rule Finding:</span>
                            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", background: "rgba(146,64,14,0.1)", padding: "1px 4px", borderRadius: 3 }}>
                              #{action.risk_assessment_id.substring(0, 8)}
                            </code>
                          </span>
                        )}
                        {action.ml_assessment_id && (
                          <span
                            title={`Machine Learning Anomaly Detection UUID: ${action.ml_assessment_id}\n(Links this corrective action to the ML model anomaly detection flag)`}
                            style={{
                              fontSize: "0.68rem", background: "#f3e8ff", color: "#6b21a8",
                              padding: "2px 7px", borderRadius: 4, fontWeight: 600,
                              cursor: "default", display: "inline-flex", alignItems: "center", gap: 4
                            }}
                          >
                            <span>🤖 ML Flag:</span>
                            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.66rem", background: "rgba(107,33,168,0.1)", padding: "1px 4px", borderRadius: 3 }}>
                              #{action.ml_assessment_id.substring(0, 8)}
                            </code>
                          </span>
                        )}
                        {action.evidence_ids && action.evidence_ids.length > 0 && (
                          <span style={{ fontSize: "0.68rem", background: "#e0f2fe", color: "#0369a1", padding: "2px 7px", borderRadius: 4, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <span>📷</span>
                            <span>{action.evidence_ids.length} Attached Evidences</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Urgency & Stage */}
                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            color: pColor,
                            background: `${pColor}12`,
                            border: `1px solid ${pColor}30`,
                            padding: "3px 9px",
                            borderRadius: 6,
                            letterSpacing: "0.03em"
                          }}
                        >
                          {action.priority}
                        </span>

                        <span
                          style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: sColor,
                            background: `${sColor}12`,
                            border: `1px solid ${sColor}30`,
                            padding: "3px 9px",
                            borderRadius: 6
                          }}
                        >
                          {action.status.replace(/_/g, " ")}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Authority */}
                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "var(--color-navy-100)",
                            color: "var(--color-navy-900)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.72rem",
                            fontWeight: 700
                          }}
                        >
                          {action.assigned_to ? action.assigned_to.substring(0, 2).toUpperCase() : "UN"}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "0.82rem" }}>
                            {action.assigned_to || "Unassigned"}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                            {action.assigned_agency || "Implementing Dept"}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Due Date & Escalation */}
                    <td style={{ padding: "14px 18px", verticalAlign: "top" }}>
                      <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.82rem" }}>
                        {action.due_date ? new Date(action.due_date).toLocaleDateString() : "—"}
                      </div>
                      {isOverdue ? (
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", padding: "2px 7px", borderRadius: 4, fontSize: "0.68rem", fontWeight: 700, marginTop: 4 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#dc2626" }} />
                          <span>Overdue by {action.days_overdue}d</span>
                        </div>
                      ) : action.days_remaining !== undefined && action.days_remaining !== null ? (
                        <div style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600, marginTop: 4 }}>
                          {action.days_remaining}d remaining in SLA
                        </div>
                      ) : null}
                    </td>

                    {/* Action button */}
                    <td style={{ padding: "14px 18px", verticalAlign: "top", textAlign: "right" }}>
                      <button
                        onClick={() => {
                          setSelectedAction(action)
                          setActiveTab("overview")
                        }}
                        style={{
                          background: "var(--color-navy-800)",
                          color: "white",
                          border: "none",
                          padding: "7px 14px",
                          borderRadius: 8,
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: "0 2px 6px rgba(15, 42, 107, 0.15)",
                          transition: "all 0.15s ease"
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-navy-700)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "var(--color-navy-800)")}
                      >
                        <span>Audit Record</span>
                        <ChevronRightIcon color="white" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* =========================================================================
          6. DETAIL DRAWER / INSPECTION WORKFLOW
          ========================================================================= */}
      {selectedAction && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11, 31, 75, 0.55)",
            backdropFilter: "blur(6px)",
            zIndex: 1000,
            display: "flex",
            justifyContent: "flex-end"
          }}
          onClick={() => setSelectedAction(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 780,
              background: "white",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 32px rgba(15, 42, 107, 0.2)"
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div
              style={{
                padding: "20px 28px",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)"
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1.15rem", color: "var(--color-navy-900)" }}>
                    {selectedAction.action_id}
                  </span>
                  <span style={{ fontSize: "0.72rem", background: "var(--color-navy-100)", color: "var(--color-navy-800)", padding: "2px 9px", borderRadius: 8, fontWeight: 700 }}>
                    Project {selectedAction.project_id}
                  </span>
                  {selectedAction.is_overdue && (
                    <span style={{ fontSize: "0.7rem", background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca", padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>
                      SLA BREACH
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--color-navy-900)" }}>
                  {selectedAction.title}
                </div>
              </div>

              <button
                onClick={() => setSelectedAction(null)}
                style={{
                  background: "white",
                  border: "1px solid var(--color-border)",
                  borderRadius: "50%",
                  width: 32,
                  height: 32,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "var(--color-text-muted)",
                  fontSize: "1rem"
                }}
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs inside Drawer */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--color-border)", padding: "0 28px", background: "white" }}>
              {[
                { id: "overview", label: "Overview & Directive" },
                { id: "progress", label: `Field Updates (${selectedAction.progress_updates?.length || 0})` },
                { id: "review", label: "Resolution & Governance" },
                { id: "audit", label: `Audit Log (${selectedAction.audit_history?.length || 0})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  style={{
                    padding: "12px 18px",
                    border: "none",
                    borderBottom: activeTab === t.id ? "3px solid var(--color-orange-500)" : "3px solid transparent",
                    color: activeTab === t.id ? "var(--color-navy-900)" : "var(--color-text-muted)",
                    fontWeight: activeTab === t.id ? 700 : 500,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    background: "none"
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
              {/* TAB 1: OVERVIEW & LINEAGE */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, background: "var(--color-navy-50)", padding: 16, borderRadius: 10, border: "1px solid var(--color-border)" }}>
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Workflow Status</div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--color-navy-900)", marginTop: 2 }}>
                        {selectedAction.status.replace(/_/g, " ")}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Urgency Priority</div>
                      <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--color-orange-600)", marginTop: 2 }}>
                        {selectedAction.priority}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Assigned Authority</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-primary)", marginTop: 2 }}>
                        {selectedAction.assigned_to || "Unassigned"} ({selectedAction.assigned_agency || "Implementing Agency"})
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 700, textTransform: "uppercase" }}>Target Due Date</div>
                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--color-text-primary)", marginTop: 2 }}>
                        {selectedAction.due_date ? new Date(selectedAction.due_date).toLocaleDateString() : "—"}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-navy-900)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                      Corrective Directive Description
                    </div>
                    <div style={{ fontSize: "0.84rem", background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid var(--color-border)", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                      {selectedAction.description}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-navy-900)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>
                      Trigger Finding / Statutory Justification
                    </div>
                    <div style={{ fontSize: "0.84rem", background: "#f8fafc", padding: 14, borderRadius: 8, border: "1px solid var(--color-border)", color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                      {selectedAction.reason}
                    </div>
                  </div>

                  {/* Connected Finding Lineage Trace */}
                  <div style={{ marginTop: 6, borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 10 }}>
                      Connected Finding Lineage & Traceability
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: "0.8rem", border: "1px solid var(--color-border-light)" }}>
                        <span style={{ fontWeight: 700, minWidth: 150, color: "var(--color-navy-800)" }}>Rule-Based Finding:</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{selectedAction.risk_assessment_id || "None linked"}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: "0.8rem", border: "1px solid var(--color-border-light)" }}>
                        <span style={{ fontWeight: 700, minWidth: 150, color: "var(--color-navy-800)" }}>ML Anomaly Detection:</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{selectedAction.ml_assessment_id || "None linked"}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: "0.8rem", border: "1px solid var(--color-border-light)" }}>
                        <span style={{ fontWeight: 700, minWidth: 150, color: "var(--color-navy-800)" }}>Verification Protocol:</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{selectedAction.verification_id || "None linked"}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#f8fafc", borderRadius: 8, fontSize: "0.8rem", border: "1px solid var(--color-border-light)" }}>
                        <span style={{ fontWeight: 700, minWidth: 150, color: "var(--color-navy-800)" }}>Attached Evidence Records:</span>
                        <span>
                          {selectedAction.evidence_ids && selectedAction.evidence_ids.length > 0
                            ? selectedAction.evidence_ids.join(", ")
                            : "No evidence artifacts attached"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {selectedAction.resolution_summary && (
                    <div style={{ background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 16, borderRadius: 10 }}>
                      <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#065f46", marginBottom: 4 }}>
                        Submitted Resolution Summary (Author: {selectedAction.resolution_submitted_by})
                      </div>
                      <div style={{ fontSize: "0.84rem", color: "#047857", lineHeight: 1.45 }}>
                        {selectedAction.resolution_summary}
                      </div>
                      {selectedAction.closure_reviewer && (
                        <div style={{ fontSize: "0.75rem", color: "#065f46", marginTop: 8, borderTop: "1px solid #a7f3d0", paddingTop: 6 }}>
                          Reviewed & Verified by: <strong>{selectedAction.closure_reviewer}</strong> ({selectedAction.closure_reviewed_at})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: PROGRESS UPDATES */}
              {activeTab === "progress" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {selectedAction.status !== "CLOSED" && selectedAction.status !== "CANCELLED" && (
                    <form onSubmit={handleProgressSubmit} style={{ background: "#f8fafc", padding: 18, borderRadius: 10, border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 8 }}>
                        Record Execution Milestone Progress
                      </div>

                      <textarea
                        required
                        placeholder="Detail the technical rectifications executed, on-site measures, or material changes implemented..."
                        value={progMessage}
                        onChange={e => setProgMessage(e.target.value)}
                        rows={3}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginBottom: 10 }}
                      />

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)" }}>Progress Completed (%):</label>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={progPct}
                            onChange={e => setProgPct(Number(e.target.value))}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem" }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)" }}>Evidence Artifact IDs:</label>
                          <input
                            type="text"
                            placeholder="e.g. EV-1002, EV-1005"
                            value={progEvidence}
                            onChange={e => setProgEvidence(e.target.value)}
                            style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem" }}
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
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {progLoading ? "Transmitting..." : "Submit Progress Milestone"}
                      </button>
                    </form>
                  )}

                  <div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 14 }}>
                      Chronological Milestone Timeline
                    </div>

                    {(!selectedAction.progress_updates || selectedAction.progress_updates.length === 0) ? (
                      <div style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textAlign: "center", padding: "30px 20px", background: "#f8fafc", borderRadius: 10 }}>
                        No execution updates submitted for this directive yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        {selectedAction.progress_updates.map(upd => (
                          <div key={upd.update_id} style={{ borderLeft: "3px solid var(--color-orange-500)", paddingLeft: 14, paddingBottom: 6 }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--color-navy-900)" }}>
                                {upd.actor_name} ({upd.actor_role})
                              </span>
                              <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                                {new Date(upd.timestamp).toLocaleString()}
                              </span>
                            </div>

                            <div style={{ fontSize: "0.82rem", color: "var(--color-text-primary)", lineHeight: 1.4 }}>
                              {upd.message}
                            </div>

                            {upd.progress_pct !== undefined && upd.progress_pct !== null && (
                              <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
                                <div style={{ flex: 1, background: "#e2e8f0", height: 6, borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{ width: `${upd.progress_pct}%`, background: "var(--color-orange-500)", height: "100%" }} />
                                </div>
                                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-text-muted)" }}>
                                  {upd.progress_pct}%
                                </span>
                              </div>
                            )}

                            {upd.supporting_evidence && upd.supporting_evidence.length > 0 && (
                              <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                                {upd.supporting_evidence.map(ev => (
                                  <span key={ev} style={{ fontSize: "0.68rem", background: "#e0f2fe", color: "#0284c7", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
                                    Evidence #{ev}
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
                  {isAssigneeOrSubmitter && (
                    <div style={{ background: "#fff5f5", border: "1px solid #fecaca", padding: 14, borderRadius: 8, color: "#b91c1c", fontSize: "0.8rem" }}>
                      <strong>Separation of Duties Policy Enforcement:</strong>
                      <p style={{ marginTop: 4, marginBottom: 0, lineHeight: 1.4 }}>
                        You are recorded as the assignee or resolution submitter for this corrective action.
                        Under Project Drishti governance policy, an independent supervising officer must review and close this action.
                      </p>
                    </div>
                  )}

                  {selectedAction.status !== "CLOSED" && selectedAction.status !== "CANCELLED" && (
                    <div style={{ background: "#f8fafc", padding: 18, borderRadius: 10, border: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 4 }}>
                        1. Submit Resolution for Formal Sign-Off
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: 12 }}>
                        Summarize corrective measures implemented and declare readiness for supervisory sign-off.
                      </p>

                      <form onSubmit={handleResolutionSubmit}>
                        <textarea
                          required
                          placeholder="Provide detailed resolution summary demonstrating complete mitigation of the finding..."
                          value={resSummary}
                          onChange={e => setResSummary(e.target.value)}
                          rows={3}
                          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginBottom: 10 }}
                        />

                        <input
                          type="text"
                          placeholder="Evidence references (e.g. EV-1004, EV-1008)"
                          value={resEvidence}
                          onChange={e => setResEvidence(e.target.value)}
                          style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginBottom: 12 }}
                        />

                        <button
                          type="submit"
                          disabled={resLoading || selectedAction.status === "AWAITING_REVIEW"}
                          style={{
                            background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: selectedAction.status === "AWAITING_REVIEW" ? "not-allowed" : "pointer",
                            opacity: selectedAction.status === "AWAITING_REVIEW" ? 0.6 : 1
                          }}
                        >
                          {resLoading ? "Submitting..." : selectedAction.status === "AWAITING_REVIEW" ? "Pending Supervisory Review" : "Submit Resolution Package"}
                        </button>
                      </form>
                    </div>
                  )}

                  {selectedAction.status === "AWAITING_REVIEW" && (
                    <div style={{ background: "#f0fdf4", padding: 18, borderRadius: 10, border: "1px solid #bbf7d0" }}>
                      <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "#14532d", marginBottom: 4 }}>
                        2. Supervisory Verification & Closure Approval
                      </div>
                      <p style={{ fontSize: "0.78rem", color: "#166534", marginBottom: 12 }}>
                        Validate the contractor's corrective measures and approve formal closure or return for re-inspection.
                      </p>

                      <textarea
                        placeholder="Supervisory review audit notes / remarks..."
                        value={reviewNotes}
                        onChange={e => setReviewNotes(e.target.value)}
                        rows={2}
                        style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #bbf7d0", fontSize: "0.8rem", marginBottom: 12 }}
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
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: isAssigneeOrSubmitter ? "not-allowed" : "pointer"
                          }}
                        >
                          Approve & Formally Close
                        </button>

                        <button
                          type="button"
                          disabled={reviewLoading}
                          onClick={() => handleReview(false)}
                          style={{
                            background: "#dc2626",
                            color: "white",
                            border: "none",
                            padding: "8px 16px",
                            borderRadius: 8,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            cursor: "pointer"
                          }}
                        >
                          Return for Re-Inspection
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Administrative Override */}
                  <div style={{ background: "#f8fafc", padding: 18, borderRadius: 10, border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 10 }}>
                      Administrative Lifecycle Override
                    </div>

                    {selectedAction.status === "CLOSED" && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 }}>Reopen Closed Directive:</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="text"
                            placeholder="State rationale for reopening audit case..."
                            value={reopenReason}
                            onChange={e => setReopenReason(e.target.value)}
                            style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem" }}
                          />
                          <button
                            type="button"
                            onClick={handleReopen}
                            style={{ background: "#ef4444", color: "white", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Reopen Directive
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedAction.status !== "CLOSED" && selectedAction.status !== "CANCELLED" && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 4 }}>Void / Cancel Directive:</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            type="text"
                            placeholder="State justification for cancellation..."
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            style={{ flex: 1, padding: "7px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem" }}
                          />
                          <button
                            type="button"
                            onClick={handleCancel}
                            style={{ background: "#64748b", color: "white", border: "none", padding: "7px 14px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                          >
                            Void Directive
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
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 14 }}>
                    Append-Only Immutable Audit Trail
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {(selectedAction.audit_history || []).map((evt, idx) => (
                      <div key={evt.event_id || idx} style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8, border: "1px solid var(--color-border)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--color-navy-900)", fontFamily: "var(--font-mono)" }}>
                            {evt.event_type}
                          </span>
                          <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                            {new Date(evt.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 6 }}>
                          Authorized Actor: <strong style={{ color: "var(--color-navy-900)" }}>{evt.actor_username}</strong> ({evt.actor_role})
                        </div>

                        {evt.details && Object.keys(evt.details).length > 0 && (
                          <pre style={{ margin: 0, padding: 8, background: "#f1f5f9", borderRadius: 6, fontSize: "0.7rem", overflowX: "auto", color: "var(--color-navy-800)" }}>
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

      {/* =========================================================================
          7. INITIATE CORRECTIVE ACTION MODAL
          ========================================================================= */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(11, 31, 75, 0.6)",
            backdropFilter: "blur(6px)",
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
              maxWidth: 640,
              background: "white",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 24px 48px rgba(15, 42, 107, 0.25)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: "18px 24px", background: "var(--color-navy-900)", color: "white", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ShieldCheckIcon color="#fbbf24" />
                <div style={{ fontWeight: 800, fontSize: "1.05rem", letterSpacing: "-0.01em" }}>
                  Issue Corrective Directive
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ background: "none", border: "none", color: "white", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <form onSubmit={handleCreate} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14, maxHeight: "80vh", overflowY: "auto" }}>
              {createError && (
                <div style={{ background: "#fff5f5", color: "#dc2626", border: "1px solid #fecaca", padding: "10px 14px", borderRadius: 8, fontSize: "0.8rem" }}>
                  {createError}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>Project ID *</label>
                  <input
                    required
                    type="text"
                    value={createProject}
                    onChange={e => setCreateProject(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginTop: 4 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>Urgency Priority *</label>
                  <select
                    value={createPriority}
                    onChange={e => setCreatePriority(e.target.value as ActionPriorityLevel)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginTop: 4 }}
                  >
                    <option value="CRITICAL">CRITICAL (Immediate SLA)</option>
                    <option value="HIGH">HIGH (Standard 14d)</option>
                    <option value="MEDIUM">MEDIUM (30d Cycle)</option>
                    <option value="LOW">LOW (Observational)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>Directive Title *</label>
                <input
                  required
                  placeholder="e.g. Rectify compaction non-compliance on Chainage 14+200"
                  type="text"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>Detailed Technical Specification *</label>
                <textarea
                  required
                  placeholder="Detail the defect, non-compliance, or discrepancy requiring remediation..."
                  value={createDesc}
                  onChange={e => setCreateDesc(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginTop: 4 }}
                />
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>Trigger Finding / Reason *</label>
                <input
                  required
                  placeholder="e.g. Field inspection failure or ML financial overrun anomaly"
                  type="text"
                  value={createReason}
                  onChange={e => setCreateReason(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginTop: 4 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>SLA Due Date *</label>
                  <input
                    required
                    type="date"
                    value={createDueDate}
                    onChange={e => setCreateDueDate(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginTop: 4 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--color-navy-900)" }}>Assigned Authority (Username)</label>
                  <input
                    type="text"
                    placeholder="e.g. dev_field_officer"
                    value={createAssignee}
                    onChange={e => setCreateAssignee(e.target.value)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--color-border)", fontSize: "0.8rem", marginTop: 4 }}
                  />
                </div>
              </div>

              {/* Finding Linkages */}
              <div style={{ background: "#f8fafc", padding: 14, borderRadius: 10, border: "1px solid var(--color-border)" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--color-navy-900)", marginBottom: 8 }}>
                  Attach Audit Finding Identifiers (Optional)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input
                    type="text"
                    placeholder="Risk Assessment ID"
                    value={createRiskId}
                    onChange={e => setCreateRiskId(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.75rem" }}
                  />
                  <input
                    type="text"
                    placeholder="ML Assessment ID"
                    value={createMlId}
                    onChange={e => setCreateMlId(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.75rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Verification Record ID"
                    value={createVerifId}
                    onChange={e => setCreateVerifId(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.75rem" }}
                  />
                  <input
                    type="text"
                    placeholder="Evidence IDs (e.g. EV-1001, EV-1004)"
                    value={createEvidence}
                    onChange={e => setCreateEvidence(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.75rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ background: "#f1f5f9", color: "var(--color-navy-800)", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{
                    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                    color: "white",
                    border: "none",
                    padding: "8px 20px",
                    borderRadius: 8,
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 2px 10px rgba(217, 119, 6, 0.3)"
                  }}
                >
                  {createLoading ? "Submitting..." : "Issue Directive"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
