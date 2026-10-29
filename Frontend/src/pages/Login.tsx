import React, { useState, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { authService, DemoUser } from "../services/authService"
import { signInWithGoogleFirebase } from "../services/firebase"
import { landingPath } from "../permissions/rbac"

const FALLBACK_DEMO_USERS: DemoUser[] = [
  {
    username: "admin",
    email: "admin@drishti.gov.in",
    password_plain: "Admin@123",
    role: "ADMIN",
    first_name: "Rajesh",
    last_name: "Sharma",
    full_name: "Rajesh Sharma",
    department: "MoSPI - Infrastructure Oversight",
    state: "Delhi",
    district: "New Delhi",
    assigned_projects: ["DR-0001", "DR-0002", "DR-0003", "DR-0004", "DR-0005"],
    description: "National PMO Administrator with complete systemic oversight.",
    badge_color: "#1e3a8a",
  },
  {
    username: "govt_officer",
    email: "officer@drishti.gov.in",
    password_plain: "Officer@123",
    role: "GOVERNMENT_OFFICER",
    first_name: "Priya",
    last_name: "Nair",
    full_name: "Priya Nair",
    department: "Ministry of Road Transport & Highways",
    state: "National / All States",
    district: "",
    assigned_projects: ["DR-0001", "DR-0002", "DR-0003"],
    description: "State & Ministry oversight officer approving milestones.",
    badge_color: "#0d9488",
  },
  {
    username: "field_officer",
    email: "field@drishti.gov.in",
    password_plain: "Field@123",
    role: "FIELD_OFFICER",
    first_name: "Amit",
    last_name: "Patel",
    full_name: "Amit Patel",
    department: "National Highways Authority of India (NHAI)",
    state: "HP",
    district: "Shimla",
    assigned_projects: ["DR-0009", "DR-0010", "DR-0011"],
    description: "Site verification engineer conducting ground inspections.",
    badge_color: "#d97706",
  },
  {
    username: "citizen",
    email: "citizen@drishti.gov.in",
    password_plain: "Citizen@123",
    role: "CITIZEN",
    first_name: "Ananya",
    last_name: "Verma",
    full_name: "Ananya Verma",
    department: "Civic Transparency Watch",
    state: "Karnataka",
    district: "Bengaluru Urban",
    assigned_projects: [],
    description: "Public citizen auditor monitoring taxpayer infrastructure spend.",
    badge_color: "#2563eb",
  },
]

const INDIAN_STATES = [
  "Delhi", "Karnataka", "Maharashtra", "Punjab", "Himachal Pradesh",
  "Uttar Pradesh", "Gujarat", "Tamil Nadu", "Rajasthan", "West Bengal",
  "Kerala", "Madhya Pradesh", "Bihar", "Andhra Pradesh", "Telangana",
  "Haryana", "Odisha", "Assam", "Jharkhand", "Chhattisgarh", "Uttarakhand", "All India"
]

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginCitizen, registerCitizen, loginWithGoogle } = useAuth()

  // Parse URL search params for tab and redirect
  const queryParams = new URLSearchParams(location.search)
  const initialTab = queryParams.get("tab") === "officer" ? "officer" : "citizen"
  const initialSub = queryParams.get("sub") === "register" ? "register" : "signin"
  const redirectUrl = queryParams.get("redirect") || ""

  // Main portal tab: "citizen" | "officer"
  const [portalTab, setPortalTab] = useState<"citizen" | "officer">(initialTab)

  // Citizen sub-mode: "signin" | "register"
  const [citizenMode, setCitizenMode] = useState<"signin" | "register">(initialSub)

  // Official Login Form state
  const [email, setEmail] = useState("admin@drishti.gov.in")
  const [password, setPassword] = useState("Admin@123")
  const [showPassword, setShowPassword] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN")

  // Citizen Sign In form state
  const [citizenLoginEmail, setCitizenLoginEmail] = useState("citizen@drishti.gov.in")
  const [citizenLoginPassword, setCitizenLoginPassword] = useState("Citizen@123")
  const [showCitizenPassword, setShowCitizenPassword] = useState(false)

  // Citizen Register form state
  const [regFullName, setRegFullName] = useState("")
  const [regEmail, setRegEmail] = useState("")
  const [regPassword, setRegPassword] = useState("")
  const [regState, setRegState] = useState("Delhi")
  const [regDistrict, setRegDistrict] = useState("")
  const [regPhone, setRegPhone] = useState("")

  // General loading & error
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>(FALLBACK_DEMO_USERS)

  // Fetch demo accounts from MongoDB Atlas endpoint
  useEffect(() => {
    authService.getDemoUsers()
      .then((res) => {
        if (res && res.users && res.users.length > 0) {
          setDemoUsers(res.users)
        }
      })
      .catch(() => {})
  }, [])

  // Keep portal tab in sync with URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    const sub = params.get('sub')
    if (tab === 'officer') {
      setPortalTab('officer')
    } else if (tab === 'citizen') {
      setPortalTab('citizen')
    }
    if (sub === 'register') {
      setCitizenMode('register')
    } else if (sub === 'signin') {
      setCitizenMode('signin')
    }
  }, [location.search])


  const navigateAfterAuth = (user: any) => {
    if (redirectUrl) {
      navigate(redirectUrl)
    } else {
      navigate(landingPath(user.role))
    }
  }

  // Handle real Google Sign-In via Firebase
  const handleFirebaseGoogleLogin = async () => {
    setLoading(true)
    setError("")
    try {
      const fbResult = await signInWithGoogleFirebase()
      if (fbResult && fbResult.email) {
        const user = await loginWithGoogle({
          credential: fbResult.idToken,
          email: fbResult.email,
          name: fbResult.displayName || fbResult.email.split("@")[0],
          google_id: fbResult.uid,
          photo_url: fbResult.photoURL || undefined,
        })
        navigateAfterAuth(user)
      }
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setLoading(false)
        return
      }
      console.error("Firebase auth error:", err)
      setError(err?.message || "Google Authentication failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Official Ministry login submit
  const handleOfficialSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const user = await login({ username: email, password })
      navigateAfterAuth(user)
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or unauthorized official access.")
    } finally {
      setLoading(false)
    }
  }

  // Citizen Login submit (MongoDB)
  const handleCitizenLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    try {
      const user = await loginCitizen({ email: citizenLoginEmail, password: citizenLoginPassword })
      navigateAfterAuth(user)
    } catch (err: any) {
      setError(err?.message || "Invalid citizen email or password.")
    } finally {
      setLoading(false)
    }
  }

  // Citizen Registration submit (MongoDB)
  const handleCitizenRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regFullName.trim()) {
      setError("Please provide your full name.")
      return
    }
    if (!regEmail.includes("@")) {
      setError("Please provide a valid email address.")
      return
    }
    if (regPassword.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    setLoading(true)
    setError("")
    try {
      const user = await registerCitizen({
        full_name: regFullName,
        email: regEmail,
        password: regPassword,
        state: regState,
        district: regDistrict,
        phone: regPhone,
      })
      navigateAfterAuth(user)
    } catch (err: any) {
      setError(err?.message || "Failed to create citizen account. An account with this email may already exist.")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOfficialDemoUser = (user: DemoUser, autoSubmit = false) => {
    setEmail(user.email)
    setPassword(user.password_plain)
    setSelectedRole(user.role)
    setError("")
    if (autoSubmit) {
      setLoading(true)
      login({ username: user.email, password: user.password_plain })
        .then((u) => navigateAfterAuth(u))
        .catch((err) => setError(err?.message || "Demo login failed."))
        .finally(() => setLoading(false))
    }
  }

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case "ADMIN":
        return { bg: "rgba(30, 58, 138, 0.12)", color: "#1e3a8a", border: "rgba(30, 58, 138, 0.28)", glow: "rgba(30, 58, 138, 0.15)" }
      case "GOVERNMENT_OFFICER":
        return { bg: "rgba(13, 148, 136, 0.12)", color: "#0d9488", border: "rgba(13, 148, 136, 0.28)", glow: "rgba(13, 148, 136, 0.15)" }
      case "FIELD_OFFICER":
        return { bg: "rgba(217, 119, 6, 0.12)", color: "#b45309", border: "rgba(217, 119, 6, 0.28)", glow: "rgba(217, 119, 6, 0.15)" }
      case "CITIZEN":
        return { bg: "rgba(37, 99, 235, 0.12)", color: "#2563eb", border: "rgba(37, 99, 235, 0.28)", glow: "rgba(37, 99, 235, 0.15)" }
      default:
        return { bg: "rgba(100, 116, 139, 0.12)", color: "#475569", border: "rgba(100, 116, 139, 0.28)", glow: "rgba(100, 116, 139, 0.15)" }
    }
  }

  return (
    <div className="login-root">
      {/* Background Animated Ambience */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />
      <div className="grid-overlay" />

      {/* Main Container */}
      <main className="login-main">
        <div className="login-card-container">
          
          {/* Hero Login Card */}
          <div className="login-card">
            
            <div className="card-top-accent" />

            {/* Portal Switcher Tabs */}
            <div className="portal-tabs">
              <button
                type="button"
                onClick={() => { setPortalTab("citizen"); setError(""); }}
                className={`portal-tab-btn ${portalTab === "citizen" ? "active" : ""}`}
              >
                <span className="portal-tab-icon">🇮🇳</span>
                <div>
                  <div className="portal-tab-title">Citizen Portal</div>
                  <div className="portal-tab-subtitle">Public Access & Grievances</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setPortalTab("officer"); setError(""); }}
                className={`portal-tab-btn ${portalTab === "officer" ? "active" : ""}`}
              >
                <span className="portal-tab-icon">🏛️</span>
                <div>
                  <div className="portal-tab-title">Ministry Officials</div>
                  <div className="portal-tab-subtitle">Oversight & Field Audits</div>
                </div>
              </button>
            </div>

            {error && (
              <div className="error-banner">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 1: CITIZEN PORTAL                                          */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {portalTab === "citizen" && (
              <div className="citizen-portal-content">
                
                {/* Mode Sub-toggle: Sign In vs Register */}
                <div className="citizen-mode-toggle">
                  <button
                    type="button"
                    onClick={() => { setCitizenMode("signin"); setError(""); }}
                    className={`mode-btn ${citizenMode === "signin" ? "active" : ""}`}
                  >
                    Citizen Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setCitizenMode("register"); setError(""); }}
                    className={`mode-btn ${citizenMode === "register" ? "active" : ""}`}
                  >
                    Create Citizen Account
                  </button>
                </div>

                {/* Google Sign In Section */}
                <div className="google-auth-wrapper">
                  <button
                    type="button"
                    onClick={handleFirebaseGoogleLogin}
                    disabled={loading}
                    className="custom-google-btn"
                  >
                    <svg className="google-icon-svg" viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>{loading ? "Connecting to Google..." : "Sign in with Google"}</span>
                  </button>
                </div>

                <div className="section-divider">
                  <span className="divider-line" />
                  <span className="divider-text">OR CONTINUE WITH CITIZEN ACCOUNT</span>
                  <span className="divider-line" />
                </div>

                {/* Citizen Sign In Form */}
                {citizenMode === "signin" && (
                  <form onSubmit={handleCitizenLoginSubmit} className="auth-form">
                    <div className="input-group">
                      <label className="input-label">Citizen Email or Username</label>
                      <div className="input-field-wrapper">
                        <input
                          type="text"
                          value={citizenLoginEmail}
                          onChange={(e) => setCitizenLoginEmail(e.target.value)}
                          placeholder="e.g. citizen@drishti.gov.in"
                          required
                          className="styled-input"
                        />
                        <span className="input-icon">👤</span>
                      </div>
                    </div>

                    <div className="input-group">
                      <div className="password-label-row">
                        <label className="input-label">Password</label>
                        <button
                          type="button"
                          onClick={() => setShowCitizenPassword(!showCitizenPassword)}
                          className="toggle-password-btn"
                        >
                          {showCitizenPassword ? "Hide" : "Show"}
                        </button>
                      </div>
                      <div className="input-field-wrapper">
                        <input
                          type={showCitizenPassword ? "text" : "password"}
                          value={citizenLoginPassword}
                          onChange={(e) => setCitizenLoginPassword(e.target.value)}
                          placeholder="Enter your citizen password"
                          required
                          className="styled-input"
                        />
                        <span className="input-icon">🔑</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="submit-btn citizen-btn"
                    >
                      {loading ? "Signing in..." : "Sign In as Citizen →"}
                    </button>
                  </form>
                )}

                {/* Citizen Registration Form (Persists to MongoDB) */}
                {citizenMode === "register" && (
                  <form onSubmit={handleCitizenRegisterSubmit} className="auth-form">
                    <div className="input-group">
                      <label className="input-label">Full Name *</label>
                      <div className="input-field-wrapper">
                        <input
                          type="text"
                          value={regFullName}
                          onChange={(e) => setRegFullName(e.target.value)}
                          placeholder="e.g. Ramesh Kumar"
                          required
                          className="styled-input"
                        />
                        <span className="input-icon">👤</span>
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Email Address *</label>
                      <div className="input-field-wrapper">
                        <input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="name@example.com"
                          required
                          className="styled-input"
                        />
                        <span className="input-icon">✉️</span>
                      </div>
                    </div>

                    <div className="input-group">
                      <label className="input-label">Create Password * (min 6 characters)</label>
                      <div className="input-field-wrapper">
                        <input
                          type="password"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Choose a secure password"
                          required
                          className="styled-input"
                        />
                        <span className="input-icon">🔒</span>
                      </div>
                    </div>

                    <div className="grid-2-inputs">
                      <div className="input-group">
                        <label className="input-label">State Jurisdiction</label>
                        <select
                          value={regState}
                          onChange={(e) => setRegState(e.target.value)}
                          className="styled-select"
                        >
                          {INDIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div className="input-group">
                        <label className="input-label">District (Optional)</label>
                        <input
                          type="text"
                          value={regDistrict}
                          onChange={(e) => setRegDistrict(e.target.value)}
                          placeholder="e.g. South Delhi"
                          className="styled-input-mini"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="submit-btn citizen-btn"
                    >
                      {loading ? "Creating account..." : "Create Account & Sign In →"}
                    </button>
                  </form>
                )}

                {/* Guest Browsing Link */}
                <div className="guest-banner">
                  <span>Want to explore without logging in?</span>
                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="guest-action-btn"
                  >
                    Browse as Guest Citizen →
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 2: MINISTRY & GOVERNMENT OFFICIALS                         */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {portalTab === "officer" && (
              <div>
                <form onSubmit={handleOfficialSubmit} className="auth-form">
                  <div className="input-group">
                    <label className="input-label">Official Email or Username</label>
                    <div className="input-field-wrapper">
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. officer@drishti.gov.in or admin"
                        required
                        className="styled-input"
                      />
                      <span className="input-icon">🏛️</span>
                    </div>
                  </div>

                  <div className="input-group">
                    <div className="password-label-row">
                      <label className="input-label">Security Password</label>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="toggle-password-btn"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <div className="input-field-wrapper">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter security password"
                        required
                        className="styled-input"
                      />
                      <span className="input-icon">🔑</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="submit-btn"
                  >
                    {loading ? "Verifying Official Credentials..." : "Authenticate Official Portal →"}
                  </button>
                </form>

                {/* Official Quick Test Roles */}
                <div className="section-divider">
                  <span className="divider-line" />
                  <span className="divider-text">⚡ Official Ministry Accounts</span>
                  <span className="divider-line" />
                </div>

                <div className="mini-cards-grid">
                  {demoUsers.filter(u => u.role !== "CITIZEN").map((u) => {
                    const isSelected = selectedRole === u.role
                    const bStyle = getRoleBadgeStyle(u.role)
                    return (
                      <div
                        key={u.role}
                        onClick={() => handleSelectOfficialDemoUser(u, false)}
                        className={`mini-card ${isSelected ? "selected" : ""}`}
                        style={{
                          boxShadow: isSelected ? `0 4px 14px ${bStyle.glow}` : undefined,
                          borderColor: isSelected ? bStyle.color : undefined,
                        }}
                      >
                        <div className="mini-card-header">
                          <span
                            className="role-pill"
                            style={{
                              background: bStyle.bg,
                              color: bStyle.color,
                              borderColor: bStyle.border,
                            }}
                          >
                            {u.role.replace(/_/g, " ")}
                          </span>
                          <span className="state-pill">{u.state}</span>
                        </div>

                        <div className="mini-card-name-row">
                          <span className="user-name">
                            {u.full_name || `${u.first_name} ${u.last_name}`}
                          </span>
                          {isSelected && (
                            <span className="active-dot" style={{ background: bStyle.color }} />
                          )}
                        </div>

                        <div className="mini-card-creds">
                          <span className="cred-chip">{u.email.split('@')[0]}</span>
                          <span className="cred-pass">{u.password_plain}</span>
                        </div>

                        <div className="mini-card-actions">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectOfficialDemoUser(u, false); }}
                            className="btn-fill"
                          >
                            Fill
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleSelectOfficialDemoUser(u, true); }}
                            className="btn-quick-login"
                          >
                            <span>Sign In</span>
                            <span className="mini-arrow">→</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Institutional Seal Footer */}
            <div className="card-footer">
              <div className="footer-seal">
                <span>🏛️ National Infrastructure Oversight • Project Drishti</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        .login-root {
          min-height: calc(100vh - 64px);
          display: flex;
          flex-direction: column;
          background: #070d1e;
          position: relative;
          overflow-x: hidden;
          font-family: var(--font-sans, "Inter", sans-serif);
        }

        .ambient-orb {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          opacity: 0.35;
          filter: blur(120px);
          animation: floatOrb 12s ease-in-out infinite alternate;
        }

        .ambient-orb-1 {
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, #f59e0b 0%, #b45309 60%, transparent 80%);
          top: -100px;
          left: -80px;
          animation-duration: 14s;
        }

        .ambient-orb-2 {
          width: 550px;
          height: 550px;
          background: radial-gradient(circle, #1e3a8a 0%, #0c1a3b 60%, transparent 80%);
          bottom: -150px;
          right: -100px;
          animation-duration: 16s;
        }

        .ambient-orb-3 {
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, #10b981 0%, transparent 70%);
          top: 40%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.15;
          animation-duration: 18s;
        }

        @keyframes floatOrb {
          0% { transform: translateY(0px) scale(1); }
          100% { transform: translateY(30px) scale(1.05); }
        }

        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 36px 36px;
          pointer-events: none;
          z-index: 1;
        }

        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 36px 16px 60px;
          position: relative;
          z-index: 10;
        }

        .login-card-container {
          width: 100%;
          max-width: 520px;
        }

        .login-card {
          background: rgba(13, 23, 49, 0.88);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 24px;
          padding: 28px 32px;
          box-shadow: 
            0 20px 50px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          position: relative;
          overflow: hidden;
        }

        .card-top-accent {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #60a5fa, #f59e0b);
        }

        .portal-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          background: rgba(15, 23, 42, 0.7);
          padding: 5px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 22px;
        }

        .portal-tab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          border: none;
          background: transparent;
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .portal-tab-btn.active {
          background: rgba(30, 58, 138, 0.6);
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(30, 58, 138, 0.35);
          border: 1px solid rgba(96, 165, 250, 0.3);
        }

        .portal-tab-icon {
          font-size: 1.3rem;
        }

        .portal-tab-title {
          font-size: 0.82rem;
          font-weight: 700;
          line-height: 1.2;
        }

        .portal-tab-subtitle {
          font-size: 0.65rem;
          opacity: 0.75;
          margin-top: 2px;
        }

        .citizen-mode-toggle {
          display: flex;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 20px;
          gap: 16px;
        }

        .mode-btn {
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 8px 4px 12px;
          color: #94a3b8;
          font-size: 0.84rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-btn.active {
          color: #60a5fa;
          border-bottom-color: #3b82f6;
          font-weight: 700;
        }

        .google-auth-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .custom-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #ffffff;
          color: #1f2937;
          border: 1px solid #e5e7eb;
          padding: 11px 20px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        }

        .custom-google-btn:hover {
          background: #f8fafc;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          transform: translateY(-1px);
        }

        .error-banner {
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 18px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fca5a5;
          font-size: 0.8rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-label {
          font-size: 0.76rem;
          font-weight: 600;
          color: #cbd5e1;
        }

        .password-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .toggle-password-btn {
          background: none;
          border: none;
          color: #93c5fd;
          font-size: 0.7rem;
          cursor: pointer;
          font-weight: 500;
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .styled-input {
          width: 100%;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 40px 10px 14px;
          color: #ffffff;
          font-size: 0.85rem;
          outline: none;
          transition: all 0.2s ease;
        }

        .styled-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.25);
          background: rgba(15, 23, 42, 0.9);
        }

        .input-icon {
          position: absolute;
          right: 14px;
          font-size: 0.85rem;
          opacity: 0.6;
          pointer-events: none;
        }

        .grid-2-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .styled-select, .styled-input-mini {
          width: 100%;
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 10px;
          padding: 8px 12px;
          color: #ffffff;
          font-size: 0.8rem;
          outline: none;
        }

        .styled-select option {
          background: #0f172a;
          color: #ffffff;
        }

        .submit-btn {
          background: linear-gradient(135deg, #1e3a8a, #2563eb);
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          padding: 12px;
          font-size: 0.88rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 4px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
        }

        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #2563eb, #3b82f6);
          transform: translateY(-1px);
        }

        .citizen-btn {
          background: linear-gradient(135deg, #0d9488, #059669);
          box-shadow: 0 4px 14px rgba(13, 148, 136, 0.3);
        }

        .citizen-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, #0f766e, #0d9488);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .guest-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.04);
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          padding: 10px 14px;
          margin-top: 18px;
          font-size: 0.76rem;
          color: #cbd5e1;
        }

        .guest-action-btn {
          background: none;
          border: none;
          color: #f59e0b;
          font-weight: 700;
          font-size: 0.76rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .section-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 18px 0;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .divider-text {
          font-size: 0.68rem;
          font-weight: 700;
          color: #64748b;
          letter-spacing: 0.04em;
        }

        .mini-cards-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 10px;
        }

        .mini-card {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .mini-card:hover {
          border-color: rgba(96, 165, 250, 0.4);
          background: rgba(30, 58, 138, 0.2);
        }

        .mini-card.selected {
          background: rgba(30, 58, 138, 0.3);
          border-color: #3b82f6;
        }

        .mini-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
        }

        .role-pill {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 6px;
          border: 1px solid;
        }

        .state-pill {
          font-size: 0.68rem;
          color: #94a3b8;
          font-weight: 600;
        }

        .mini-card-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #ffffff;
        }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .mini-card-creds {
          display: flex;
          gap: 8px;
          font-family: monospace;
          font-size: 0.72rem;
          color: #94a3b8;
          margin-top: 4px;
        }

        .cred-chip {
          background: rgba(255, 255, 255, 0.06);
          padding: 1px 6px;
          border-radius: 4px;
        }

        .cred-pass {
          color: #cbd5e1;
        }

        .mini-card-actions {
          display: flex;
          gap: 6px;
          margin-top: 8px;
          justify-content: flex-end;
        }

        .btn-fill {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #cbd5e1;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.72rem;
          cursor: pointer;
        }

        .btn-quick-login {
          background: #1e3a8a;
          border: 1px solid #3b82f6;
          color: #ffffff;
          padding: 4px 12px;
          border-radius: 6px;
          font-size: 0.72rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .card-footer {
          margin-top: 22px;
          padding-top: 14px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          text-align: center;
        }

        .footer-seal {
          font-size: 0.7rem;
          color: #64748b;
          font-weight: 600;
        }
      `}</style>
    </div>
  )
}
