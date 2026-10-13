import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { projectService } from "../services/projectService"
import { Project } from "../types"
import { MapContainer, TileLayer, Marker as LeafletMarker, Popup, CircleMarker, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"

type Marker = {
  id: string
  name: string
  x: number
  y: number
  risk: number
  progress: number
  status: string
  location: string
  sector: string
  lat: number
  lng: number
}


const riskColor = (r: number) =>
  r >= 70 ? { bg: "#DC2626", light: "#FEE2E2", border: "#DC2626" } :
    r >= 50 ? { bg: "#D97706", light: "#FEF3C7", border: "#D97706" } :
      { bg: "#16A34A", light: "#DCFCE7", border: "#16A34A" }

export default function MapView() {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<Marker | null>(null)
  const [filters, setFilters] = useState({ risk: "all", state: "All States", sector: "All Types" })
  const [markers, setMarkers] = useState<Marker[]>([])

  useEffect(() => {
    projectService.getProjects().then(res => {
      const projects = res.results || []
      const newMarkers = projects.map(p => {
        // Mock risk score and progress for Map since API doesn't return risk yet for all
        const risk = Math.floor(Math.random() * 40) + 50
        // Generate mock lat/lng based on state
        let lat = 20.0 + (Math.random() * 10);
        let lng = 75.0 + (Math.random() * 10);

        if (p.state === "Punjab") {
          lat = 30.0 + (Math.random() * 2.0); // 30.0 to 32.0
          lng = 74.0 + (Math.random() * 2.5); // 74.0 to 76.5
        } else if (p.state === "Himachal Pradesh") {
          lat = 31.0 + (Math.random() * 1.5); // 31.0 to 32.5
          lng = 76.0 + (Math.random() * 2.5); // 76.0 to 78.5
        } else if (p.state === "Karnataka") {
          lat = 12.0 + (Math.random() * 6.0); // 12.0 to 18.0
          lng = 74.5 + (Math.random() * 3.5); // 74.5 to 78.0
        }

        return {
          id: p.project_id,
          name: p.project_name,
          x: 0,
          y: 0,
          lat: lat,
          lng: lng,
          risk: risk,
          progress: p.reported_progress || 0,
          status: risk >= 70 ? "High Risk" : risk >= 50 ? "Medium Risk" : "Low Risk",
          location: p.state,
          sector: p.sector || "-"
        }
      })
      setMarkers(newMarkers as any)
    })
  }, [])

  const filtered = markers.filter((m: any) => {
    if (filters.risk === "high" && m.risk < 70) return false
    if (filters.risk === "medium" && (m.risk < 50 || m.risk >= 70)) return false
    if (filters.risk === "low" && m.risk >= 50) return false
    if (filters.state !== "All States" && m.location !== filters.state) return false
    if (filters.sector !== "All Types" && m.sector !== filters.sector) return false
    return true
  })

  const states = ["All States", ...Array.from(new Set(markers.map(m => m.location))).sort()]
  const sectors = ["All Types", ...Array.from(new Set(markers.map((m: any) => m.sector))).sort()]


  return (
    <div className="flex h-full" style={{ height: "calc(100vh - 57px)", background: "var(--color-surface)" }}>
      {/* Left sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden relative z-20" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRight: "1px solid rgba(220,232,245,0.7)", boxShadow: "4px 0 24px rgba(26,48,104,0.08)" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(220,232,245,0.6)", background: "linear-gradient(135deg, var(--color-navy-800), var(--color-navy-700))", display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "white", fontSize: "1rem", letterSpacing: "-0.01em", margin: 0 }}>Project Map</h2>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            {filtered.length} projects shown
          </p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Risk Level</label>
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
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${filters.risk === f.k
                      ? "bg-orange-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">State</label>
            <select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-navy-900 outline-none focus:border-navy-500 transition-colors bg-white">
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">Sector</label>
            <select value={filters.sector} onChange={e => setFilters({ ...filters, sector: e.target.value })} className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 text-navy-900 outline-none focus:border-navy-500 transition-colors bg-white">
              {sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Project list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
          {filtered.map(m => {
            const rc = riskColor(m.risk)
            return (
              <div
                key={m.id}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${selected?.id === m.id
                    ? "border-navy-500 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                  }`}
                onClick={() => setSelected(m)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-navy-900 text-xs">#{m.id}</div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">{m.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">📍 {m.location}</div>
                  </div>
                  <div
                    className="font-mono font-bold text-xs px-2 py-0.5 rounded flex-shrink-0 border"
                    style={{ color: rc.bg, backgroundColor: rc.light, borderColor: rc.bg }}
                  >
                    {m.risk}
                  </div>
                </div>
                <div className="mt-3 bg-slate-200 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${m.progress}%`, backgroundColor: rc.bg }}
                  ></div>
                </div>
                <div className="text-[10px] text-slate-500 mt-1.5 font-medium">{m.progress}% complete</div>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Legend</div>
          <div className="space-y-2">
            {[
              { color: "#DC2626", label: "High Risk (≥70)" },
              { color: "#D97706", label: "Medium Risk (50–69)" },
              { color: "#16A34A", label: "Low Risk (<50)" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }}></div>
                <span className="text-xs font-medium text-slate-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Map area */}
      <div className="flex-1 relative bg-navy-900 overflow-hidden">

        <MapContainer center={[22.9, 78.6]} zoom={5} style={{ height: "100%", width: "100%", zIndex: 1 }}>
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          />
          {filtered.map(m => {
            const rc = riskColor(m.risk)
            const isSelected = selected?.id === m.id
            return (
              <CircleMarker
                key={m.id}
                center={[m.lat, m.lng]}
                radius={isSelected ? 10 : 6}
                pathOptions={{
                  fillColor: rc.bg,
                  fillOpacity: 0.8,
                  color: isSelected ? "white" : "transparent",
                  weight: isSelected ? 3 : 0
                }}
                eventHandlers={{
                  click: () => setSelected(isSelected ? null : m)
                }}
              />
            )
          })}
        </MapContainer>

        {/* Map overlay stats */}
        <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }} className="glass-panel">
          <div style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="live-dot" />
              National Overview
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[
                { color: "#DC2626", count: markers.filter(m => m.risk >= 70).length, label: "High" },
                { color: "#D97706", count: markers.filter(m => m.risk >= 50 && m.risk < 70).length, label: "Medium" },
                { color: "#16A34A", count: markers.filter(m => m.risk < 50).length, label: "Low" },
              ].map(s => (
                <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "rgba(255,255,255,0.6)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(220,232,245,0.6)" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, boxShadow: `0 0 8px ${s.color}80` }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: "1rem", color: s.color, lineHeight: 1 }}>{s.count}</span>
                  <span style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Selected project popup */}
        {selected && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-200 p-5 w-[360px] animate-fade-in z-20">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-mono font-bold text-slate-500 text-xs uppercase tracking-wider">Project #{selected.id}</div>
                <div className="font-display font-bold text-navy-900 text-base mt-1">{selected.name}</div>
                <div className="text-sm text-slate-600 mt-1 font-medium">📍 {selected.location}</div>
              </div>
              <div
                className="font-mono font-bold text-xl px-3 py-1.5 rounded-lg flex-shrink-0 border"
                style={{ color: riskColor(selected.risk).bg, backgroundColor: riskColor(selected.risk).light, borderColor: riskColor(selected.risk).bg }}
              >
                {selected.risk}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Progress</div>
                <div className="font-mono font-bold text-navy-900 text-lg mt-0.5">{selected.progress}%</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</div>
                <div
                  className="text-sm font-bold mt-1"
                  style={{ color: riskColor(selected.risk).bg }}
                >
                  {selected.status}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                className="flex-1 text-sm bg-orange-500 text-white py-2.5 rounded-lg font-bold hover:bg-orange-600 transition-all shadow-sm"
                onClick={() => navigate(`/projects/${selected.id}`)}
              >
                View Details
              </button>
              <button
                className="flex-1 text-sm border border-slate-300 bg-white text-slate-700 py-2.5 rounded-lg font-bold hover:bg-slate-50 transition-colors"
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
