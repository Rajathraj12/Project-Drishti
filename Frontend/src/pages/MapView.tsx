import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { projectService } from "../services/projectService"
import { Project } from "../types"
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { useAuth } from "../contexts/AuthContext"
import { hasCapability } from "../permissions/rbac"

type Marker = {
  id: string
  name: string
  x: number
  y: number
  risk: number
  progress: number
  status: string
  location: string
  district?: string
  displayLocation: string
  sector: string
  lat: number
  lng: number
}

// Authentic geographical coordinates for all projects across India
const PROJECT_COORDS: Record<string, { lat: number; lng: number; district?: string }> = {
  // Punjab projects (Ludhiana, Moga, Jalandhar, Kapurthala, Bathinda, Barnala, Sirhind/Mohali)
  "DR-0001": { lat: 30.6822, lng: 75.8210, district: "Ludhiana" },
  "DR-0002": { lat: 30.9530, lng: 75.6020, district: "Ludhiana" },
  "DR-0003": { lat: 31.3260, lng: 75.3850, district: "Kapurthala" },
  "DR-0004": { lat: 31.0510, lng: 75.2010, district: "Moga" },
  "DR-0005": { lat: 30.1250, lng: 74.9520, district: "Bathinda" },
  "DR-0006": { lat: 30.3710, lng: 75.3240, district: "Barnala" },
  "DR-0007": { lat: 30.5540, lng: 75.0820, district: "Moga" },
  "DR-0008": { lat: 30.6420, lng: 76.5410, district: "Fatehgarh Sahib" },
  // Himachal Pradesh projects (Mandi, Hamirpur, Pandoh, Sundernagar, Shimla)
  "DR-0009": { lat: 31.7087, lng: 76.9320, district: "Mandi" },
  "DR-0010": { lat: 31.6862, lng: 76.5213, district: "Hamirpur" },
  "DR-0011": { lat: 31.7240, lng: 76.7210, district: "Mandi" },
  "DR-0012": { lat: 31.6210, lng: 76.9850, district: "Mandi" },
  "DR-0013": { lat: 31.7820, lng: 77.1230, district: "Mandi" },
  "DR-0014": { lat: 31.5340, lng: 76.8920, district: "Mandi" },
  "DR-0015": { lat: 31.0610, lng: 77.1420, district: "Shimla" },
  // Karnataka projects (Kushalnagar, Hunsur, Srirangapatna, Shivamogga, Mangalore, Chitradurga, Tumkur, Hoskote, Bengaluru)
  "DR-0016": { lat: 12.4580, lng: 75.9610, district: "Kodagu" },
  "DR-0017": { lat: 12.3120, lng: 76.2910, district: "Mysuru" },
  "DR-0018": { lat: 12.4210, lng: 76.6940, district: "Mandya" },
  "DR-0019": { lat: 13.9299, lng: 75.5681, district: "Shivamogga" },
  "DR-0020": { lat: 12.9172, lng: 74.8860, district: "Dakshina Kannada" },
  "DR-0021": { lat: 13.7220, lng: 76.8510, district: "Chitradurga" },
  "DR-0022": { lat: 13.1810, lng: 77.2210, district: "Tumakuru" },
  "DR-0023": { lat: 13.0720, lng: 77.7940, district: "Bengaluru Rural" },
  // National Major Projects across India
  "DR-0024": { lat: 21.1702, lng: 72.8311, district: "Surat" }, // Mumbai-Ahmedabad Bullet Train
  "DR-0025": { lat: 13.0827, lng: 80.2707, district: "Chennai" }, // Chennai Metro Rail Phase-II
  "DR-0026": { lat: 26.9124, lng: 75.7873, district: "Jaipur" }, // Western Dedicated Freight Corridor
  "DR-0027": { lat: 30.1530, lng: 78.4520, district: "Tehri Garhwal" }, // Rishikesh-Karnaprayag Rail
  "DR-0028": { lat: 19.0760, lng: 72.8777, district: "Mumbai" }, // Mumbai Urban Transport Project
  "DR-0029": { lat: 12.9716, lng: 77.5946, district: "Bengaluru Urban" }, // Bangalore Suburban Railway
  "DR-0030": { lat: 24.2515, lng: 78.1587, district: "Sagar" }, // Bina Refinery Plant Complex
  "DR-0031": { lat: 29.4709, lng: 76.8723, district: "Panipat" }, // IOCL Panipat Refinery & Petrochemical Complex (Baholi)
  "DR-0032": { lat: 16.9891, lng: 82.2475, district: "Kakinada" }, // KG-DWN-98/2 NELP Block
  "DR-0033": { lat: 10.8242, lng: 79.8100, district: "Nagapattinam" }, // CPCL Cauvery Basin Refinery (Panangudi)
  "DR-0034": { lat: 22.3705, lng: 73.1255, district: "Vadodara" }, // IOCL Gujarat Refinery Koyali Complex
  "DR-0035": { lat: 21.8329, lng: 73.7491, district: "Narmada" }, // Sardar Sarovar Dam Structure
  "DR-0036": { lat: 17.2560, lng: 81.6570, district: "Eluru" }, // Polavaram Dam Site
  "DR-0037": { lat: 18.2310, lng: 79.9140, district: "Warangal" }, // Devadula Lift Irrigation Intake
  "DR-0038": { lat: 20.8710, lng: 79.6410, district: "Bhandara" }, // Gosikhurd Project Dam
  "DR-0039": { lat: 28.6139, lng: 77.2090, district: "New Delhi" }, // BharatNet National
  "DR-0040": { lat: 23.2599, lng: 77.4126, district: "Bhopal" }, // 4G BSNL
  "DR-0041": { lat: 25.4484, lng: 78.5685, district: "Jhansi" }, // Saturation 4G USOF
  "DR-0042": { lat: 21.1458, lng: 79.0882, district: "Nagpur" }, // 4G Network Pan-India Phase IX.2
  "DR-0043": { lat: 26.8467, lng: 80.9462, district: "Lucknow" }, // BharatNet UP East
  "DR-0044": { lat: 28.5780, lng: 77.1980, district: "New Delhi" }, // GPRA Colonies Delhi
  "DR-0045": { lat: 28.5672, lng: 77.2100, district: "New Delhi" }, // AIIMS West Ansari Nagar
  "DR-0046": { lat: 10.7867, lng: 76.6548, district: "Palakkad" }, // Palakkad Node CBIC
  "DR-0047": { lat: 15.6820, lng: 78.2210, district: "Kurnool" }, // Orvakal Industrial Area
  "DR-0048": { lat: 17.6830, lng: 77.6040, district: "Sangareddy" }, // Zaheerabad Node
  "DR-0049": { lat: 21.7330, lng: 83.9720, district: "Jharsuguda" }, // NLC Talabira Thermal Power Site
  "DR-0050": { lat: 24.1120, lng: 82.6410, district: "Singrauli" }, // Jayant Expansion Coal Mine
  "DR-0051": { lat: 22.3270, lng: 82.5760, district: "Korba" }, // Gevra Open Cast Coal Mine Pit
  "DR-0052": { lat: 21.0820, lng: 85.0810, district: "Angul" }, // Gopalji Kaniha OCP
  "DR-0053": { lat: 23.9510, lng: 85.0210, district: "Chatra" }, // RPR Magadh Exp OCP
  "DR-0054": { lat: 23.7430, lng: 86.4120, district: "Dhanbad" }, // Jharia Master Plan Coalfield
  "DR-0055": { lat: 24.6110, lng: 84.1440, district: "Aurangabad" }, // Nabinagar Super Thermal Power Plant
  "DR-0056": { lat: 18.7560, lng: 79.4730, district: "Peddapalli" }, // NTPC Ramagundam Super Thermal Power
  "DR-0057": { lat: 27.5320, lng: 72.1810, district: "Phalodi" }, // Rajasthan Part I Power Transmission
  "DR-0058": { lat: 23.8960, lng: 69.8320, district: "Kutch" }, // Khavda Renewable Energy Park
  "DR-0059": { lat: 28.3280, lng: 95.8360, district: "Lower Dibang Valley" }, // Dibang Dam Site
  "DR-0060": { lat: 30.3400, lng: 76.3800, district: "Patiala" },
  "DR-0061": { lat: 31.9579, lng: 77.1095, district: "Kullu" },
  "DR-0062": { lat: 12.2958, lng: 76.6394, district: "Mysuru" },
  "DR-0063": { lat: 31.3260, lng: 75.5762, district: "Jalandhar" },
  "DR-0064": { lat: 25.1800, lng: 75.8300, district: "Kota" },
  "DR-0065": { lat: 18.5204, lng: 73.8567, district: "Pune" },
  "DR-0066": { lat: 26.4499, lng: 80.3319, district: "Kanpur Nagar" },
  "DR-0067": { lat: 15.8497, lng: 74.4977, district: "Belagavi" },
  "DR-0068": { lat: 32.2686, lng: 75.6529, district: "Pathankot" },
  "DR-0069": { lat: 28.4595, lng: 77.0266, district: "Gurugram" },
}

