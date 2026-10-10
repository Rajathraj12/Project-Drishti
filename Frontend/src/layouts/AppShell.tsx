import { useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: GridIcon },
  { label: "Projects", path: "/map", icon: MapIcon },
  { label: "Risk Analysis", path: "/map", icon: ShieldIcon },
  { label: "Inspections", path: "/inspections", icon: ClipboardIcon },
  { label: "Evidence", path: "/evidence", icon: LayersIcon },
  { label: "Contractors", path: "/contractors/1", icon: BuildingIcon },
  { label: "Reports", path: "/dashboard", icon: ChartIcon },
]

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-surface)" }}>

      {/* ===== TOP HEADER (White bar with logo) ===== */}
      <div className="gov-header" style={{ flexShrink: 0 }}>
        <div style={{ maxWidth: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
            <img src="/logo.png" alt="Project Drishti Logo" style={{ height: 44, objectFit: "contain" }} />
          </div>

          {/* Right side - actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn-gov-primary" style={{ padding: "7px 16px", fontSize: "0.78rem" }}>
              + Add Project / Update
            </button>
            <button className="btn-gov-secondary" style={{ padding: "7px 16px", fontSize: "0.78rem" }}>
              Reports
            </button>

            <div style={{ width: 1, height: 30, background: "#e2e8f0", margin: "0 4px" }} />

            {/* Notifications */}
            <button style={{
              width: 36, height: 36, borderRadius: "50%", background: "#f7fafc",
              border: "1px solid #e2e8f0", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer", position: "relative",
            }}>
              <BellIcon style={{ width: 16, height: 16, color: "#4a5568" }} />
              <span style={{ position: "absolute", top: 5, right: 5, width: 8, height: 8, background: "var(--color-risk-high)", borderRadius: "50%", border: "1.5px solid white" }} />
            </button>

            {/* User */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 6, border: "1px solid var(--color-border)" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "var(--color-navy-700)", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ color: "white", fontSize: "0.7rem", fontWeight: 700 }}>RS</span>
              </div>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-primary)" }}>R. Sharma</div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>Officer</div>
              </div>
            </div>

            <button
              onClick={() => navigate("/")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px", borderRadius: 4 }}
              title="Sign out"
            >
              <LogOutIcon style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </div>

      {/* ===== NAVY NAV BAR ===== */}
      <div className="gov-navbar" style={{ flexShrink: 0, height: 44, display: "flex", alignItems: "center", padding: "0 24px" }}>
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path))
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`nav-link ${isActive ? "active" : ""}`}
              style={{ background: "none", border: "none", cursor: "pointer", height: 44 }}
            >
              {item.label}
            </button>
          )
        })}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          {/* Search box */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 4, padding: "4px 10px" }}>
            <SearchIcon style={{ width: 13, height: 13, color: "rgba(255,255,255,0.7)" }} />
            <input
              style={{ background: "transparent", border: "none", outline: "none", color: "white", fontSize: "0.78rem", width: 160 }}
              placeholder="Search projects..."
            />
          </div>
          <button onClick={() => navigate("/report")} className="nav-link" style={{ background: "none", border: "none", height: 44 }}>
            Citizen Report
          </button>
          <button onClick={() => navigate("/admin")} className="nav-link" style={{ background: "none", border: "none", height: 44 }}>
            Admin
          </button>
        </div>
      </div>

      {/* ===== CONTENT AREA ===== */}
      <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        <Outlet />
      </main>
    </div>
  )
}

/* === ICONS === */
function EyeIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function GridIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function MapIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}
function ShieldIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}
function ClipboardIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  )
}
function LayersIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
    </svg>
  )
}
function BuildingIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  )
}
function ChartIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}
function SearchIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}
function BellIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}
function LogOutIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
