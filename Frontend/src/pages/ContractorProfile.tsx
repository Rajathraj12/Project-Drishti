import { useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts"

const performanceData = [
  { year: "2021", projects: 2, delayed: 0, onTime: 2 },
  { year: "2022", projects: 3, delayed: 1, onTime: 2 },
  { year: "2023", projects: 4, delayed: 1, onTime: 3 },
  { year: "2024", projects: 5, delayed: 2, onTime: 3 },
  { year: "2025", projects: 4, delayed: 1, onTime: 3 },
]

const projectHistory = [
  { id: "#3210", name: "District Road Upgrade", year: "2021", value: "₹3.8 Cr", status: "Completed", delay: "None" },
  { id: "#3891", name: "Block Office Construction", year: "2021", value: "₹1.2 Cr", status: "Completed", delay: "None" },
  { id: "#4102", name: "Rural Bridge (NH-38)", year: "2022", value: "₹7.4 Cr", status: "Completed", delay: "2 months" },
  { id: "#4456", name: "Community Hall — Ramanagara", year: "2022", value: "₹2.1 Cr", status: "Completed", delay: "None" },
  { id: "#5003", name: "School Complex — Hubli", year: "2023", value: "₹3.3 Cr", status: "Completed", delay: "None" },
  { id: "#5291", name: "Water Treatment Plant", year: "2023", value: "₹9.6 Cr", status: "Completed", delay: "4 months" },
  { id: "#5778", name: "Taluk Hospital Wing", year: "2024", value: "₹4.5 Cr", status: "Completed", delay: "None" },
  { id: "#6120", name: "Urban Road Widening — KR Puram", year: "2024", value: "₹6.2 Cr", status: "Completed", delay: "3 months" },
  { id: "#6891", name: "Industrial Shed — Bommasandra", year: "2024", value: "₹2.8 Cr", status: "Completed", delay: "5 months" },
  { id: "#7192", name: "Ward Road Widening — Bengaluru", year: "2025", value: "₹5.1 Cr", status: "In Progress", delay: "3 months" },
  { id: "#4821", name: "Community Hall — Mysuru", year: "2026", value: "₹2.4 Cr", status: "In Progress", delay: "5 months" },
]

export default function ContractorProfile() {
  const navigate = useNavigate()
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <button onClick={() => navigate("/dashboard")} className="hover:text-slate-600 transition-colors">Dashboard</button>
        <span>›</span>
        <span>Contractors</span>
        <span>›</span>
        <span className="text-navy-700">ABC Infrastructure Pvt. Ltd.</span>
      </div>

      {/* Header card */}
      <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-navy-100 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0">
              🏗️
            </div>
            <div>
              <h1 className="font-display font-700 text-2xl text-navy-900">ABC Infrastructure Pvt. Ltd.</h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                <span>Registered Contractor · Karnataka</span>
                <span>·</span>
                <span>Category: Class A Civil Works</span>
                <span>·</span>
                <span>Registration: KA/CON/2018/1047</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="bg-risk-medium-bg border border-amber-200 rounded-xl p-4 text-center">
              <div className="text-xs font-mono text-amber-600 uppercase tracking-wider mb-1">Contractor Risk</div>
              <div className="font-mono font-800 text-4xl text-risk-medium">72</div>
              <div className="text-xs text-amber-500 mt-1">/ 100 · Medium</div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Projects Handled", value: "18", color: "text-navy-800", bg: "bg-navy-50" },
          { label: "Completed", value: "13", color: "text-risk-low", bg: "bg-risk-low-bg" },
          { label: "Delayed", value: "5", color: "text-risk-medium", bg: "bg-risk-medium-bg" },
          { label: "Cost Variations", value: "4", color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Avg. Delay", value: "3.2 mo", color: "text-risk-high", bg: "bg-risk-high-bg" },
        ].map((s, i) => (
          <div
            key={s.label}
            className={`bg-white rounded-xl border border-slate-200 p-4 transition-all duration-500 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 60}ms` }}
          >
            <div className={`${s.bg} w-10 h-10 rounded-lg flex items-center justify-center mb-3`}>
              <span className={`font-mono font-700 text-sm ${s.color}`}>{s.value}</span>
            </div>
            <div className="text-xs text-slate-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Bar chart */}
        <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-200 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h2 className="font-display font-700 text-navy-900 text-base mb-1">Projects by Year</h2>
          <p className="text-xs text-slate-400 mb-5">On-time vs delayed project completion</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}
                />
                <Bar dataKey="onTime" name="On Time" fill="#16A34A" radius={[3, 3, 0, 0]} />
                <Bar dataKey="delayed" name="Delayed" fill="#D97706" radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk indicators */}
        <div className={`bg-white rounded-xl border border-slate-200 p-6 transition-all duration-500 delay-300 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <h2 className="font-display font-700 text-navy-900 text-base mb-1">Performance Indicators</h2>
          <p className="text-xs text-slate-400 mb-5">Across all 18 projects</p>
          <div className="space-y-4">
            {[
              { label: "On-time Delivery Rate", value: 72, note: "13 of 18 completed projects on schedule", color: "bg-risk-medium" },
              { label: "Budget Adherence", value: 78, note: "4 projects had cost variations >10%", color: "bg-risk-medium" },
              { label: "Quality Score", value: 85, note: "Based on inspection reports", color: "bg-risk-low" },
              { label: "Documentation Compliance", value: 80, note: "Regular evidence submission", color: "bg-risk-low" },
            ].map(r => (
              <div key={r.label}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-slate-600">{r.label}</span>
                  <span className="font-mono font-700 text-sm text-slate-700">{r.value}%</span>
                </div>
                <div className="bg-slate-100 rounded-full h-2 mb-1">
                  <div
                    className={`${r.color} h-2 rounded-full transition-all duration-1000`}
                    style={{ width: animated ? `${r.value}%` : "0%" }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400">{r.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project history table */}
      <div className={`bg-white rounded-xl border border-slate-200 transition-all duration-500 delay-400 ${animated ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-display font-700 text-navy-900 text-base">Project History</h2>
            <p className="text-xs text-slate-400 mt-0.5">All projects handled by this contractor</p>
          </div>
          <div className="text-xs font-mono text-slate-400">{projectHistory.length} projects</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-600 text-slate-400 uppercase tracking-wider">Project</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-slate-400 uppercase tracking-wider">Year</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-slate-400 uppercase tracking-wider">Value</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-600 text-slate-400 uppercase tracking-wider">Delay</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectHistory.map(p => (
                <tr key={p.id} className="table-row-hover">
                  <td className="px-6 py-3.5">
                    <div className="font-mono font-600 text-navy-800 text-xs">{p.id}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.name}</div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-400">{p.year}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-slate-700">{p.value}</td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${
                      p.status === "Completed" ? "bg-risk-low-bg text-risk-low" :
                      "bg-accent-100 text-accent-600"
                    }`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`text-xs font-mono ${
                      p.delay === "None" ? "text-risk-low" :
                      parseInt(p.delay) >= 4 ? "text-risk-high font-600" : "text-risk-medium font-600"
                    }`}>{p.delay}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <button
                      className="text-xs text-accent-500 hover:text-accent-600 font-600"
                      onClick={() => navigate(`/projects/${p.id.replace("#", "")}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