const STATE_CENTERS: Record<string, { lat: number; lng: number }> = {
  "Punjab": { lat: 30.9010, lng: 75.8573 },
  "Himachal Pradesh": { lat: 31.7087, lng: 76.9320 },
  "Karnataka": { lat: 14.5204, lng: 75.7224 },
  "Delhi": { lat: 28.6139, lng: 77.2090 },
  "Gujarat": { lat: 22.2587, lng: 71.1924 },
  "Maharashtra": { lat: 19.7515, lng: 75.7139 },
  "Tamil Nadu": { lat: 11.1271, lng: 78.6569 },
  "Andhra Pradesh": { lat: 15.9129, lng: 79.7400 },
  "Telangana": { lat: 17.8749, lng: 78.1008 },
  "Rajasthan": { lat: 26.5844, lng: 73.8495 },
  "Madhya Pradesh": { lat: 23.4733, lng: 77.9479 },
  "Haryana": { lat: 29.0588, lng: 76.0856 },
  "Uttar Pradesh": { lat: 26.8467, lng: 80.9462 },
  "Bihar": { lat: 25.0961, lng: 85.3131 },
  "Jharkhand": { lat: 23.6102, lng: 85.2799 },
  "Chhattisgarh": { lat: 21.2787, lng: 81.8661 },
  "Odisha": { lat: 20.9517, lng: 85.0985 },
  "Uttarakhand": { lat: 30.0668, lng: 79.0193 },
  "Arunachal Pradesh": { lat: 28.2180, lng: 94.7278 },
  "Kerala": { lat: 10.8505, lng: 76.2711 },
}

