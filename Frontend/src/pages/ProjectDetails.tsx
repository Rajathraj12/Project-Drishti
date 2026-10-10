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
  const [activeTab, setActiveTab] = useState("overview")
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [whyFlagged, setWhyFlagged] = useState<any>(null)

  const handleAnalyze = async () => {
    if (!id) return;
    setAnalysisLoading(true);
    try {
      const result = await projectService.triggerAnalysis(id);
      setAnalysisResult(result);
      const flagged = await projectService.getWhyFlagged(id);
      setWhyFlagged(flagged);
    } catch (e) {
      console.error(e);
    }
    setAnalysisLoading(false);
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
    }
    
    return () => clearTimeout(t)
  }, [id])
  
  if (loading) return <div className="p-6">Loading project...</div>;
  if (!project) return <div className="p-6">Project not found</div>;

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
                {project.data_source_type}
              </span>
            </div>
            <h1 className="font-display font-700 text-2xl text-navy-900">{project.project_name}</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">📍 {project.district}, {project.state}</span>
              <span>·</span>
              <span>Department: {project.department}</span>
              <span>·</span>
              <span>Status: {project.verification_status}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleAnalyze}
              disabled={analysisLoading}
              className={`text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 font-500 transition-colors ${analysisLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {analysisLoading ? "Analyzing..." : "Analyze Project"}
            </button>
            <button
              onClick={() => navigate("/inspections")}
              className="text-sm border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50 font-500 transition-colors"
            >
              Assign Inspection
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
          { label: "Revised Cost", value: `₹${(project.revised_cost / 10000000).toFixed(2)} Cr`, sub: "Latest", color: "text-slate-800" },
          { label: "Spent", value: `₹${(project.expenditure / 10000000).toFixed(2)} Cr`, sub: `${project.financial_utilization_pct?.toFixed(1) || 0}% of revised budget`, color: "text-risk-high" },
          { label: "Cost Overrun", value: `₹${(((project.revised_cost || 0) - (project.original_cost || 0)) / 10000000).toFixed(2)} Cr`, sub: `${project.cost_deviation_pct?.toFixed(1) || 0}% deviation`, color: "text-risk-medium" },
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

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left: Risk panel */}
        <div className="xl:col-span-2 space-y-6">

          {analysisResult && (
            <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-100 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-4">ML Analysis Detection</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Status</div>
                  <div className={`font-600 ${analysisResult.anomaly_flag ? 'text-risk-high' : 'text-risk-low'}`}>
                    {analysisResult.anomaly_flag ? 'Anomaly Detected' : 'No Anomaly'}
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Model</div>
                  <div className="font-600 text-slate-800">Isolation Forest</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Version</div>
                  <div className="font-600 text-slate-800">{analysisResult.model_version}</div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Anomaly Score</div>
                  <div className="font-600 text-slate-800">{analysisResult.ml_score?.toFixed(4) || 'N/A'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Risk panel */}
          <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-200 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex flex-col sm:flex-row gap-6">
              {/* Score */}
              <div className="flex flex-col items-center justify-center bg-risk-high-bg rounded-xl p-6 sm:w-48 flex-shrink-0">
                <div className="text-xs font-mono font-600 text-risk-high uppercase tracking-widest mb-2">Overall Risk</div>
                <div className="font-mono font-800 text-6xl text-risk-high">88</div>
                <div className="text-xs text-risk-high font-600 mt-1">/100</div>
                <div className="mt-3 bg-risk-high text-white text-xs font-700 px-3 py-1 rounded-full">HIGH RISK</div>
              </div>

              {/* Breakdown */}
              <div className="flex-1">
                <h3 className="font-display font-700 text-navy-900 mb-4">Risk Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { label: "Progress Mismatch", value: 92, color: "bg-risk-high" },
                    { label: "Cost Anomaly", value: 89, color: "bg-risk-high" },
                    { label: "Timeline Risk", value: 81, color: "bg-risk-high" },
                    { label: "Evidence Conflict", value: 76, color: "bg-risk-medium" },
                    { label: "Contractor Risk", value: 72, color: "bg-risk-medium" },
                  ].map((r) => (
                    <div key={r.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600">{r.label}</span>
                        <span className={`font-mono font-600 text-sm ${r.value >= 80 ? "text-risk-high" : "text-risk-medium"}`}>
                          {r.value}
                        </span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <div
                          className={`${r.color} h-2 rounded-full transition-all duration-1000`}
                          style={{ width: animated ? `${r.value}%` : "0%" }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Why flagged */}
          {whyFlagged && (
            <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-300 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              <h2 className="font-display font-700 text-navy-900 text-lg mb-1">Why was this project flagged?</h2>
              <p className="text-xs text-slate-400 mb-5">Evidence-based reasons and ML signals</p>

              <div className="space-y-4">
                {whyFlagged.rule_signals?.map((r: any, i: number) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl border bg-amber-50 border-amber-100">
                    <div className="font-mono font-700 text-2xl text-slate-300 flex-shrink-0 w-8">R{i+1}</div>
                    <div className="flex-1">
                      <span className="text-base mr-2">⚠️</span>
                      <span className="text-sm text-slate-700 leading-relaxed font-600">[{r.rule_code}]</span>
                      <span className="text-sm text-slate-700 leading-relaxed ml-2">{r.message}</span>
                    </div>
                  </div>
                ))}
                
                {whyFlagged.ml_signal?.anomaly_flag && (
                  <div className="flex gap-4 p-4 rounded-xl border bg-red-50 border-red-100">
                    <div className="font-mono font-700 text-2xl text-slate-300 flex-shrink-0 w-8">ML</div>
                    <div className="flex-1">
                      <span className="text-base mr-2">🤖</span>
                      <span className="text-sm text-slate-700 leading-relaxed font-600">[Anomaly Detection]</span>
                      <span className="text-sm text-slate-700 leading-relaxed ml-2">{whyFlagged.ml_signal.explanation}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Evidence Confidence */}
          <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-400 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-2 h-2 bg-accent-500 rounded-full"></div>
              <h2 className="font-display font-700 text-navy-900 text-base">Evidence Confidence</h2>
            </div>

            <div className="flex gap-8 mb-6">
              <div className="text-center">
                <div className="text-xs font-mono text-slate-400 uppercase mb-1">Reported Progress</div>
                <div className="font-mono font-700 text-3xl text-slate-800">80%</div>
              </div>
              <div className="w-px bg-slate-100"></div>
              <div className="text-center">
                <div className="text-xs font-mono text-slate-400 uppercase mb-1">Evidence Confidence</div>
                <div className="font-mono font-700 text-3xl text-amber-500">68%</div>
              </div>
            </div>

            <div className="space-y-2 mb-5">
              {[
                { label: "Financial records", status: "verified" },
                { label: "Milestone updates", status: "verified" },
                { label: "Agency photographs", status: "verified" },
                { label: "Inspection report", status: "verified" },
                { label: "Remote imagery", status: "warning" },
              ].map((e) => (
                <div key={e.label} className="flex items-center justify-between py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{e.label}</span>
                  <span className={e.status === "verified" ? "text-risk-low text-base" : "text-risk-medium text-base"}>
                    {e.status === "verified" ? "✓" : "⚠"}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-sm text-slate-600 italic">
                "Progress information is available, but remote imagery does not fully corroborate the reported 47% completion. Additional on-site verification may be useful."
              </p>
            </div>
          </div>
        </div>

        {/* Right: Radar + Timeline */}
        <div className="space-y-6">
          {/* Radar chart */}
          <div className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-500 delay-200 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h3 className="font-display font-700 text-navy-900 text-sm mb-4">Risk Profile</h3>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#E2E8F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748B" }} />
                  <Radar dataKey="value" stroke="#DC2626" fill="#DC2626" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Project timeline */}
          <div className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-500 delay-300 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h3 className="font-display font-700 text-navy-900 text-sm mb-4">Project Timeline</h3>
            <div className="space-y-4">
              {[
                { date: "Mar 2024", event: "Project sanctioned", status: "done" },
                { date: "Apr 2024", event: "Contractor awarded", status: "done" },
                { date: "Jun 2024", event: "Work commenced", status: "done" },
                { date: "Oct 2024", event: "First milestone (25%)", status: "done" },
                { date: "Feb 2025", event: "Expected 50% — Actual 35%", status: "issue" },
                { date: "Apr 2026", event: "Original deadline (missed)", status: "missed" },
                { date: "Sep 2026", event: "Revised deadline", status: "upcoming" },
              ].map((t, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-0.5 ${
                      t.status === "done" ? "bg-risk-low" :
                      t.status === "issue" ? "bg-risk-medium" :
                      t.status === "missed" ? "bg-risk-high" :
                      "bg-slate-200 border-2 border-slate-300"
                    }`}></div>
                    {i < 6 && <div className="w-px flex-1 bg-slate-100 my-1"></div>}
                  </div>
                  <div className="pb-1">
                    <div className="text-xs font-mono text-slate-400">{t.date}</div>
                    <div className={`text-xs mt-0.5 font-500 ${
                      t.status === "missed" ? "text-risk-high" :
                      t.status === "issue" ? "text-risk-medium" :
                      t.status === "upcoming" ? "text-slate-400" :
                      "text-slate-600"
                    }`}>{t.event}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Source Data Info */}
          <div className={`bg-white rounded-xl border border-slate-200 p-5 transition-all duration-500 delay-400 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h3 className="font-display font-700 text-navy-900 text-sm mb-4">Source Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] text-slate-400">Data Source Type</div>
                <div className="font-600 text-slate-800 text-sm">{project.data_source_type}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Source Name</div>
                <div className="font-600 text-slate-800 text-sm">{project.source_name || "N/A"}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Source Reference ID</div>
                <div className="font-600 text-slate-800 text-sm">{project.source_project_id || "N/A"}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Source As-Of Date</div>
                <div className="font-600 text-slate-800 text-sm">{project.source_as_of_date || "N/A"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[10px] text-slate-400">Source URL</div>
                <div className="font-600 text-slate-800 text-sm truncate" title={project.source_url}>{project.source_url || "N/A"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
