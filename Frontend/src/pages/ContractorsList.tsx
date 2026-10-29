import { useNavigate } from "react-router-dom"
import { useState, useEffect, useMemo } from "react"
import { contractorService, ContractorWithStats } from "../services/contractorService"

export default function ContractorsList() {
  const navigate = useNavigate()
  const [contractors, setContractors] = useState<ContractorWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedSector, setSelectedSector] = useState<string>("ALL")
  const [riskFilter, setRiskFilter] = useState<"ALL" | "High" | "Medium" | "Low">("ALL")

  useEffect(() => {
    let isMounted = true
    contractorService
      .getContractors()
      .then((data) => {
        if (isMounted) {
          setContractors(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Error loading contractors:", err)
        if (isMounted) setLoading(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Aggregate high-level KPIs across all contractors
  const totals = useMemo(() => {
    const totalContractors = contractors.length
    const totalProjects = contractors.reduce((s, c) => s + c.totalProjects, 0)
    const totalValueCr = contractors.reduce((s, c) => s + c.totalCostCr, 0)
    const totalHighRisk = contractors.reduce((s, c) => s + c.highRiskProjects, 0)
    const avgProgress =
      totalContractors > 0
        ? Math.round((contractors.reduce((s, c) => s + c.avgProgress, 0) / totalContractors) * 10) / 10
        : 0

    return { totalContractors, totalProjects, totalValueCr, totalHighRisk, avgProgress }
  }, [contractors])

  // Collect unique sectors across contractors
  const availableSectors = useMemo(() => {
    const s = new Set<string>()
    contractors.forEach((c) => c.sectors.forEach((sec) => s.add(sec)))
    return Array.from(s).sort()
  }, [contractors])

  // Filtered list
  const filteredContractors = useMemo(() => {
    const q = search.trim().toLowerCase()
    return contractors.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.registration.toLowerCase().includes(q) ||
        c.headquarters.toLowerCase().includes(q)

      const matchesSector =
        selectedSector === "ALL" || c.sectors.includes(selectedSector)

      const matchesRisk = riskFilter === "ALL" || c.riskLevel === riskFilter

      return matchesSearch && matchesSector && matchesRisk
    })
  }, [contractors, search, selectedSector, riskFilter])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-2xl text-navy-900">Contractor Directory</h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-bold">
              Live MoSPI Dataset Linked
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Performance analytics, risk profiles, and project portfolios derived directly from active government infrastructure projects
          </p>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search contractor, ID, HQ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border border-slate-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-navy-500 focus:ring-1 focus:ring-navy-500 w-64 shadow-sm"
            />
            <span className="absolute left-3 top-2.5 text-slate-400 text-sm">🔍</span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Registered Firms</div>
          <div className="font-mono text-2xl font-bold text-navy-900">{loading ? "—" : totals.totalContractors}</div>
          <div className="text-xs text-slate-500 mt-1">Class A & A+ Agencies</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Total Assigned Projects</div>
          <div className="font-mono text-2xl font-bold text-navy-900">{loading ? "—" : totals.totalProjects}</div>
          <div className="text-xs text-slate-500 mt-1">100% of National Projects</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Combined Portfolio</div>
          <div className="font-mono text-2xl font-bold text-navy-900">
            {loading ? "—" : `₹${(totals.totalValueCr / 1000).toFixed(1)}k Cr`}
          </div>
          <div className="text-xs text-slate-500 mt-1">Sanctioned capital value</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Avg Execution Progress</div>
          <div className="font-mono text-2xl font-bold text-emerald-600">{loading ? "—" : `${totals.avgProgress}%`}</div>
          <div className="text-xs text-slate-500 mt-1">Across all work packages</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">High Risk / Anomaly</div>
          <div className="font-mono text-2xl font-bold text-amber-600">{loading ? "—" : totals.totalHighRisk}</div>
          <div className="text-xs text-slate-500 mt-1">Requiring proactive audit</div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Sector:</span>
          <button
            onClick={() => setSelectedSector("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              selectedSector === "ALL"
                ? "bg-navy-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Sectors
          </button>
          {availableSectors.map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedSector === sector
                  ? "bg-navy-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {sector}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Risk:</span>
          {(["ALL", "High", "Medium", "Low"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRiskFilter(r)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition ${
                riskFilter === r
                  ? r === "High"
                    ? "bg-red-600 text-white"
                    : r === "Medium"
                    ? "bg-amber-500 text-white"
                    : r === "Low"
                    ? "bg-emerald-600 text-white"
                    : "bg-navy-800 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r === "ALL" ? "All" : r}
            </button>
          ))}
        </div>
      </div>

      {/* Contractors Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse space-y-4">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                  <div className="h-5 w-44 bg-slate-200 rounded" />
                </div>
                <div className="w-10 h-10 rounded-full bg-slate-200" />
              </div>
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                <div className="h-8 bg-slate-100 rounded" />
                <div className="h-8 bg-slate-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredContractors.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-navy-900">No contractors found</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria or active filters.</p>
          <button
            onClick={() => {
              setSearch("")
              setSelectedSector("ALL")
              setRiskFilter("ALL")
            }}
            className="mt-4 px-4 py-2 bg-navy-800 text-white rounded-lg text-xs font-bold hover:bg-navy-900 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContractors.map((c) => {
            const isNoProjects = c.totalProjects === 0
            const isHighRisk = !isNoProjects && c.avgRisk >= 60
            const isMediumRisk = !isNoProjects && c.avgRisk >= 35 && c.avgRisk < 60

            return (
              <div
                key={c.id}
                onClick={() => navigate(`/contractors/${c.id}`)}
                className="bg-white border border-slate-200 hover:border-navy-400 rounded-xl p-5 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Top card bar */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-navy-600 bg-navy-50 px-2 py-0.5 rounded">
                          {c.id}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded" title="Institutional Credit & Track Record Rating">
                          {c.creditRating}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {c.headquarters.split(",")[0]}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-navy-900 text-lg leading-tight mt-1.5 group-hover:text-navy-700 transition">
                        {c.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5 font-medium">{c.category}</div>
                    </div>

                    {/* Risk Circle */}
                    <div
                      className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl flex-shrink-0 font-bold border transition ${
                        isNoProjects
                          ? "bg-slate-50 text-slate-400 border-slate-200"
                          : isHighRisk
                          ? "bg-red-50 text-red-700 border-red-200"
                          : isMediumRisk
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                      title={isNoProjects ? "No projects in active scope" : `Risk Score: ${c.avgRisk}/100 (${c.riskLevel})`}
                    >
                      <span className="font-mono text-base leading-none">{isNoProjects ? "—" : c.avgRisk}</span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold mt-0.5">
                        {isNoProjects ? "N/A" : c.riskLevel}
                      </span>
                    </div>
                  </div>

                  {/* Sectors Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {c.sectors.map((sec) => (
                      <span
                        key={sec}
                        className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded font-medium"
                      >
                        {sec}
                      </span>
                    ))}
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                        Avg Execution Progress
                      </span>
                      <span className="font-mono font-bold text-navy-900">{c.avgProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-navy-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.max(5, c.avgProgress))}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                      <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Projects</div>
                      <div className="font-mono text-base font-bold text-navy-900 mt-0.5">{c.totalProjects}</div>
                    </div>
                    <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                      <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Sanctioned</div>
                      <div className="font-mono text-sm font-bold text-navy-900 mt-1 truncate" title={`₹${c.totalCostCr} Cr`}>
                        ₹{c.totalCostCr > 10000 ? `${(c.totalCostCr / 1000).toFixed(1)}k` : c.totalCostCr} Cr
                      </div>
                    </div>
                    <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100">
                      <div className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Delayed</div>
                      <div
                        className={`font-mono text-base font-bold mt-0.5 ${
                          c.delayedProjects > 0 ? "text-amber-600" : "text-emerald-600"
                        }`}
                      >
                        {c.delayedProjects}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-navy-700 font-bold pt-1 group-hover:text-navy-900">
                    <span>View Assigned Projects</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