const riskColor = (r: number) =>
  r >= 60 ? { bg: "#DC2626", light: "#FEE2E2", border: "#DC2626" } :
    r >= 35 ? { bg: "#D97706", light: "#FEF3C7", border: "#D97706" } :
      { bg: "#16A34A", light: "#DCFCE7", border: "#16A34A" }

// Smooth map controller for flying to selected project and fitting bounds by state
function MapController({
  selected,
  stateFilter,
  markers,
  focusKey,
  resetTrigger
}: {
  selected: Marker | null
  stateFilter: string
  markers: Marker[]
  focusKey: number
  resetTrigger: number
}) {
  const map = useMap()

  // Fly to selected project when clicked - zoom in close (level 15) to reveal satellite imagery of site
  useEffect(() => {
    if (selected && typeof selected.lat === "number" && typeof selected.lng === "number") {
      map.flyTo([selected.lat, selected.lng], 15, {
        duration: 1.4,
        easeLinearity: 0.25
      })
    }
  }, [selected, focusKey, map])

  // Reset to national overview
  useEffect(() => {
    if (resetTrigger > 0) {
      map.flyTo([22.8, 79.6], 5, { duration: 1.2 })
    }
  }, [resetTrigger, map])

  // Fit bounds when state filter changes
  useEffect(() => {
    if (stateFilter !== "All States" && markers.length > 0) {
      const stateMarkers = markers.filter(m => m.location === stateFilter)
      if (stateMarkers.length > 0) {
        const bounds = L.latLngBounds(stateMarkers.map(m => [m.lat, m.lng]))
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 10 })
      }
    } else if (stateFilter === "All States" && markers.length > 0 && resetTrigger === 0) {
      map.setView([22.8, 79.6], 5)
    }
  }, [stateFilter, markers, map, resetTrigger])

  return null
}

