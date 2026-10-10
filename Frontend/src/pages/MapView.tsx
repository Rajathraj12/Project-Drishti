import { useState } from "react"
import { useNavigate } from "react-router-dom"

type Marker = {
  id: string
  name: string
  x: number
  y: number
  risk: number
  progress: number
  status: string
  location: string
}

const markers: Marker[] = [
  { id: "4821", name: "Community Hall Construction", x: 42, y: 58, risk: 88, progress: 47, status: "High Risk", location: "Mysuru" },
  { id: "7192", name: "Ward Road Widening", x: 62, y: 28, risk: 84, progress: 61, status: "High Risk", location: "Bengaluru" },
  { id: "3347", name: "Primary School Building", x: 28, y: 22, risk: 71, progress: 55, status: "High Risk", location: "Dharwad" },
  { id: "5518", name: "Taluk Office Renovation", x: 38, y: 35, risk: 65, progress: 70, status: "Medium Risk", location: "Shivamogga" },
  { id: "2903", name: "Bridge Construction", x: 50, y: 38, risk: 62, progress: 38, status: "Medium Risk", location: "Hassan" },
  { id: "6612", name: "Rural Water Supply", x: 72, y: 48, risk: 45, progress: 68, status: "Medium Risk", location: "Tumkur" },
  { id: "8801", name: "PHC Building", x: 80, y: 65, risk: 32, progress: 80, status: "Low Risk", location: "Kolar" },
  { id: "1203", name: "Irrigation Canal", x: 55, y: 72, risk: 28, progress: 85, status: "Low Risk", location: "Mandya" },
  { id: "9045", name: "Cattle Shed Complex", x: 30, y: 75, risk: 22, progress: 90, status: "Low Risk", location: "Chamarajanagar" },
  { id: "4401", name: "District Hospital Wing", x: 70, y: 18, risk: 58, progress: 52, status: "Medium Risk", location: "Chikballapur" },
]

const riskColor = (r: number) =>
  r >= 70 ? { bg: "#DC2626", light: "#FEE2E2", border: "#DC2626" } :
  r >= 50 ? { bg: "#D97706", light: "#FEF3C7", border: "#D97706" } :
  { bg: "#16A34A", light: "#DCFCE7", border: "#16A34A" }

