import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState } from "react"
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts"
import { projectService } from "../services/projectService"
import { Project } from "../types"

const radarData = [
  { subject: "Progress", value: 92 },
  { subject: "Cost", value: 89 },
  { subject: "Timeline", value: 81 },
  { subject: "Contractor", value: 72 },
  { subject: "Evidence", value: 76 },
]

export default function ProjectDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [animated, setAnimated] = useState(false)
  
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [mlAssessment, setMlAssessment] = useState<any>(null)
  
  const [verifications, setVerifications] = useState<any[]>([])
  
  // Form State
  const [verifyStatus, setVerifyStatus] = useState("IN_REVIEW")
  const [verifyNotes, setVerifyNotes] = useState("")
  const [verifyEvidence, setVerifyEvidence] = useState("")
  const [verifyLoading, setVerifyLoading] = useState(false)

  const fetchAssessments = () => {
    if (!id) return;
    projectService.getProjectRisk(id).then(setAnalysisResult).catch(() => setAnalysisResult(null));
    projectService.getProjectMlRisk(id).then(setMlAssessment).catch(() => setMlAssessment(null));
  }
  
  const fetchVerifications = () => {
    if (!id) return;
    projectService.getVerifications(id).then(setVerifications).catch(() => setVerifications([]));
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
    }
    return () => clearTimeout(t)
  }, [id])
  
  if (loading) return <div className="p-6">Loading project...</div>;
  if (!project) return <div className="p-6">Project not found</div>;

  // Derive Unified Risk State
  const ruleFlag = analysisResult?.risk_score >= 40;
  const mlFlag = mlAssessment?.anomaly_flag === true;
  let unifiedState = "Neither Flagged";
  let stateColor = "bg-green-100 text-green-800 border-green-200";
  if (ruleFlag && mlFlag) {
    unifiedState = "Both Flagged (Rule + ML)";
    stateColor = "bg-red-100 text-red-800 border-red-200";
  } else if (ruleFlag && !mlFlag) {
    unifiedState = "Rule Risk Flagged Only";
    stateColor = "bg-orange-100 text-orange-800 border-orange-200";
  } else if (!ruleFlag && mlFlag) {
    unifiedState = "ML Anomaly Flagged Only";
    stateColor = "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (!analysisResult || !mlAssessment) {
    unifiedState = "Not Fully Assessed";
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
              <span className={`text-xs font-600 px-2.5 py-1 rounded-full border ${project.data_source_type === 'SYNTHETIC_DEMO' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {project.data_source_type === 'SYNTHETIC_DEMO' ? 'Synthetic Demo' : 'Official Data'}
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
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={analysisLoading}
              className={`text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 font-500 transition-colors ${analysisLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {analysisLoading ? "Running Phase 3 & 4..." : "Trigger Full Analysis"}
            </button>
            <button
              onClick={() => navigate("/evidence")}
              className="text-sm bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-700 font-500 transition-colors"
            >
              View Evidence
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Original Cost", value: `₹${(project.original_cost / 10000000).toFixed(2)} Cr`, sub: "Allocated", color: "text-slate-800" },
          { label: "Revised Cost", value: `₹${((project.revised_cost || project.original_cost) / 10000000).toFixed(2)} Cr`, sub: "Latest", color: "text-slate-800" },
          { label: "Spent", value: `₹${(project.expenditure / 10000000).toFixed(2)} Cr`, sub: `${project.financial_utilization_pct?.toFixed(1) || 0}% of revised budget`, color: "text-risk-high" },
          { label: "Cost Overrun", value: `₹${(((project.revised_cost || project.original_cost) - (project.original_cost || 0)) / 10000000).toFixed(2)} Cr`, sub: `${project.cost_deviation_pct?.toFixed(1) || 0}% deviation`, color: "text-risk-medium" },
          { label: "Reported Progress", value: `${project.reported_progress || 0}%`, sub: "Physical completion", color: "text-accent-500" },
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

      {/* Unified Project Risk-Inspection View */}
      <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-100 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h2 className="font-display font-700 text-navy-900 text-xl">Unified Risk Inspection View</h2>
          <div className={`px-4 py-1.5 rounded-full border text-sm font-bold ${stateColor}`}>
            {unifiedState}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phase 3 Rule-Based Panel */}
          <div className="border border-slate-200 rounded-lg p-5">
            <h3 className="font-600 text-slate-800 border-b pb-3 mb-4 flex justify-between">
              <span>Phase 3: Rule-Based Engine</span>
              <span className="font-mono text-sm text-slate-500">v{analysisResult?.rule_engine_version || "N/A"}</span>
            </h3>
            
            {analysisResult ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Risk Score</div>
                    <div className="text-3xl font-display font-800 text-navy-900">{analysisResult.risk_score}<span className="text-lg text-slate-400">/100</span></div>
                  </div>
                  <div className={`px-3 py-1 text-xs font-bold rounded uppercase ${analysisResult.risk_level === 'Critical' ? 'bg-red-100 text-red-800' : analysisResult.risk_level === 'High' ? 'bg-orange-100 text-orange-800' : analysisResult.risk_level === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                    {analysisResult.risk_level} Risk
                  </div>
                </div>

                <div className="space-y-3 mt-4">
                  <div className="text-xs font-bold text-slate-600 uppercase">Triggered Rules:</div>
                  {analysisResult.rules_triggered?.length === 0 ? (
                    <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded">No rules triggered.</div>
                  ) : (
                    analysisResult.rules_triggered?.map((r: any, i: number) => (
                      <div key={i} className="bg-slate-50 p-3 rounded border text-sm border-slate-100">
                        <div className="flex justify-between font-bold text-slate-700 mb-1">
                          <span>{r.rule_id}: {r.title}</span>
                          <span className="text-risk-high">+{r.points} pts</span>
                        </div>
                        <div className="text-slate-600 mb-2">{r.description}</div>
                        <div className="text-xs font-mono text-slate-500">
                          Threshold: {r.threshold} | Observed: {JSON.stringify(r.observed_values)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-10 text-center">No Rule-Based Assessment available.</div>
            )}
          </div>

          {/* Phase 4 ML Anomaly Panel */}
          <div className="border border-slate-200 rounded-lg p-5">
            <h3 className="font-600 text-slate-800 border-b pb-3 mb-4 flex justify-between">
              <span>Phase 4: ML Isolation Forest</span>
              <span className="font-mono text-sm text-slate-500">v{mlAssessment?.model_version || "N/A"}</span>
            </h3>
            
            {mlAssessment ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">Anomaly Score</div>
                    <div className="text-3xl font-display font-800 text-navy-900">{mlAssessment.ml_anomaly_score ?? "N/A"}</div>
                    <div className="text-[10px] text-slate-400 mt-1">Lower = More anomalous</div>
                  </div>
                  <div className={`px-3 py-1 text-xs font-bold rounded uppercase ${mlAssessment.anomaly_status === 'INSUFFICIENT_DATA' ? 'bg-slate-100 text-slate-600' : mlAssessment.anomaly_flag ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                    {mlAssessment.anomaly_status === 'INSUFFICIENT_DATA' ? "Insufficient Data" : mlAssessment.anomaly_flag ? "Anomalous" : "Normal"}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded p-3 text-sm text-blue-900 mt-4 leading-relaxed">
                  <strong>Contextual Explanation: </strong> 
                  {mlAssessment.explanation || "No explanation provided."}
                  <div className="text-[10px] mt-2 opacity-70">Note: Isolation Forest flags multidimensional outliers but does not establish causality or proof of misconduct.</div>
                </div>

                {mlAssessment.data_quality_warnings?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded p-3 text-sm text-amber-900 mt-2">
                    <strong>Warnings: </strong> 
                    {mlAssessment.data_quality_warnings.map((w: string, i: number) => <div key={i}>{w}</div>)}
                  </div>
                )}
                
                <div className="text-xs text-slate-500 font-mono mt-4">
                  Features used: {mlAssessment.features_used?.join(', ') || 'None'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 py-10 text-center">No ML Assessment available.</div>
            )}
          </div>
        </div>
        
        {/* Investigation Summary */}
        <div className="mt-6 bg-slate-50 p-5 rounded-lg border border-slate-200">
          <h3 className="font-600 text-navy-900 text-sm mb-2">Investigation Summary</h3>
          <p className="text-sm text-slate-700 leading-relaxed">
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

      {/* Human Verification Workflow & Audit Trail */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500 delay-200 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="font-display font-700 text-navy-900 text-lg mb-4">Record Verification</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-600 text-slate-600 mb-1">Update Status</label>
              <select 
                value={verifyStatus} 
                onChange={(e) => setVerifyStatus(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-md focus:border-navy-500 focus:ring-navy-500"
              >
                <option value="NOT_REVIEWED">Not Reviewed</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="VERIFIED">Verified (Cleared)</option>
                <option value="CLOSED">Closed (Action Taken)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-600 text-slate-600 mb-1">Review Notes</label>
              <textarea 
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                rows={3} 
                className="w-full text-sm border-slate-200 rounded-md focus:border-navy-500 focus:ring-navy-500"
                placeholder="Enter findings or observations..."
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-600 text-slate-600 mb-1">Evidence Reference URL (Optional)</label>
              <input 
                type="text" 
                value={verifyEvidence}
                onChange={(e) => setVerifyEvidence(e.target.value)}
                className="w-full text-sm border-slate-200 rounded-md focus:border-navy-500 focus:ring-navy-500"
                placeholder="e.g. https://system/docs/report123.pdf"
              />
            </div>
            <button 
              onClick={handleVerify}
              disabled={verifyLoading}
              className={`w-full bg-navy-800 text-white font-600 py-2 rounded-md hover:bg-navy-700 transition ${verifyLoading ? 'opacity-50' : ''}`}
            >
              {verifyLoading ? "Saving..." : "Submit Verification Record"}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col h-full max-h-[420px]">
          <h3 className="font-display font-700 text-navy-900 text-lg mb-4">Verification Audit Trail</h3>
          <div className="overflow-y-auto pr-2 space-y-4 flex-1">
            {verifications.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-10 italic">No human reviews recorded yet.</div>
            ) : (
              verifications.map((v, i) => (
                <div key={i} className="border-l-2 border-navy-300 pl-4 py-1">
                  <div className="flex justify-between items-start">
                    <div className="text-xs font-bold text-navy-900">{v.reviewer_name} <span className="text-slate-400 font-normal">({v.reviewer_role})</span></div>
                    <div className="text-[10px] text-slate-500 font-mono">{new Date(v.timestamp).toLocaleString()}</div>
                  </div>
                  <div className="text-xs font-600 text-slate-700 mt-1 mb-1">Status changed to: {v.verification_status}</div>
                  <p className="text-sm text-slate-600">{v.notes || "No notes provided."}</p>
                  {v.evidence_references?.length > 0 && (
                    <div className="text-xs text-blue-600 mt-2 truncate">
                      📎 {v.evidence_references.map((e: string, j: number) => <span key={j}>{e} </span>)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
