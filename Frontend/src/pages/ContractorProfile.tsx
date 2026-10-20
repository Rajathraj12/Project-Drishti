import { useNavigate, useParams } from "react-router-dom"
import { useEffect, useState, useMemo } from "react"
import { contractorService, ContractorWithStats } from "../services/contractorService"
import { Project } from "../types"

export default function ContractorProfile() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [contractor, setContractor] = useState<ContractorWithStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [sectorFilter, setSectorFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "DELAYED" | "NORMAL">("ALL")

  useEffect(() => {
    if (!id) return
    let isMounted = true
    contractorService
      .getContractorById(id)
      .then((data) => {
        if (isMounted) {
          setContractor(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Failed to load contractor profile:", err)
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [id])

  // Sector breakdown of assigned projects
  const sectorCounts = useMemo(() => {
    if (!contractor) return {}
    const counts: Record<string, number> = {}
    contractor.projects.forEach((p) => {
      const sec = p.sector || "Other"
      counts[sec] = (counts[sec] || 0) + 1
    })
    return counts
  }, [contractor])

  // Filtered assigned projects
  const filteredProjects = useMemo(() => {
    if (!contractor) return []
    const q = searchTerm.trim().toLowerCase()

    return contractor.projects.filter((p) => {
      const matchesSearch =
        !q ||
        p.project_id.toLowerCase().includes(q) ||
        p.project_name.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        (p.sector && p.sector.toLowerCase().includes(q))

      const matchesSector = sectorFilter === "ALL" || p.sector === sectorFilter

      const hasDelay =
        Number(p.cost_overrun_cr || 0) > 0 ||
        Number(p.reported_progress_pct ?? p.reported_progress ?? 100) < 40 ||
        (p.delay_days != null && p.delay_days > 0)

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "DELAYED" && hasDelay) ||
        (statusFilter === "NORMAL" && !hasDelay)

      return matchesSearch && matchesSector && matchesStatus
    })
  }, [contractor, searchTerm, sectorFilter, statusFilter])

  if (loading) {
    return (
      <div className="p-6 max-w-[1400px] mx-auto space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-40 bg-slate-200 rounded" />
          <div className="h-32 bg-white border border-slate-200 rounded-xl p-6" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-white border border-slate-200 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!contractor) {
    return (
      <div className="p-8 max-w-[800px] mx-auto text-center mt-12">
        <div className="bg-white p-8 border border-slate-200 rounded-xl shadow-sm">
          <div className="text-4xl mb-3">🏗️</div>
          <h2 className="text-xl font-bold text-navy-900 mb-2">Contractor Not Found</h2>
          <p className="text-sm text-slate-500 mb-4">
            The contractor ID "{id}" could not be located in the registered registry.
          </p>
          <button
            onClick={() => navigate("/contractors")}
            className="px-4 py-2 bg-navy-800 text-white text-xs font-bold rounded-lg hover:bg-navy-900 transition"
          >
            ← Back to Contractor Directory
          </button>
        </div>
      </div>
    )
  }

  const isHighRisk = contractor.avgRisk >= 70
  const isMediumRisk = contractor.avgRisk >= 50 && contractor.avgRisk < 70

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600 transition-colors">
          Dashboard
        </button>
        <span>›</span>
        <button onClick={() => navigate("/contractors")} className="hover:text-slate-600 transition-colors">
          Contractor Directory
        </button>
        <span>›</span>
        <span className="text-navy-800 font-bold">{contractor.name}</span>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-navy-50 border border-navy-100 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 shadow-inner">
              🏗️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-navy-600 bg-navy-50 px-2 py-0.5 rounded">
                  {contractor.id}
                </span>
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Registered Contractor
                </span>
                <span className="text-xs text-slate-400">Est. {contractor.established}</span>
              </div>
              <h1 className="font-display font-bold text-2xl text-navy-900 mt-1">{contractor.name}</h1>
              <p className="text-xs text-slate-500 max-w-2xl mt-1 leading-relaxed">
                {contractor.description}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                <span>📍 <strong className="text-slate-700">HQ:</strong> {contractor.headquarters}</span>
                <span>·</span>
                <span>📋 <strong className="text-slate-700">Category:</strong> {contractor.category}</span>
                <span>·</span>
                <span>🔖 <strong className="text-slate-700">Reg:</strong> {contractor.registration}</span>
              </div>
            </div>
          </div>

          {/* Risk Score Pill */}
          <div className="flex-shrink-0">
            <div
              className={`border rounded-xl p-4 text-center min-w-[140px] ${
                isHighRisk
                  ? "bg-red-50/70 border-red-200 text-red-700"
                  : isMediumRisk
                  ? "bg-amber-50/70 border-amber-200 text-amber-700"
                  : "bg-emerald-50/70 border-emerald-200 text-emerald-700"
              }`}
            >
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                Portfolio Risk
              </div>
              <div className="font-mono font-bold text-4xl">{contractor.avgRisk}</div>
              <div className="text-xs font-semibold mt-1">/ 100 · {contractor.riskLevel} Risk</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Assigned Projects</div>
          <div className="font-mono text-2xl font-bold text-navy-900">{contractor.totalProjects}</div>
          <div className="text-xs text-slate-500 mt-1">Official MoSPI Works</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Sanctioned Value</div>
          <div className="font-mono text-2xl font-bold text-navy-900">
            ₹{contractor.totalCostCr > 10000 ? `${(contractor.totalCostCr / 1000).toFixed(1)}k` : contractor.totalCostCr} Cr
          </div>
          <div className="text-xs text-slate-500 mt-1">Total approved cost</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Expenditure Drawn</div>
          <div className="font-mono text-2xl font-bold text-navy-800">
            ₹{contractor.totalExpenditureCr > 10000 ? `${(contractor.totalExpenditureCr / 1000).toFixed(1)}k` : contractor.totalExpenditureCr} Cr
          </div>
          <div className="text-xs text-slate-500 mt-1">Verified treasury release</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Avg Execution Progress</div>
          <div className="font-mono text-2xl font-bold text-emerald-600">{contractor.avgProgress}%</div>
          <div className="text-xs text-slate-500 mt-1">Across assigned packages</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Delayed / Critical</div>
          <div
            className={`font-mono text-2xl font-bold ${
              contractor.delayedProjects > 0 ? "text-amber-600" : "text-emerald-600"
            }`}
          >
            {contractor.delayedProjects}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {contractor.delayedProjects > 0 ? "Cost or time overrun" : "On scheduled timeline"}
          </div>
        </div>
      </div>

      {/* Sectors and Distribution Cards */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Sector Distribution ({Object.keys(sectorCounts).length} Sectors)
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(sectorCounts).map(([sec, count]) => (
            <div
              key={sec}
              onClick={() => setSectorFilter(sectorFilter === sec ? "ALL" : sec)}
              className={`cursor-pointer px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition ${
                sectorFilter === sec
                  ? "bg-navy-900 text-white border-navy-900 shadow-sm"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              <span>{sec}</span>
              <span
                className={`font-mono text-[11px] px-1.5 py-0.2 rounded-full ${
                  sectorFilter === sec ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {count}
              </span>
            </div>
          ))}
          {sectorFilter !== "ALL" && (
            <button
              onClick={() => setSectorFilter("ALL")}
              className="text-xs text-navy-700 hover:underline px-2 py-1 font-bold"
            >
              Clear Sector Filter
            </button>
          )}
        </div>
      </div>

      {/* Assigned Infrastructure Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="font-display font-bold text-navy-900 text-base">
              Assigned National Projects ({filteredProjects.length})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live projects assigned to this contractor from official MoSPI PAIMANA reporting
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search projects by ID, name, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-navy-500 w-56 bg-white"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-navy-500 bg-white"
            >
              <option value="ALL">All Statuses</option>
              <option value="DELAYED">Delayed / Overrun</option>
              <option value="NORMAL">On Track</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-3xl mb-2">📁</div>
            <p className="text-sm font-semibold text-slate-700">No projects match the selected filters</p>
            <button
              onClick={() => {
                setSearchTerm("")
                setSectorFilter("ALL")
                setStatusFilter("ALL")
              }}
              className="mt-3 text-xs text-navy-700 font-bold underline hover:text-navy-900"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">Project ID & Name</th>
                  <th className="py-3 px-3">State & Sector</th>
                  <th className="py-3 px-3 text-right">Cost (₹ Cr)</th>
                  <th className="py-3 px-3 text-right">Expenditure (₹ Cr)</th>
                  <th className="py-3 px-4">Execution Progress</th>
                  <th className="py-3 px-3 text-center">Risk Score</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((proj: Project) => {
                  const progress = Number(proj.reported_progress_pct ?? proj.reported_progress ?? 0)
                  const cost = Number(proj.revised_cost_cr || proj.original_cost_cr || proj.revised_cost || proj.original_cost || 0)
                  const exp = Number(proj.expenditure_cr || proj.expenditure || 0)
                  const risk = Number(proj.risk_score || 35)
                  const isProjHighRisk = risk >= 60 || Boolean(proj.anomaly_flag)
                  const isOverrun = Number(proj.cost_overrun_cr || 0) > 0

                  return (
                    <tr
                      key={proj.project_id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Project ID & Name */}
                      <td className="py-3 px-4 max-w-[340px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-navy-800 bg-navy-50 px-1.5 py-0.5 rounded text-[11px]">
                            {proj.project_id}
                          </span>
                          {isOverrun && (
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              Overrun
                            </span>
                          )}
                          {proj.anomaly_flag && (
                            <span className="bg-red-100 text-red-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                              ML Flag
                            </span>
                          )}
                        </div>
                        <div
                          className="font-semibold text-slate-800 mt-1 line-clamp-2 hover:text-navy-700 cursor-pointer"
                          onClick={() => navigate(`/projects/${proj.project_id}`)}
                          title={proj.project_name}
                        >
                          {proj.project_name}
                        </div>
                      </td>

                      {/* State & Sector */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-700">{proj.state}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{proj.sector || "Infrastructure"}</div>
                      </td>

                      {/* Sanctioned Cost */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                        ₹{cost.toLocaleString()}
                      </td>

                      {/* Expenditure */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        ₹{exp.toLocaleString()}
                      </td>

                      {/* Execution Progress Bar */}
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="flex justify-between items-center text-[11px] mb-1">
                          <span className="font-mono font-bold text-navy-900">{progress}%</span>
                          <span className="text-[10px] text-slate-400">
                            {progress >= 70 ? "On Track" : progress >= 40 ? "In Progress" : "Early Stage"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              progress >= 70
                                ? "bg-emerald-500"
                                : progress >= 40
                                ? "bg-navy-600"
                                : "bg-amber-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(5, progress))}%` }}
                          />
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                            isProjHighRisk
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : risk >= 45
                              ? "bg-amber-100 text-amber-700 border border-amber-200"
                              : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {risk}
                        </span>
                      </td>

                      {/* View Button */}
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate(`/projects/${proj.project_id}`)}
                          className="px-2.5 py-1 bg-navy-50 hover:bg-navy-100 text-navy-800 text-[11px] font-bold rounded transition"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
