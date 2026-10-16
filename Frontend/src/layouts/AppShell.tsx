import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { canAccessPath, landingPath, ROLES, visibleNavItems } from "../permissions/rbac"
import Forbidden from "../pages/Forbidden"

const iconByPath: Record<string, typeof GridIcon> = {
  "/dashboard": GridIcon,
  "/projects": LayersIcon,
  "/map": MapIcon,
  "/actions": CheckCircleIcon,
  "/inspections": ClipboardIcon,
  "/evidence": ShieldIcon,
  "/contractors": BuildingIcon,
  "/reports": ClipboardIcon,
  "/risk-analysis": ShieldIcon,
  "/report": ClipboardIcon,
  "/admin": BuildingIcon,
}

export default function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout, isDevBypass, devRole, setDevRole, loading } = useAuth()

  const handleLogout = () => {
    logout()
    if (!isDevBypass) {
      navigate("/login")
    }
  }

  const initials = user?.username ? user.username.substring(0, 2).toUpperCase() : "U"
  const navItems = visibleNavItems(user?.role)
  const pageAllowed = canAccessPath(user?.role, location.pathname)

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--color-surface)" }}>

      {isDevBypass && (
        <div className="dev-bypass-banner">
          <span>🛠️ DEVELOPMENT MODE — RBAC bypass is active</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>Simulate Role:</span>
            <select
              value={devRole || user?.role || "GOVERNMENT_OFFICER"}
              onChange={async (e) => {
                const role = e.target.value
                await setDevRole(role)
                navigate(landingPath(role), { replace: true })
              }}
              style={{ padding: "2px 8px", borderRadius: 6, border: "1px solid #f59e0b", background: "white", fontSize: "0.7rem", cursor: "pointer", fontFamily: "var(--font-sans)", fontWeight: 600 }}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>{role.replace(/_/g, " ")}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="gov-header" style={{ flexShrink: 0 }}>
        <div style={{ maxWidth: "100%", padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>

          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate(landingPath(user?.role))}>
            <img src="/logo.png" alt="Project Drishti Logo" style={{ height: 44, objectFit: "contain" }} />
            <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-navy-900)", letterSpacing: "-0.02em", fontFamily: "var(--font-display)" }}>Drishti</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
              <span className="live-dot" />
              <span style={{ color: "#16a34a", fontWeight: 600 }}>Live</span>
            </div>

            <div className="user-chip">
              <div className="user-avatar">{initials}</div>
              <div>
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.2 }}>
                  {user?.username || "Dev User"}
                </div>
                <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)", textTransform: "capitalize", letterSpacing: "0.04em" }}>
                  {user?.role?.replace(/_/g, " ").toLowerCase() || "Role"}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              style={{
                background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)",
                border: "1px solid var(--color-border)", cursor: "pointer",
                color: "var(--color-text-muted)", padding: "8px", borderRadius: 10,
                display: "flex", alignItems: "center",
                transition: "all 0.2s ease", boxShadow: "0 1px 4px rgba(26,48,104,0.06)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "var(--color-risk-high-bg)"
                el.style.color = "var(--color-risk-high)"
                el.style.borderColor = "var(--color-risk-high-border)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.background = "rgba(255,255,255,0.85)"
                el.style.color = "var(--color-text-muted)"
                el.style.borderColor = "var(--color-border)"
              }}
              title="Sign out"
            >
              <LogOutIcon style={{ width: 15, height: 15 }} />
            </button>
          </div>
        </div>
      </div>

      <div className="gov-navbar" style={{ flexShrink: 0, height: 46, display: "flex", alignItems: "center", padding: "0 28px" }}>
        {/* Home link — always first */}
        <button
          onClick={() => navigate("/")}
          className="nav-link"
          style={{ background: "none", border: "none", cursor: "pointer", height: 46, gap: 5 }}
          title="Back to landing page"
        >
          <HomeIcon style={{ width: 12, height: 12, opacity: 0.75 }} />
          Home
        </button>

        {/* Thin separator */}
        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.15)", margin: "0 4px" }} aria-hidden />

        {navItems.map(item => {
          const Icon = iconByPath[item.path] || GridIcon
          const isActive = location.pathname === item.path ||
            (item.path !== "/dashboard" && location.pathname.startsWith(item.path))
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`nav-link ${isActive ? "active" : ""}`}
              style={{ background: "none", border: "none", cursor: "pointer", height: 46, gap: 5 }}
            >
              <Icon style={{ width: 12, height: 12, opacity: 0.75 }} />
              {item.label}
            </button>
          )
        })}
      </div>

      <main style={{ flex: 1, overflowY: "auto", position: "relative" }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: "center" }}>Updating permissions...</div>
        ) : pageAllowed ? (
          <Outlet />
        ) : (
          <Forbidden />
        )}
      </main>
    </div>
  )
}

function GridIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
}
function MapIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></svg>
}
function ShieldIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
}
function ClipboardIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
}
function LayersIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>
}
function BuildingIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
}
function LogOutIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
}
function CheckCircleIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}
function HomeIcon({ style }: { style?: React.CSSProperties }) {
  return <svg style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
}

