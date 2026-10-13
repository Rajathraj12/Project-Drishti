import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      await login({ username: email, password })
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || "Invalid credentials or server error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--color-surface)" }}>
      {/* Header */}
      <header className="gov-header" style={{ padding: "0 28px", height: 68, display: "flex", alignItems: "center", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src="/logo.png" alt="Project Drishti Logo" style={{ height: 44, objectFit: "contain" }} />
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, color: "var(--color-navy-900)", fontSize: "1.1rem", letterSpacing: "-0.02em", lineHeight: 1 }}>Project Drishti</div>
            <div style={{ fontSize: "0.58rem", color: "var(--color-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>Government of India — Infrastructure Monitoring</div>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span className="live-dot" />
          <span style={{ fontSize: "0.72rem", color: "#16a34a", fontWeight: 600 }}>Live</span>
        </div>
      </header>
      <div className="gov-navbar" style={{ height: 46 }} />

      {/* Main */}
      <div style={{ flex: 1, display: "flex" }}>
        {/* Left panel */}
        <div style={{
          flex: "0 0 52%", display: "flex", flexDirection: "column",
          background: "linear-gradient(160deg, var(--color-navy-800) 0%, var(--color-navy-600) 100%)",
          position: "relative", overflow: "hidden", padding: "48px 56px",
        }}>
          {/* Background decoration */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--color-orange-400)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
              <img src="/logo.png" alt="Project Drishti Logo" style={{ height: 42, objectFit: "contain" }} />
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "white", fontSize: "1rem" }}>Project Drishti</div>
                <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Gov. Monitoring Platform</div>
              </div>
            </div>

            {/* Heading */}
            <div style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.5)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
              Secure Access Portal
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "2rem", color: "white", lineHeight: 1.15, marginBottom: 16 }}>
              Evidence-driven<br />monitoring for better<br />project oversight.
            </h2>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "0.875rem", lineHeight: 1.8, maxWidth: 380, marginBottom: 32 }}>
              Combining financial data, field evidence, and inspection records to help government officers identify projects requiring attention.
            </p>

            {/* Feature pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
              {["Risk Analysis", "Evidence Tracking", "Contractor Intelligence", "Inspection Management"].map(f => (
                <span key={f} style={{
                  fontSize: "0.72rem", fontWeight: 500, padding: "5px 12px",
                  background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.8)", borderRadius: 20,
                }}>
                  {f}
                </span>
              ))}
            </div>

            {/* Live stats card */}
            <div style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "18px 20px" }}>
              <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 14 }}>
                Live Overview
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 16 }}>
                {[
                  { v: "1,248", l: "Total Projects", c: "white" },
                  { v: "47", l: "High Risk", c: "var(--color-orange-300)" },
                  { v: "₹850 Cr", l: "Budget Tracked", c: "#67e8f9" },
                ].map(s => (
                  <div key={s.l} style={{ background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: "10px 10px" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1rem", color: s.c }}>{s.v}</div>
                    <div style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[{ p: 88, label: "DR-0001 Expressway", c: "#ef4444" }, { p: 84, label: "#7192 Road Widening", c: "#f59e0b" }, { p: 65, label: "#3347 School Building", c: "#3b82f6" }].map(r => (
                  <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.4)", width: 130, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.label}</span>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.1)", borderRadius: 99, height: 4 }}>
                      <div style={{ width: `${r.p}%`, height: "100%", background: r.c, borderRadius: 99 }} />
                    </div>
                    <span style={{ fontSize: "0.6rem", color: "rgba(255,255,255,0.5)", width: 20 }}>{r.p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — Form */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", background: "linear-gradient(135deg, #f8fafc 0%, var(--color-surface) 100%)" }}>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <div className="gov-card" style={{ padding: "36px 32px", overflow: "visible" }}>
              {/* Header strip */}
              <div style={{ height: 4, background: "linear-gradient(90deg, var(--color-orange-400), var(--color-navy-500), var(--color-orange-400))", backgroundSize: "200% 100%", animation: "gradientShift 3s ease infinite", margin: "-36px -32px 28px", borderRadius: "16px 16px 0 0" }} />

              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <div style={{ width: 48, height: 48, background: "var(--color-navy-50)", border: "1px solid var(--color-border)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-navy-700)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
                <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.3rem", color: "var(--color-navy-700)", marginBottom: 4 }}>Welcome Back</h1>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>Sign in to your monitoring dashboard</p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {error && <div style={{ color: "red", fontSize: "0.8rem", textAlign: "center" }}>{error}</div>}
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-navy-700)", marginBottom: 6 }}>
                    Email / User ID
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="officer@gov.in"
                    required
                    className="input-gov"
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-navy-700)", marginBottom: 6 }}>
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input-gov"
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                    <input type="checkbox" style={{ accentColor: "var(--color-navy-600)" }} />
                    <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>Remember me</span>
                  </label>
                  <a href="#" style={{ fontSize: "0.78rem", color: "var(--color-navy-500)", fontWeight: 500 }}>Forgot password?</a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gov-primary"
                  style={{ width: "100%", justifyContent: "center", padding: "11px", fontSize: "0.875rem", borderRadius: 6, opacity: loading ? 0.8 : 1 }}
                >
                  {loading ? (
                    <><svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" /><path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round" /></svg> Authenticating...</>
                  ) : "Sign In →"}
                </button>
              </form>

              <div style={{ marginTop: 20, background: "#f0fdf4", border: "1px solid #c6f6d5", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 8 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#276749" strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span style={{ fontSize: "0.72rem", color: "#276749" }}>
                  Secure, role-based access. Permissions determined after authentication.
                </span>
              </div>

              <div style={{ marginTop: 16, textAlign: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                  Need help?{" "}
                  <a href="#" style={{ color: "var(--color-navy-500)", fontWeight: 500 }}>Contact System Administrator</a>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