export default function MapView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const canViewRisk = hasCapability(user?.role, "view_internal_risk")
  const [selected, setSelected] = useState<Marker | null>(null)
  const [focusKey, setFocusKey] = useState<number>(0)
  const [resetTrigger, setResetTrigger] = useState<number>(0)
  const [mapLayer, setMapLayer] = useState<"satellite" | "dark" | "streets">("satellite")
  const [filters, setFilters] = useState({ risk: "all", state: "All States", sector: "All Types" })
  const [markers, setMarkers] = useState<Marker[]>([])

  const handleSelectMarker = (m: Marker) => {
    setSelected(m)
    setFocusKey(k => k + 1)
  }

  useEffect(() => {
    projectService.getProjects().then(res => {
      const projects = res.results || []
      const newMarkers: Marker[] = projects.map(p => {
        const fallback = PROJECT_COORDS[p.project_id] || {}
        
        // Exact real coordinates from backend or verified project coordinates mapping
        const lat = (typeof p.latitude === "number" && !isNaN(p.latitude))
          ? p.latitude
          : (fallback.lat ?? (STATE_CENTERS[p.state]?.lat || 22.8))

        const lng = (typeof p.longitude === "number" && !isNaN(p.longitude))
          ? p.longitude
          : (fallback.lng ?? (STATE_CENTERS[p.state]?.lng || 79.6))

        const district = p.district || fallback.district || ""
        const displayLocation = district ? `${district}, ${p.state}` : p.state

        const risk = typeof p.risk_score === "number"
          ? p.risk_score
          : (p.reported_progress < 40 ? 75 : p.reported_progress < 70 ? 55 : 30)

        const status = risk >= 60 ? "High Risk" : risk >= 35 ? "Medium Risk" : "Low Risk"

        return {
          id: p.project_id,
          name: p.project_name,
          x: 0,
          y: 0,
          lat: lat,
          lng: lng,
          risk: risk,
          progress: p.reported_progress || 0,
          status: status,
          location: p.state,
          district: district,
          displayLocation: displayLocation,
          sector: p.sector || "-"
        }
      })
      setMarkers(newMarkers)
    })
  }, [])

  const filtered = markers.filter((m: Marker) => {
    if (filters.risk === "high" && m.risk < 60) return false
    if (filters.risk === "medium" && (m.risk < 35 || m.risk >= 60)) return false
    if (filters.risk === "low" && m.risk >= 35) return false
    if (filters.state !== "All States" && m.location !== filters.state) return false
    if (filters.sector !== "All Types" && m.sector !== filters.sector) return false
    return true
  })

  const states = ["All States", ...Array.from(new Set(markers.map(m => m.location))).sort()]
  const sectors = ["All Types", ...Array.from(new Set(markers.map(m => m.sector))).sort()]

  return (
    <div className="flex w-full h-full" style={{ background: "var(--color-surface)" }}>
      {/* Left sidebar */}
      <div className="w-72 flex-shrink-0 flex flex-col overflow-hidden relative z-20" style={{ background: "rgba(255,255,255,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", borderRight: "1px solid rgba(220,232,245,0.7)", boxShadow: "4px 0 24px rgba(26,48,104,0.08)" }}>
        <div style={{ padding: "16px", borderBottom: "1px solid rgba(220,232,245,0.6)", background: "linear-gradient(135deg, var(--color-navy-800), var(--color-navy-700))", display: "flex", flexDirection: "column", gap: 4 }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "white", fontSize: "1rem", letterSpacing: "-0.01em", margin: 0 }}>Project Map</h2>
          <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.6)", margin: 0, display: "flex", alignItems: "center", gap: 5 }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            {filtered.length} projects arranged
          </p>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 space-y-4">
          {canViewRisk && (
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
                  onClick={() => setFilters({ ...filters, risk: f.k })}
                  className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all ${filters.risk === f.k
                      ? "bg-navy-900 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          )}
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
                onClick={() => handleSelectMarker(m)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-navy-900 text-xs">#{m.id}</div>
                    <div className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">{m.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">📍 {m.displayLocation}</div>
                  </div>
                  {canViewRisk && (
                  <div
                    className="font-mono font-bold text-xs px-2 py-0.5 rounded flex-shrink-0 border"
                    style={{ color: rc.bg, backgroundColor: rc.light, borderColor: rc.bg }}
                  >
                    {m.risk}
                  </div>
                  )}
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
        {canViewRisk && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Risk Legend</div>
          <div className="space-y-1.5">
            {[
              { color: "#DC2626", label: "High Risk (≥60)" },
              { color: "#D97706", label: "Medium Risk (35–59)" },
              { color: "#16A34A", label: "Low Risk (<35)" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }}></div>
                <span className="text-xs font-medium text-slate-600">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
        )}
      </div>

      {/* Map area */}
      <div className="flex-1 relative bg-navy-900 overflow-hidden">
        <MapContainer center={[22.8, 79.6]} zoom={5} maxZoom={19} style={{ height: "100%", width: "100%", zIndex: 1 }}>
          <MapController
            selected={selected}
            stateFilter={filters.state}
            markers={markers}
            focusKey={focusKey}
            resetTrigger={resetTrigger}
          />
          
          {mapLayer === "satellite" && (
            <>
              <TileLayer
                key="satellite-imagery"
                attribution='&copy; <a href="https://www.esri.com">Esri</a> World Imagery'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              <TileLayer
                key="satellite-reference"
                attribution='&copy; <a href="https://www.esri.com">Esri</a> Places & Boundaries'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
                opacity={0.85}
              />
            </>
          )}

          {mapLayer === "dark" && (
            <TileLayer
              key="dark-canvas"
              attribution='&copy; <a href="https://www.esri.com">Esri</a> Dark Canvas'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            />
          )}

          {mapLayer === "streets" && (
            <TileLayer
              key="streets"
              attribution='&copy; <a href="https://www.esri.com">Esri</a> Streets'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
            />
          )}
          {filtered.map(m => {
            const rc = riskColor(m.risk)
            const isSelected = selected?.id === m.id
            return (
              <span key={m.id}>
                {isSelected && (
                  <CircleMarker
                    center={[m.lat, m.lng]}
                    radius={22}
                    pathOptions={{
                      fillColor: rc.bg,
                      fillOpacity: 0.2,
                      color: "#ffffff",
                      weight: 2,
                      dashArray: "4, 4"
                    }}
                  />
                )}
                <CircleMarker
                  center={[m.lat, m.lng]}
                  radius={isSelected ? 11 : 7}
                  pathOptions={{
                    fillColor: rc.bg,
                    fillOpacity: isSelected ? 1.0 : 0.85,
                    color: "#ffffff",
                    weight: isSelected ? 3.5 : 1
                  }}
                  eventHandlers={{
                    click: (e) => {
                      e.originalEvent?.stopPropagation?.()
                      handleSelectMarker(m)
                    }
                  }}
                >
                  <Tooltip
                    key={isSelected ? `perm-${m.id}` : `hover-${m.id}`}
                    direction="top"
                    offset={[0, isSelected ? -12 : -8]}
                    opacity={0.95}
                    permanent={isSelected}
                  >
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#0b1f4b" }}>
                      <span style={{ fontFamily: "monospace", color: "#d97706" }}>#{m.id}</span> • 📍 {m.displayLocation}
                      <div style={{ fontSize: "10px", color: "#475569", fontWeight: 500, maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "2px" }}>
                        {m.name}
                      </div>
                    </div>
                  </Tooltip>
                </CircleMarker>
              </span>
            )
          })}
        </MapContainer>

        {/* Map Layer Mode Switcher & Overview Reset */}
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 10 }} className="flex bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-[0_4px_24px_rgba(11,31,75,0.2)] border border-slate-200/90 gap-1 items-center">
          <button
            onClick={() => setMapLayer("satellite")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapLayer === "satellite"
                ? "bg-navy-900 text-white shadow-sm"
                : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
            }`}
            title="Photorealistic Satellite Imagery with Places & Borders"
          >
            <span>🛰️</span>
            <span>Satellite</span>
          </button>
          <button
            onClick={() => setMapLayer("dark")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapLayer === "dark"
                ? "bg-navy-900 text-white shadow-sm"
                : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
            }`}
            title="Clean Dark Vector Map"
          >
            <span>🗺️</span>
            <span>Dark</span>
          </button>
          <button
            onClick={() => setMapLayer("streets")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mapLayer === "streets"
                ? "bg-navy-900 text-white shadow-sm"
                : "text-slate-600 hover:text-navy-900 hover:bg-slate-100"
            }`}
            title="Detailed Street & Terrain Map"
          >
            <span>🛣️</span>
            <span>Streets</span>
          </button>
          <div className="w-[1px] h-5 bg-slate-200 mx-0.5" />
          <button
            onClick={() => {
              setSelected(null)
              setResetTrigger(t => t + 1)
            }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition-all"
            title="Reset to full India overview"
          >
            <span>🇮🇳</span>
            <span>Overview</span>
          </button>
        </div>

        {/* Map overlay stats */}
        {canViewRisk && (
        <div style={{ position: "absolute", top: 16, left: 16, zIndex: 10 }} className="glass-panel">
          <div style={{ padding: "14px 18px" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="live-dot" />
              National Overview
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              {[
                { color: "#DC2626", count: markers.filter(m => m.risk >= 60).length, label: "High" },
                { color: "#D97706", count: markers.filter(m => m.risk >= 35 && m.risk < 60).length, label: "Medium" },
                { color: "#16A34A", count: markers.filter(m => m.risk < 35).length, label: "Low" },
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
        )}

        {/* Selected project popup - Compact & small */}
        {selected && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-[0_12px_32px_rgba(11,31,75,0.18)] border border-slate-200/90 p-3.5 w-[280px] max-w-[calc(100vw-32px)] animate-fade-in z-20">
            {/* Top row: ID badge + location + risk + close button */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-mono font-bold text-[10px] text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">
                  #{selected.id}
                </span>
                <span className="text-[11px] text-slate-500 truncate font-medium">
                  📍 {selected.displayLocation || selected.location}
                </span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {canViewRisk && (
                  <span
                    className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded border"
                    style={{
                      color: riskColor(selected.risk).bg,
                      backgroundColor: riskColor(selected.risk).light,
                      borderColor: riskColor(selected.risk).bg,
                    }}
                    title={`Risk Score: ${selected.risk}`}
                  >
                    {selected.risk}
                  </span>
                )}
                <button
                  onClick={() => setSelected(null)}
                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors text-xs font-bold leading-none ml-0.5"
                  title="Close popup"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Coordinates & Location badge */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-100 mb-2">
              <span>📍 {selected.lat.toFixed(4)}° N, {selected.lng.toFixed(4)}° E</span>
              <span className="font-sans font-medium text-slate-400">{selected.sector}</span>
            </div>

            {/* Project Title (clamped to 2 lines so long names stay compact) */}
            <div
              className="font-bold text-navy-900 text-xs leading-snug line-clamp-2 mb-2"
              title={selected.name}
            >
              {selected.name}
            </div>

            {/* Compact Metric Strip */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 border border-slate-200/80 rounded-lg mb-2.5">
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Progress</div>
                <div className="font-mono font-bold text-navy-900 text-xs mt-0.5">{selected.progress}%</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</div>
                <div
                  className="text-xs font-bold mt-0.5 truncate"
                  style={{ color: riskColor(selected.risk).bg }}
                >
                  {selected.status}
                </div>
              </div>
            </div>

            {/* Compact Action Buttons */}
            <div className="flex gap-2">
              <button
                className="flex-1 text-xs bg-orange-500 text-white py-1.5 px-3 rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-sm text-center"
                onClick={() => navigate(`/projects/${selected.id}`)}
              >
                View Details
              </button>
              <button
                className="text-xs border border-slate-200 bg-white text-slate-600 py-1.5 px-3 rounded-lg font-semibold hover:bg-slate-50 transition-colors"
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
