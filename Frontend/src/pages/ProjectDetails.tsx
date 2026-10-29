import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts"
import { projectService } from "../services/projectService"
import { correctiveActionService } from "../services/correctiveActionService"
import { Project, CorrectiveAction } from "../types"
import { useAuth } from "../contexts/AuthContext"
import { canAccessPath, hasCapability } from "../permissions/rbac"
import DrishtiLoader from "../components/DrishtiLoader"

const formatCostCr = (val?: number | null) => {
  if (val == null || isNaN(val)) return "₹0.00 Cr"
  const cr = val > 100000 ? val / 10000000 : val
  return `₹${cr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Cr`
}

const RULE_WEIGHTS: Record<string, number> = {
  COST_OVERRUN: 35,
  UTILIZATION_MISMATCH: 30,
  HIGH_EXPENDITURE_LOW_PROGRESS: 20,
  LOW_PROGRESS: 15,
}

const getRulePoints = (r: any): number => {
  if (r?.points != null && !isNaN(Number(r.points))) return Number(r.points)
  if (r?.rule_id && RULE_WEIGHTS[r.rule_id]) return RULE_WEIGHTS[r.rule_id]
  if (r?.severity === "Critical") return 35
  if (r?.severity === "High") return 25
  if (r?.severity === "Medium") return 15
  return 10
}