export default function MapView() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Marker | null>(null)
  const [filters, setFilters] = useState({ risk: "all" })

  const filtered = markers.filter(m => {
    if (filters.risk === "high" && m.risk < 70) return false
    if (filters.risk === "medium" && (m.risk < 50 || m.risk >= 70)) return false
    if (filters.risk === "low" && m.risk >= 50) return false
    return true
  })

  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 57px)" }}>
      {/* Left sidebar */}
      <div className="w-72 flex-shrink-0 glass-dark border-r border-navy-800/50 flex flex-col overflow-hidden relative z-20">
        <div className="p-4 border-b border-navy-800/50">
          <h2 className="font-display font-700 text-white text-base">Project Map</h2>
          <p className="text-xs text-slate-400 mt-0.5">{filtered.length} projects shown</p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-navy-800/50 space-y-3">
          <div>
            <label className="text-xs font-600 text-slate-400 uppercase tracking-wider block mb-1.5">Risk Level</label>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { k: "all", label: "All" },
                { k: "high", label: "High" },
                { k: "medium", label: "Medium" },
                { k: "low", label: "Low" },
              ].map(f => (
                <button
                  key={f.k}
                  onClick={() => setFilters(prev => ({ ...prev, risk: f.k }))}
                  className={`text-xs px-2.5 py-1 rounded-full font-500 transition-colors ${
                    filters.risk === f.k
                      ? "bg-accent-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                      : "bg-navy-900/50 text-slate-400 hover:bg-white/10"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-600 text-slate-400 uppercase tracking-wider block mb-1.5">District</label>
            <select className="w-full text-xs border border-navy-700/50 rounded-lg px-3 py-2 text-slate-300 outline-none bg-navy-900 focus:border-accent-500 transition-colors">
              <option>All Districts</option>
              <option>Mysuru</option>
              <option>Bengaluru Urban</option>
              <option>Dharwad</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-600 text-slate-400 uppercase tracking-wider block mb-1.5">Project Type</label>
            <select className="w-full text-xs border border-navy-700/50 rounded-lg px-3 py-2 text-slate-300 outline-none bg-navy-900 focus:border-accent-500 transition-colors">
              <option>All Types</option>
              <option>Construction</option>
              <option>Roads</option>
              <option>Water Supply</option>
            </select>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(m => {
            const rc = riskColor(m.risk)
            return (
              <div
                key={m.id}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selected?.id === m.id
                    ? "border-accent-400/50 bg-accent-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                    : "border-navy-700/50 bg-navy-900/30 hover:border-navy-600 hover:bg-white/5"
                }`}
                onClick={() => setSelected(m)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-600 text-white text-xs">#{m.id}</div>
                    <div className="text-xs font-500 text-slate-300 mt-0.5 leading-tight">{m.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">📍 {m.location}</div>
                  </div>
                  <div
                    className="font-mono font-700 text-xs px-2 py-0.5 rounded-md flex-shrink-0"
                    style={{ color: rc.bg, backgroundColor: rc.light }}
                  >
                    {m.risk}
                  </div>
                </div>
                <div className="mt-2 bg-slate-100 rounded-full h-1">
                  <div
                    className="h-1 rounded-full transition-all"
                    style={{ width: `${m.progress}%`, backgroundColor: rc.bg }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{m.progress}% complete</div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-navy-800/50">
          <div className="text-xs font-600 text-slate-400 uppercase tracking-wider mb-2">Legend</div>
          <div className="space-y-1.5">
            {[
              { color: "#DC2626", label: "High Risk (≥70)" },
              { color: "#D97706", label: "Medium Risk (50–69)" },
              { color: "#16A34A", label: "Low Risk (<50)" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }}></div>
                <span className="text-xs text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative bg-navy-950 overflow-hidden">
        {/* Glowing background blob */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-[800px] h-[800px] bg-accent-600 blur-[150px] rounded-full animate-pulse-slow"></div>
        </div>

        {/* Map background - stylized Karnataka */}
        <svg
          className="absolute inset-0 w-full h-full animate-grid-glow"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Background */}
          <rect width="100" height="100" fill="transparent" />

          {/* Grid */}
          {[10,20,30,40,50,60,70,80,90].map(v => (
            <g key={v}>
              <line x1={v} y1="0" x2={v} y2="100" stroke="#1A4A94" strokeWidth="0.2" opacity="0.5" />
              <line x1="0" y1={v} x2="100" y2={v} stroke="#1A4A94" strokeWidth="0.2" opacity="0.5" />
            </g>
          ))}

          {/* Karnataka state shape (stylized) */}
          <path
            d="M 20 10 L 45 8 L 75 12 L 88 20 L 90 35 L 85 50 L 80 65 L 70 78 L 55 85 L 40 88 L 25 82 L 15 70 L 10 55 L 12 35 L 20 20 Z"
            fill="#0D2B5E"
            stroke="#3B82F6"
            strokeWidth="0.8"
            fillOpacity="0.4"
            className="drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]"
          />

          {/* Rivers */}
          <path d="M 25 15 Q 40 30 35 50 Q 32 65 40 80" stroke="#60A5FA" strokeWidth="0.6" fill="none" opacity="0.4" />
          <path d="M 60 20 Q 70 40 65 60 Q 60 70 65 80" stroke="#60A5FA" strokeWidth="0.4" fill="none" opacity="0.3" />

          {/* District boundaries */}
          <path d="M 30 20 L 70 20 M 20 45 L 85 45 M 20 65 L 80 65 M 50 10 L 50 88" stroke="#3B82F6" strokeWidth="0.3" strokeDasharray="1,1" opacity="0.3" />

          {/* City labels */}
          <text x="60" y="27" fontSize="2.5" fill="#93C5FD" textAnchor="middle" fontFamily="JetBrains Mono" opacity="0.7">Bengaluru</text>
          <text x="42" y="60" fontSize="2.5" fill="#93C5FD" textAnchor="middle" fontFamily="JetBrains Mono" opacity="0.7">Mysuru</text>
          <text x="28" y="21" fontSize="2.5" fill="#93C5FD" textAnchor="middle" fontFamily="JetBrains Mono" opacity="0.7">Dharwad</text>
          <text x="38" y="37" fontSize="2.5" fill="#93C5FD" textAnchor="middle" fontFamily="JetBrains Mono" opacity="0.7">Shivamogga</text>

          {/* Project markers */}
          {filtered.map(m => {
            const rc = riskColor(m.risk)
            const isSelected = selected?.id === m.id
            const isHigh = m.risk >= 70
            return (
              <g
                key={m.id}
                className="cursor-pointer"
                onClick={() => setSelected(selected?.id === m.id ? null : m)}
              >
                {/* Pulse ring for high risk */}
                {isHigh && (
                  <circle cx={m.x} cy={m.y} r="3" fill={rc.bg} opacity="0.15">
                    <animate attributeName="r" from="3" to="6" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Marker */}
                <circle
                  cx={m.x}
                  cy={m.y}
                  r={isSelected ? 3.2 : 2.5}
                  fill={rc.bg}
                  stroke="white"
                  strokeWidth={isSelected ? "1.2" : "0.8"}
                  opacity={0.9}
                />
                {/* Risk number */}
                <text
                  x={m.x}
                  y={m.y + 0.8}
                  textAnchor="middle"
                  fontSize="1.8"
                  fill="white"
                  fontWeight="bold"
                >
                  {m.risk}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
          <button className="w-8 h-8 glass-dark rounded-lg border border-navy-700/50 flex items-center justify-center text-slate-300 hover:bg-white/10 shadow-lg font-500 text-lg transition-colors">+</button>
          <button className="w-8 h-8 glass-dark rounded-lg border border-navy-700/50 flex items-center justify-center text-slate-300 hover:bg-white/10 shadow-lg font-500 text-lg transition-colors">−</button>
        </div>

        {/* Map overlay stats */}
        <div className="absolute top-4 left-4 glass-dark rounded-xl border border-navy-700/50 px-4 py-3 shadow-lg z-10">
          <div className="text-xs font-600 text-white mb-2">Karnataka State Overview</div>
          <div className="flex gap-4">
            {[
              { color: "#DC2626", count: markers.filter(m => m.risk >= 70).length, label: "High" },
              { color: "#D97706", count: markers.filter(m => m.risk >= 50 && m.risk < 70).length, label: "Medium" },
              { color: "#16A34A", count: markers.filter(m => m.risk < 50).length, label: "Low" },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                <span className="font-mono font-700 text-xs" style={{ color: s.color }}>{s.count}</span>
                <span className="text-xs text-slate-400">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected project popup */}
        {selected && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass-dark rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-accent-500/30 p-5 w-80 animate-fade-in z-20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-mono font-700 text-white text-xs">Project #{selected.id}</div>
                <div className="font-display font-600 text-slate-200 text-sm mt-0.5">{selected.name}</div>
                <div className="text-xs text-slate-400 mt-1">📍 {selected.location}, Karnataka</div>
              </div>
              <div
                className="font-mono font-800 text-lg px-2.5 py-1 rounded-xl flex-shrink-0"
                style={{ color: riskColor(selected.risk).bg, backgroundColor: riskColor(selected.risk).light }}
              >
                {selected.risk}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-navy-900/50 border border-navy-700/50 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Progress</div>
                <div className="font-mono font-700 text-white text-base">{selected.progress}%</div>
              </div>
              <div className="bg-navy-900/50 border border-navy-700/50 rounded-lg p-2.5">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Status</div>
                <div
                  className="text-xs font-600 mt-0.5"
                  style={{ color: riskColor(selected.risk).bg }}
                >
                  {selected.status}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 text-xs bg-accent-600 text-white py-2 rounded-lg font-600 hover:bg-accent-500 shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all"
                onClick={() => navigate(`/projects/${selected.id}`)}
              >
                View Details
              </button>
              <button
                className="flex-1 text-xs border border-navy-700/50 bg-navy-900/50 text-slate-300 py-2 rounded-lg font-500 hover:bg-white/10 transition-colors"
                onClick={() => setSelected(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