const formatObservedValues = (r: any): string => {
  if (!r?.observed_values) return "No telemetry values recorded"
  const obs = r.observed_values
  if (r.rule_id === "COST_OVERRUN" && (obs.original != null || obs.revised != null)) {
    const orig = obs.original != null ? formatCostCr(obs.original) : "N/A"
    const rev = obs.revised != null ? formatCostCr(obs.revised) : "N/A"
    const diff = (obs.revised || 0) - (obs.original || 0)
    const diffStr = diff > 0 ? ` (+${formatCostCr(diff)} escalation)` : ""
    return `Sanctioned: ${orig} → Revised: ${rev}${diffStr}`
  }
  if (r.rule_id === "LOW_PROGRESS" && obs.progress != null) {
    return `Reported Physical Progress: ${obs.progress}%`
  }
  if (r.rule_id === "UTILIZATION_MISMATCH") {
    const util = obs.utilization != null ? `${obs.utilization}%` : "N/A"
    const prog = obs.progress != null ? `${obs.progress}%` : "N/A"
    const gap = obs.utilization != null && obs.progress != null 
      ? ` (Gap: ${(obs.utilization - obs.progress).toFixed(1)}%)` 
      : ""
    return `Spend Utilization: ${util} vs Physical Progress: ${prog}${gap}`
  }
  if (r.rule_id === "HIGH_EXPENDITURE_LOW_PROGRESS") {
    const util = obs.utilization != null ? `${obs.utilization}%` : "N/A"
    const prog = obs.progress != null ? `${obs.progress}%` : "N/A"
    return `High Spend (${util}) with Physical Delivery Stalled at ${prog}`
  }
  if (typeof obs === "object") {
    return Object.entries(obs)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "number" ? v.toLocaleString() : v}`)
      .join(" • ")
  }
  return String(obs)
}

const getSeverityBadgeClass = (severity?: string) => {
  switch ((severity || "").toLowerCase()) {
    case "critical":
      return "bg-red-50 text-red-700 border-red-200"
    case "high":
      return "bg-amber-50 text-amber-800 border-amber-200"
    case "medium":
      return "bg-yellow-50 text-yellow-800 border-yellow-200"
    default:
      return "bg-emerald-50 text-emerald-700 border-emerald-200"
  }
}

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, dataEpoch } = useAuth()
  const canAnalyze = hasCapability(user?.role, "run_rule_analysis")
  const canViewRisk = hasCapability(user?.role, "view_internal_risk")
  const canViewMl = hasCapability(user?.role, "view_ml_assessment")
  const canVerify = hasCapability(user?.role, "submit_verification")
  const canViewVerifications = hasCapability(user?.role, "view_verifications")
  const canViewActions = hasCapability(user?.role, "view_corrective_actions")
  const canCreateActions = hasCapability(user?.role, "create_corrective_actions")
  const canViewEvidence = canAccessPath(user?.role, "/evidence")
  const [animated, setAnimated] = useState(false)
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [mlAssessment, setMlAssessment] = useState<any>(null)
  
  const [verifications, setVerifications] = useState<any[]>([])
  const [correctiveActions, setCorrectiveActions] = useState<CorrectiveAction[]>([])
  
  // Form State
  const [verifyStatus, setVerifyStatus] = useState("IN_REVIEW")
  const [verifyNotes, setVerifyNotes] = useState("")
  const [verifyEvidence, setVerifyEvidence] = useState("")
  const [verifyLoading, setVerifyLoading] = useState(false)

  // Phase 7 Quick Create Modal State
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionTitle, setActionTitle] = useState("")
  const [actionDesc, setActionDesc] = useState("")
  const [actionReason, setActionReason] = useState("")
  const [actionPriority, setActionPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH")
  const [actionDueDate, setActionDueDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  )
  const [actionAssignee, setActionAssignee] = useState("")
  const [actionAgency, setActionAgency] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const [showCalculationModal, setShowCalculationModal] = useState(false)

  const fetchAssessments = () => {
    if (!id) return;
    if (canViewRisk) {
      projectService.getProjectRisk(id).then(setAnalysisResult).catch(() => setAnalysisResult(null));
    } else {
      setAnalysisResult(null);
    }
    if (canViewMl) {
      projectService.getProjectMlRisk(id).then(setMlAssessment).catch(() => setMlAssessment(null));
    } else {
      setMlAssessment(null);
    }
  }
  
  const fetchVerifications = () => {
    if (!id) return;
    if (!canViewVerifications) {
      setVerifications([]);
      return;
    }
    projectService.getVerifications(id).then(setVerifications).catch(() => setVerifications([]));
  }

  const fetchCorrectiveActions = () => {
    if (!id) return;
    if (!canViewActions) {
      setCorrectiveActions([]);
      return;
    }
    correctiveActionService.getProjectActions(id).then(res => setCorrectiveActions(res.results || [])).catch(() => setCorrectiveActions([]));
  }

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalysisLoading(true);
    try {
      await projectService.triggerAnalysis(id);
      await projectService.triggerMlAnalysis(id);
      fetchAssessments();
    } catch (e) {
      console.error(e);
    }
    setAnalysisLoading(false);
  }
  
  const handleVerify = async () => {
    if (!id) return;
    setVerifyLoading(true);
    try {
      await projectService.submitVerification(id, {
        verification_status: verifyStatus,
        notes: verifyNotes,
        evidence_references: verifyEvidence ? [verifyEvidence] : []
      });
      fetchVerifications();
      projectService.getProjectDetails(id).then(setProject);
      setVerifyNotes("");
      setVerifyEvidence("");
    } catch (e) {
      console.error(e);
      alert("Verification failed. Check console or permissions.");
    }
    setVerifyLoading(false);
  }

  const handleCreateAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !actionTitle || !actionDesc || !actionReason) return;
    setActionLoading(true);
    try {
      await correctiveActionService.createAction({
        project_id: id,
        title: actionTitle,
        description: actionDesc,
        reason: actionReason,
        priority: actionPriority,
        due_date: actionDueDate,
        assigned_to: actionAssignee || undefined,
        assigned_agency: actionAgency || undefined,
        risk_assessment_id: analysisResult?.assessment_id || undefined,
        ml_assessment_id: mlAssessment?.assessment_id || undefined,
        verification_id: verifications[0]?.verification_id || undefined,
        evidence_ids: verifications[0]?.evidence_references || undefined,
      });
      setShowActionModal(false);
      setActionTitle("");
      setActionDesc("");
      setActionReason("");
      fetchCorrectiveActions();
    } catch (err: any) {
      alert(err?.message || "Failed to create corrective action");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    if (id) {
      projectService.getProjectDetails(id).then((data) => {
        setProject(data)
        setLoading(false)
      }).catch(err => {
        console.error(err)
        setLoading(false)
      })
      fetchAssessments();
      fetchVerifications();
      fetchCorrectiveActions();
    }
    return () => clearTimeout(t)
  }, [id, dataEpoch, canViewRisk, canViewMl, canViewVerifications, canViewActions])
  
  if (loading) {
    return (
      <DrishtiLoader
        title="Loading official project data..."
        subtitle="National Infrastructure Oversight Platform"
      />
    );
  }

  if (!project) {
    return (
      <div className="p-8 max-w-[800px] mx-auto text-center mt-12">
        <div className="bg-white p-8 border border-amber-200 bg-amber-50/40 rounded-xl shadow-sm">
          <div className="text-4xl mb-3">🛡️</div>
          <h2 className="text-lg font-bold text-navy-900 mb-2">Project Inaccessible or Outside Jurisdiction</h2>
          <p className="text-sm text-slate-600 mb-5 leading-relaxed max-w-[550px] mx-auto">
            Project <span className="font-mono font-bold text-navy-800">#{id}</span> is not accessible under your current active role (<strong>{user ? (user.role?.replace(/_/g, " ") || "Authorized User") : "Guest Citizen"}</strong>).
            {user?.state && <span> Your jurisdictional scope is limited to <strong>{user.state}</strong> infrastructure records.</span>}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-4 py-2 bg-navy-800 text-white rounded-lg text-xs font-600 hover:bg-navy-700 transition"
            >
              ← Back to Dashboard
            </button>
            <button
              onClick={() => navigate("/projects")}
              className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-600 hover:bg-slate-50 transition"
            >
              View Accessible Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Derive Unified Risk State
  const ruleFlag = analysisResult?.risk_level === 'High' || 
                   analysisResult?.risk_level === 'Medium' || 
                   analysisResult?.risk_level === 'Critical' || 
                   (analysisResult?.risk_score ?? 0) >= 35;
  const mlFlag = mlAssessment?.anomaly_flag === true;
  let unifiedState = "Neither Flagged";
  let statePillStyle = "bg-emerald-50 text-emerald-800 border-emerald-200";
  let stateDotStyle = "bg-emerald-500";
  let stateColor = "bg-emerald-100 text-emerald-800 border-emerald-200";

  if (ruleFlag && mlFlag) {
    unifiedState = "Both Flagged (Rule + ML)";
    statePillStyle = "bg-red-50 text-red-800 border-red-300 shadow-xs";
    stateDotStyle = "bg-red-500 animate-pulse";
    stateColor = "bg-red-100 text-red-800 border-red-200";
  } else if (ruleFlag && !mlFlag) {
    unifiedState = "Rule Risk Flagged Only";
    statePillStyle = "bg-amber-50 text-amber-800 border-amber-300";
    stateDotStyle = "bg-amber-500";
    stateColor = "bg-amber-100 text-amber-800 border-amber-200";
  } else if (!ruleFlag && mlFlag) {
    unifiedState = "ML Anomaly Flagged Only";
    statePillStyle = "bg-purple-50 text-purple-800 border-purple-300";
    stateDotStyle = "bg-purple-500 animate-pulse";
    stateColor = "bg-purple-100 text-purple-800 border-purple-200";
  }
  
  if (!analysisResult && !mlAssessment) {
    unifiedState = "Not Fully Assessed";
    statePillStyle = "bg-slate-100 text-slate-700 border-slate-200";
    stateDotStyle = "bg-slate-400";
    stateColor = "bg-slate-100 text-slate-800 border-slate-200";
  } else if (!analysisResult || (canViewMl && !mlAssessment)) {
    unifiedState = "Partially Assessed";
    statePillStyle = "bg-slate-100 text-slate-700 border-slate-200";
    stateDotStyle = "bg-slate-400";
    stateColor = "bg-slate-100 text-slate-800 border-slate-200";
  }

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600 transition-colors">Dashboard</button>
        <span>›</span>
        <button onClick={() => navigate("/map")} className="hover:text-slate-600 transition-colors">Projects</button>
        <span>›</span>
        <span className="font-mono text-navy-700">Project #{id}</span>
      </div>

      {/* Project header */}
      <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono font-700 text-sm text-navy-800 bg-navy-50 px-2.5 py-1 rounded-lg">
                Project #{project.project_id}
              </span>
              <span className="text-xs font-600 px-2.5 py-1 rounded-full border bg-green-50 text-green-700 border-green-200">
                Official Data
              </span>
            </div>
            <h1 className="font-display font-700 text-2xl text-navy-900">{project.project_name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">📍 {project.district}, {project.state}</span>
              <span>·</span>
              <span>Department: {project.department}</span>
              <span>·</span>
              <span>Reported: {project.source_as_of_date || "N/A"}</span>
              <span>·</span>
              <span className="font-bold border px-2 py-0.5 rounded">Status: {project.verification_status}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCalculationModal(true)}
              className="text-sm border border-sky-300 bg-sky-50 text-sky-800 px-3.5 py-2 rounded-lg hover:bg-sky-100 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="4" y="2" width="16" height="20" rx="2" />
                <line x1="8" y1="6" x2="16" y2="6" />
                <line x1="16" y1="14" x2="16" y2="18" />
                <path d="M16 10h.01" />
                <path d="M12 10h.01" />
                <path d="M8 10h.01" />
                <path d="M12 14h.01" />
                <path d="M8 14h.01" />
                <path d="M12 18h.01" />
                <path d="M8 18h.01" />
              </svg>
              <span>How It's Calculated</span>
            </button>

            {canViewEvidence && (
            <button
              onClick={() => navigate(`/evidence?projectId=${id}`)}
              className="text-sm bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-700 font-500 transition-colors"
            >
              View Evidence
            </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Original Sanction", value: formatCostCr(project.original_cost_cr ?? project.original_cost), sub: "Initial Allocation", color: "text-slate-800" },
          { label: "Revised Cost", value: formatCostCr(project.revised_cost_cr ?? project.revised_cost ?? project.original_cost), sub: "Latest Approved", color: "text-slate-800" },
          { label: "Cumulative Spent", value: project.expenditure != null ? formatCostCr(project.expenditure_cr ?? project.expenditure) : "Restricted", sub: project.expenditure != null ? `${project.financial_utilization_pct?.toFixed(1) || 0}% of budget` : "Internal Oversight", color: "text-risk-high" },
          { label: "Cost Overrun", value: project.expenditure != null ? ((project.cost_overrun_cr || 0) > 0 ? `+${formatCostCr(project.cost_overrun_cr)}` : "None") : "Restricted", sub: `${project.cost_deviation_pct?.toFixed(1) || 0}% deviation`, color: "text-risk-medium" },
          { label: "Reported Progress", value: `${project.reported_progress_pct ?? project.reported_progress ?? 0}%`, sub: "Physical completion", color: "text-accent-500" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`bg-white rounded-xl border border-slate-200 p-4 transition-all duration-500 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <div className={`font-mono font-700 text-xl ${s.color}`}>{s.value}</div>
            <div className="font-500 text-slate-700 text-xs mt-1">{s.label}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Comprehensive Financial Budget & Expenditure Ledger */}
      <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-75 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">💰</span>
              <h2 className="font-display font-700 text-navy-900 text-lg">Financial Budget & Expenditure Ledger</h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                Official MoSPI Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Sanctioned allocations, approved revisions, cumulative expenditure, and delivery velocity tracking.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCalculationModal(true)}
              className="text-xs font-bold text-sky-800 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>Calculation Formulas</span>
            </button>
            {project.source_url && (
              <a
                href={project.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-600 text-navy-700 hover:text-navy-900 bg-navy-50 hover:bg-navy-100 px-3 py-1.5 rounded-lg border border-navy-200 transition flex items-center gap-1.5 w-fit"
              >
                <span>📄 View MoSPI PAIMANA Flash Report</span>
                <span>↗</span>
              </a>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Cost Allocations */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Budget Allocations</div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Original Sanction:</span>
              <span className="font-mono font-bold text-navy-900">{formatCostCr(project.original_cost_cr ?? project.original_cost)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Latest Approved Revision:</span>
              <span className="font-mono font-bold text-navy-900">{formatCostCr(project.revised_cost_cr ?? project.revised_cost ?? project.original_cost)}</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
              <span className="text-slate-500">Cost Escalation:</span>
              <span className={`font-mono font-bold ${(project.cost_overrun_cr || 0) > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                {(project.cost_overrun_cr || 0) > 0 ? `+${formatCostCr(project.cost_overrun_cr)}` : "None (Within Budget)"}
              </span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Deviation from Original:</span>
              <span className="font-mono font-semibold text-slate-600">
                {project.cost_deviation_pct ? `${project.cost_deviation_pct.toFixed(2)}%` : "0.00%"}
              </span>
            </div>
          </div>

          {/* Column 2: Expenditure & Balances */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Expenditure & Balances</div>
            {project.expenditure != null ? (
              <>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Cumulative Spent:</span>
                  <span className="font-mono font-bold text-navy-900">{formatCostCr(project.expenditure_cr ?? project.expenditure)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Unspent Balance:</span>
                  <span className="font-mono font-bold text-emerald-800">
                    {formatCostCr(((project.revised_cost || project.original_cost) || 0) - ((project.expenditure || 0)))}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Budget Utilization Rate:</span>
                  <span className="font-mono font-bold text-navy-900">
                    {project.financial_utilization_pct ? `${project.financial_utilization_pct.toFixed(1)}%` : "0.0%"}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Spend-to-Progress Velocity:</span>
                  <span className="font-mono font-semibold text-slate-600">
                    {project.expenditure_progress_ratio ? `${project.expenditure_progress_ratio.toFixed(2)}x` : "1.00x"}
                  </span>
                </div>
              </>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400">
                Detailed internal expenditures are restricted to authorized oversight officers.
              </div>
            )}
          </div>

          {/* Column 3: Physical Delivery vs Financial Burn */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
            <div>
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Delivery Benchmark</div>
              <div className="space-y-3 mb-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-slate-600">Physical Progress</span>
                    <span className="text-navy-900 font-mono">{project.reported_progress_pct ?? project.reported_progress ?? 0}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-navy-800 h-2 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, project.reported_progress_pct ?? project.reported_progress ?? 0)}%` }}
                    />
                  </div>
                </div>

                {project.expenditure != null && (
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-1">
                      <span className="text-slate-600">Financial Burn Rate</span>
                      <span className="text-orange-700 font-mono">{project.financial_utilization_pct ? `${project.financial_utilization_pct.toFixed(1)}%` : "0%"}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-700"
                        style={{ width: `${Math.min(100, project.financial_utilization_pct || 0)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between items-center">
              <span>Source Document:</span>
              <span className="font-semibold text-slate-700 truncate max-w-[170px]" title={project.source_reference}>
                {project.source_reference || "PAIMANA Flash Report"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Project Risk-Inspection View */}
      {(canViewRisk || canViewMl) && (
      <div className={`gov-card transition-all duration-500 delay-100 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        {/* Gov-card Header */}
        <div className="gov-card-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🛡️</span>
            <div>
              <div className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
                Unified Risk Inspection View
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/10 text-orange-200 border border-white/20">
                  DUAL-ENGINE INTEL
                </span>
              </div>
              <div className="text-[11px] text-white/70 font-normal">
                Phase 3 Rule Determinism & Phase 4 Unsupervised Isolation Forest Assessment
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-2xs ${statePillStyle}`}>
              <span className={`w-2 h-2 rounded-full ${stateDotStyle}`} />
              <span>{unifiedState}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Phase 3 Rule-Based Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📋</span>
                    <div>
                      <h3 className="font-display font-700 text-navy-900 text-sm">
                        Rule-Based Risk Engine
                      </h3>
                      <p className="text-[11px] text-slate-400">Deterministic threshold & audit rules</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-600 px-2 py-0.5 rounded bg-navy-50 text-navy-700 border border-navy-100">
                    v{analysisResult?.rule_engine_version || "1.1"}
                  </span>
                </div>
                
                {analysisResult ? (
                  <div className="space-y-4">
                    {/* Score & Gauge Bar */}
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Risk Score</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={`text-3xl font-display font-900 ${
                              analysisResult.risk_score >= 60 ? "text-red-700" :
                              analysisResult.risk_score >= 35 ? "text-amber-700" :
                              "text-emerald-700"
                            }`}>
                              {analysisResult.risk_score}
                            </span>
                            <span className="text-sm font-semibold text-slate-400">/ 100</span>
                          </div>
                        </div>
                        <span className={
                          analysisResult.risk_level === 'Critical' ? 'badge-high' :
                          analysisResult.risk_level === 'High' ? 'badge-high' :
                          analysisResult.risk_level === 'Medium' ? 'badge-medium' :
                          'badge-low'
                        }>
                          {analysisResult.risk_level} Risk
                        </span>
                      </div>

                      {/* Score meter track */}
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden mt-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${
                            analysisResult.risk_score >= 60 ? "bg-red-600" :
                            analysisResult.risk_score >= 35 ? "bg-amber-500" :
                            "bg-emerald-600"
                          }`}
                          style={{ width: `${Math.min(100, analysisResult.risk_score)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-mono">
                        <span>0 (Nominal)</span>
                        <span>35 (Medium)</span>
                        <span>60 (High)</span>
                        <span>100 (Critical)</span>
                      </div>
                    </div>

                    <div className="space-y-3 mt-4">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wide">
                        <span className="flex items-center gap-1.5">
                          <span>⚡</span>
                          <span>Triggered Rules ({analysisResult.rules_triggered?.length || 0})</span>
                        </span>
                        {analysisResult.rules_triggered?.length > 0 && (
                          <span className="text-[11px] font-semibold text-red-600 font-mono">
                            +{analysisResult.rules_triggered.reduce((acc: number, r: any) => acc + getRulePoints(r), 0)} pts total
                          </span>
                        )}
                      </div>

                      {analysisResult.rules_triggered?.length === 0 ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl text-emerald-800 text-xs font-500">
                          <span className="text-lg">✅</span>
                          <div>
                            <div className="font-bold">No Violations Detected</div>
                            <div className="text-emerald-700/80 text-[11px]">All deterministic fiscal and progress criteria remain within sanctioned parameters.</div>
                          </div>
                        </div>
                      ) : (
                        analysisResult.rules_triggered?.map((r: any, i: number) => {
                          const pts = getRulePoints(r);
                          return (
                            <div key={i} className="bg-slate-50/70 hover:bg-slate-50 p-3.5 rounded-xl border text-sm border-slate-200/80 transition-colors">
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-navy-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                                    {r.rule_id}
                                  </span>
                                  <span className="text-xs font-bold text-slate-800">{r.title}</span>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${getSeverityBadgeClass(r.severity)}`}>
                                    {r.severity || "HIGH"}
                                  </span>
                                  <span className="text-xs font-bold font-mono text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded">
                                    +{pts} pts
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-600 mb-2 leading-relaxed">{r.description}</div>
                              <div className="bg-white/80 rounded-lg p-2.5 border border-slate-100 text-[11px] space-y-1 font-mono">
                                <div className="flex items-center gap-1.5 text-slate-500">
                                  <span className="font-semibold text-slate-700">Threshold:</span>
                                  <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200/60">{r.threshold}</span>
                                </div>
                                <div className="flex items-start gap-1.5 text-slate-500">
                                  <span className="font-semibold text-slate-700 flex-shrink-0">Observed:</span>
                                  <span className="text-navy-900 font-500">{formatObservedValues(r)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 py-10 text-center">No Rule-Based Assessment available.</div>
                )}
              </div>
            </div>

            {/* Phase 4 ML Anomaly Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🤖</span>
                    <div>
                      <h3 className="font-display font-700 text-navy-900 text-sm">
                        ML Isolation Forest
                      </h3>
                      <p className="text-[11px] text-slate-400">Unsupervised outlier detection model</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-600 px-2 py-0.5 rounded bg-navy-50 text-navy-700 border border-navy-100">
                    {mlAssessment?.model_version || "viforest_v1"}
                  </span>
                </div>
                
                {mlAssessment ? (
                  <div className="space-y-4">
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Anomaly Score</div>
                          <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className={`text-3xl font-display font-900 ${
                              mlAssessment.anomaly_flag ? "text-purple-700" : "text-navy-900"
                            }`}>
                              {mlAssessment.ml_anomaly_score != null ? Number(mlAssessment.ml_anomaly_score).toFixed(2) : "N/A"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal">(Lower = more anomalous)</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-bold rounded-full uppercase border flex items-center gap-1.5 ${
                          mlAssessment.anomaly_status === 'INSUFFICIENT_DATA'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : mlAssessment.anomaly_flag
                            ? 'bg-purple-100 text-purple-900 border-purple-300 shadow-2xs'
                            : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            mlAssessment.anomaly_status === 'INSUFFICIENT_DATA' ? 'bg-slate-400' :
                            mlAssessment.anomaly_flag ? 'bg-purple-600 animate-pulse' : 'bg-emerald-600'
                          }`} />
                          {mlAssessment.anomaly_status === 'INSUFFICIENT_DATA' ? "Insufficient Data" :
                           mlAssessment.anomaly_flag ? "Anomalous" : "Normal"}
                        </span>
                      </div>

                      <div className="mt-3 bg-navy-50/70 border-l-3 border-navy-600 rounded-r-lg p-3 text-xs text-navy-900 leading-relaxed">
                        <strong className="text-navy-950 flex items-center gap-1 mb-1">
                          <span>💡</span> Contextual Explanation:
                        </strong>
                        <p className="text-slate-700">{mlAssessment.explanation || "The project's financial and physical progress patterns are consistent with the normal distribution of the reference dataset."}</p>
                        <div className="text-[10px] text-slate-400 mt-2 italic">Note: Isolation Forest flags multidimensional outliers but does not establish causality or proof of misconduct.</div>
                      </div>
                    </div>

                    {mlAssessment.data_quality_warnings?.length > 0 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                        <strong className="flex items-center gap-1 mb-1">
                          <span>⚠️</span> Pipeline Warnings:
                        </strong>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-800 text-[11px]">
                          {mlAssessment.data_quality_warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                        </ul>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <span>📐</span> Features used:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(mlAssessment.features_used || ["original_cost_cr", "revised_cost_cr", "expenditure_cr", "reported_progress_pct"]).map((feat: string, i: number) => (
                          <span key={i} className="font-mono text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            {feat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 py-10 text-center">
                    {!canViewMl ? (
                      <div className="space-y-3 bg-slate-50/60 rounded-xl border border-slate-200/80 p-6">
                        <div className="w-12 h-12 mx-auto rounded-full bg-navy-50 border border-navy-100 flex items-center justify-center text-xl">
                          🔒
                        </div>
                        <div className="font-display font-700 text-navy-900 text-sm">ML Anomaly Assessment Restricted</div>
                        <div className="text-xs text-slate-500 max-w-[300px] mx-auto leading-relaxed">
                          Isolation Forest vectors are restricted to Administrative and Departmental Oversight roles per Project Drishti RBAC policy.
                        </div>
                        <div className="text-[11px] font-mono text-navy-700 bg-white px-2.5 py-1 rounded inline-block border border-slate-200 shadow-2xs">
                          Role: {user?.role || "GUEST"} • Required: ADMIN / OVERSIGHT
                        </div>
                      </div>
                    ) : (
                      "No ML Assessment available."
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Synthesized Investigation Summary */}
          <div className={`p-4 rounded-xl border transition-all ${
            unifiedState === "Both Flagged (Rule + ML)" ? "bg-red-50/70 border-red-200 text-red-950" :
            unifiedState === "Rule Risk Flagged Only" ? "bg-orange-50/70 border-orange-200 text-amber-950" :
            unifiedState === "ML Anomaly Flagged Only" ? "bg-purple-50/70 border-purple-200 text-purple-950" :
            "bg-slate-50/80 border-slate-200 text-slate-800"
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-base">
                {unifiedState === "Both Flagged (Rule + ML)" ? "🚨" :
                 unifiedState === "Rule Risk Flagged Only" ? "⚠️" :
                 unifiedState === "ML Anomaly Flagged Only" ? "🔬" : "⚖️"}
              </span>
              <h4 className="font-display font-700 text-sm text-navy-900">
                Synthesized Investigation Summary
              </h4>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              {unifiedState === "Both Flagged (Rule + ML)" ? 
                "This project triggered hard deterministic rules and exhibits highly anomalous structural patterns relative to the official reference dataset. Human review is strongly recommended to verify physical progress and expenditure." : 
               unifiedState === "Rule Risk Flagged Only" ? 
                "This project violated deterministic policy thresholds but its multi-dimensional progression is relatively common in the dataset. Verify the specific rule violations." : 
               unifiedState === "ML Anomaly Flagged Only" ? 
                "This project passed deterministic policy thresholds but exhibits unusual multidimensional progression (e.g. expenditure/progress gaps). Review as a potential emerging outlier." : 
               unifiedState === "Neither Flagged" ? 
                "This project shows normal progression patterns and passes all policy thresholds. No immediate action required." : 
                "Assessment data is incomplete. Ensure financial and physical progress values are properly reported."
              }
            </p>
          </div>
        </div>
      </div>
      )}

      {/* Phase 7: Corrective Actions & Governance Follow-up */}
      {canViewActions && (
      <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-300 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="font-display font-700 text-navy-900 text-lg">Corrective Actions & Follow-up</h3>
              <span className="text-xs bg-navy-100 text-navy-800 font-bold px-2 py-0.5 rounded-full">
                {correctiveActions.length} Actions
              </span>
              {correctiveActions.some(a => a.is_overdue) && (
                <span className="text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full animate-pulse">
                  ⚠️ Overdue Items
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              End-to-end corrective action workflow connected to Project Findings, ML anomalies, and Verification records.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {canCreateActions && (
            <button
              onClick={() => {
                const reasons: string[] = [];
                if (analysisResult?.rules_triggered?.length) {
                  reasons.push(`Rule violations: ${analysisResult.rules_triggered.map((r: any) => r.rule_id).join(", ")}`);
                }
                if (mlAssessment?.anomaly_flag) {
                  reasons.push(`ML Anomaly detected (Score: ${mlAssessment.ml_anomaly_score})`);
                }
                setActionReason(reasons.join("; ") || "Field observation or verification finding");
                setActionTitle(`Rectify Findings for ${project.project_id}`);
                setShowActionModal(true);
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs px-3.5 py-2 rounded-lg shadow-sm flex items-center gap-1.5 transition"
            >
              <span>+</span>
              <span>Initiate Corrective Action</span>
            </button>
            )}

            <button
              onClick={() => navigate(`/actions?project_id=${id}`)}
              className="bg-navy-50 hover:bg-navy-100 text-navy-800 font-600 text-xs px-3 py-2 rounded-lg border border-navy-200 transition"
            >
              All Actions Console →
            </button>
          </div>
        </div>

        {correctiveActions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <div className="text-2xl mb-2">📋</div>
            No corrective actions have been initiated for this project yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700">
                  <th className="py-2.5 px-3 font-bold">Action ID</th>
                  <th className="py-2.5 px-3 font-bold">Title & Description</th>
                  <th className="py-2.5 px-3 font-bold">Priority</th>
                  <th className="py-2.5 px-3 font-bold">Status</th>
                  <th className="py-2.5 px-3 font-bold">Assignee</th>
                  <th className="py-2.5 px-3 font-bold">Due Date & Escalation</th>
                  <th className="py-2.5 px-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {correctiveActions.map(action => (
                  <tr key={action.action_id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 font-mono font-bold text-navy-900">{action.action_id}</td>
                    <td className="py-3 px-3 max-w-[280px]">
                      <div className="font-bold text-slate-800">{action.title}</div>
                      <div className="text-slate-500 text-[11px] truncate mt-0.5">{action.reason}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        action.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 border border-red-200' :
                        action.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 border border-orange-200' :
                        action.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {action.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        action.status === 'CLOSED' ? 'bg-green-100 text-green-800' :
                        action.status === 'AWAITING_REVIEW' ? 'bg-amber-100 text-amber-800' :
                        action.status === 'IN_PROGRESS' ? 'bg-sky-100 text-sky-800' :
                        action.status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                        action.status === 'REOPENED' ? 'bg-red-100 text-red-800' :
                        'bg-indigo-100 text-indigo-800'
                      }`}>
                        {action.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-600 text-slate-700">{action.assigned_to || "Unassigned"}</div>
                      <div className="text-slate-400 text-[10px]">{action.assigned_agency || "N/A"}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div>{action.due_date ? new Date(action.due_date).toLocaleDateString() : '—'}</div>
                      {action.is_overdue ? (
                        <span className="text-[10px] bg-red-100 text-red-700 font-bold px-1.5 py-0.5 rounded mt-0.5 inline-block">
                          ⚠️ Overdue ({action.days_overdue}d)
                        </span>
                      ) : action.days_remaining !== null && action.days_remaining !== undefined ? (
                        <span className="text-[10px] text-green-700 mt-0.5 inline-block">
                          ⏱️ {action.days_remaining}d left
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => navigate(`/actions?project_id=${id}`)}
                        className="text-navy-700 hover:text-navy-900 font-bold text-xs underline"
                      >
                        Manage →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}


      {/* CALCULATION METHODOLOGY BREAKDOWN MODAL */}
      {showCalculationModal && project && (() => {
        const origCost = Number(project.original_cost_cr ?? project.original_cost) || 0;
        const revCost = Number(project.revised_cost_cr ?? project.revised_cost ?? origCost) || origCost;
        const expCost = Number(project.expenditure_cr ?? project.expenditure) || 0;
        const reportedProg = Number(project.reported_progress_pct ?? project.reported_progress) || 0;
        const overrunVal = project.cost_overrun_cr != null ? Number(project.cost_overrun_cr) : Math.max(0, revCost - origCost);
        const costDevVal = project.cost_deviation_pct != null ? Number(project.cost_deviation_pct) : (origCost > 0 ? ((revCost - origCost) / origCost) * 100 : 0);
        const unspentVal = Math.max(0, revCost - expCost);
        const utilizationVal = project.financial_utilization_pct != null ? Number(project.financial_utilization_pct) : (revCost > 0 ? (expCost / revCost) * 100 : 0);
        const velocityVal = reportedProg > 0 ? Number((utilizationVal / reportedProg).toFixed(2)) : 1.0;
        const gapVal = Number((utilizationVal - reportedProg).toFixed(1));

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-3xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <line x1="8" y1="6" x2="16" y2="6" />
                        <line x1="16" y1="14" x2="16" y2="18" />
                        <path d="M16 10h.01" />
                        <path d="M12 10h.01" />
                        <path d="M8 10h.01" />
                        <path d="M12 14h.01" />
                        <path d="M8 14h.01" />
                        <path d="M12 18h.01" />
                        <path d="M8 18h.01" />
                      </svg>
                    </span>
                    <h2 className="text-base font-bold text-[#0b1f4b]">
                      Financial & Progress Metric Calculation Breakdown
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Step-by-step mathematical derivation for Project <strong>#{project.project_id}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setShowCalculationModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* Base Variables Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
                  Base Project Allocation & Expenditure Data
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Original Sanction (O)</div>
                    <div className="font-mono font-bold text-sm text-[#0b1f4b] mt-0.5">
                      {formatCostCr(origCost)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Revised Cost (R)</div>
                    <div className="font-mono font-bold text-sm text-[#0b1f4b] mt-0.5">
                      {formatCostCr(revCost)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Cumulative Spent (E)</div>
                    <div className="font-mono font-bold text-sm text-[#0b1f4b] mt-0.5">
                      {formatCostCr(expCost)}
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <div className="text-slate-400 text-[10px] uppercase font-bold">Physical Progress (P)</div>
                    <div className="font-mono font-bold text-sm text-sky-700 mt-0.5">
                      {reportedProg}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Calculations */}
              <div className="space-y-3.5 text-xs">
                {/* 1. Cost Overrun */}
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-sm">1. Cost Overrun (Escalation)</span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      {overrunVal > 0 ? `+${formatCostCr(overrunVal)}` : "None (Within Budget)"}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    Formula: Cost Overrun = Revised Cost (R) − Original Sanction (O)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                    Calculation: <span className="font-mono font-semibold text-slate-700">{formatCostCr(revCost)} − {formatCostCr(origCost)} = {overrunVal > 0 ? `+${formatCostCr(overrunVal)}` : "₹0.00 Cr"}</span>. Represents the absolute budget expansion approved beyond original cabinet sanction.
                  </p>
                </div>

                {/* 2. Deviation from Original */}
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-sm">2. Deviation from Original Sanction</span>
                    <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                      {costDevVal.toFixed(2)}%
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    Formula: Deviation % = ((Revised Cost (R) − Original Sanction (O)) ÷ Original Sanction (O)) × 100
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                    Calculation: <span className="font-mono font-semibold text-slate-700">({formatCostCr(overrunVal)} ÷ {formatCostCr(origCost)}) × 100 = {costDevVal.toFixed(2)}%</span>. Measures relative cost growth over baseline.
                  </p>
                </div>

                {/* 3. Unspent Balance */}
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-sm">3. Unspent Budget Balance</span>
                    <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                      {formatCostCr(unspentVal)}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    Formula: Unspent Balance = Revised Cost (R) − Cumulative Expenditure (E)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                    Calculation: <span className="font-mono font-semibold text-slate-700">{formatCostCr(revCost)} − {formatCostCr(expCost)} = {formatCostCr(unspentVal)}</span>. Remaining unencumbered liquid funds available for forthcoming construction tranches.
                  </p>
                </div>

                {/* 4. Budget Utilization Rate */}
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-sm">4. Budget Utilization Rate (Financial Burn)</span>
                    <span className="font-mono font-bold text-navy-800 bg-sky-50 px-2.5 py-0.5 rounded border border-sky-200">
                      {utilizationVal.toFixed(1)}%
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    Formula: Utilization Rate % = (Cumulative Expenditure (E) ÷ Revised Cost (R)) × 100
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                    Calculation: <span className="font-mono font-semibold text-slate-700">({formatCostCr(expCost)} ÷ {formatCostCr(revCost)}) × 100 = {utilizationVal.toFixed(1)}%</span>. The percentage of total sanctioned funds disbursed to contractors to date.
                  </p>
                </div>

                {/* 5. Spend-to-Progress Velocity Ratio */}
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-sm">5. Spend-to-Progress Velocity Ratio</span>
                    <span className={`font-mono font-bold px-2.5 py-0.5 rounded border ${velocityVal > 1.0 ? 'text-amber-800 bg-amber-50 border-amber-200' : 'text-emerald-800 bg-emerald-50 border-emerald-200'}`}>
                      {velocityVal.toFixed(2)}x
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    Formula: Velocity = Budget Utilization Rate % ÷ Reported Physical Progress % (P)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                    Calculation: <span className="font-mono font-semibold text-slate-700">{utilizationVal.toFixed(1)}% ÷ {reportedProg}% = {velocityVal.toFixed(2)}x</span>. A velocity ratio of <strong className="text-slate-700">1.0x</strong> indicates parity between money spent and physical progress. Ratios <strong className="text-amber-700">&gt; 1.0x</strong> signify that treasury disbursements are outpacing physical structures verified on site.
                  </p>
                </div>

                {/* 6. Physical vs Financial Gap */}
                <div className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-slate-800 text-sm">6. Physical vs Financial Divergence Gap</span>
                    <span className={`font-mono font-bold px-2.5 py-0.5 rounded border ${gapVal > 15 ? 'text-rose-700 bg-rose-50 border-rose-200' : 'text-slate-800 bg-slate-100 border-slate-200'}`}>
                      {gapVal > 0 ? `+${gapVal}%` : `${gapVal}%`}
                    </span>
                  </div>
                  <div className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                    Formula: Divergence Gap % = Budget Utilization Rate % − Reported Physical Progress % (P)
                  </div>
                  <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed">
                    Calculation: <span className="font-mono font-semibold text-slate-700">{utilizationVal.toFixed(1)}% − {reportedProg}% = {gapVal > 0 ? `+${gapVal}%` : `${gapVal}%`}</span>. Divergence exceeding 15% automatically flags the site for independent Section 65B physical ground corroboration.
                  </p>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end text-xs">
                <button
                  type="button"
                  onClick={() => setShowCalculationModal(false)}
                  className="px-4 py-2 bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg font-bold shadow-xs cursor-pointer"
                >
                  Close Breakdown
                </button>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Action Creation Modal */}
      {showActionModal && canCreateActions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowActionModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-navy-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm">Initiate Corrective Action for {project.project_id}</h3>
              <button onClick={() => setShowActionModal(false)} className="text-white text-lg leading-none">✕</button>
            </div>

            <form onSubmit={handleCreateAction} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Action Title *</label>
                <input
                  required
                  type="text"
                  value={actionTitle}
                  onChange={e => setActionTitle(e.target.value)}
                  placeholder="e.g. Rectify compaction and submit updated lab reports"
                  className="w-full border border-slate-200 rounded p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  required
                  rows={3}
                  value={actionDesc}
                  onChange={e => setActionDesc(e.target.value)}
                  placeholder="Detailed instructions for the assigned engineer or agency..."
                  className="w-full border border-slate-200 rounded p-2 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Action *</label>
                <input
                  required
                  type="text"
                  value={actionReason}
                  onChange={e => setActionReason(e.target.value)}
                  className="w-full border border-slate-200 rounded p-2 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Priority *</label>
                  <select
                    value={actionPriority}
                    onChange={e => setActionPriority(e.target.value as any)}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                  >
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Due Date *</label>
                  <input
                    required
                    type="date"
                    value={actionDueDate}
                    onChange={e => setActionDueDate(e.target.value)}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Assign To User</label>
                  <input
                    type="text"
                    placeholder="Officer username"
                    value={actionAssignee}
                    onChange={e => setActionAssignee(e.target.value)}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Executing Department / Contractor</label>
                  <input
                    type="text"
                    placeholder="e.g. NHAI, PWD, L&T"
                    value={actionAgency}
                    onChange={e => setActionAgency(e.target.value)}
                    className="w-full border border-slate-200 rounded p-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowActionModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded"
                >
                  {actionLoading ? "Submitting..." : "Initiate Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
