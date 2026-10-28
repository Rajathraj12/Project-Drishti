import React, { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { authService, DemoUser } from "../services/authService"
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
    state: "PB",
    district: "Ludhiana",
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

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState("admin@drishti.gov.in")
  const [password, setPassword] = useState("Admin@123")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedRole, setSelectedRole] = useState<string>("ADMIN")
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>(FALLBACK_DEMO_USERS)
  const [activeTab, setActiveTab] = useState<"form" | "quick">("form")

  // Fetch live demo accounts from MongoDB endpoint on mount
  useEffect(() => {
    authService.getDemoUsers()
      .then((res) => {
        if (res && res.users && res.users.length > 0) {
          setDemoUsers(res.users)
        }
      })
      .catch(() => {
        // Keeps fallback demo users
      })
  }, [])

  const handleSelectDemoUser = (user: DemoUser, autoSubmit = false) => {
    setEmail(user.email)
    setPassword(user.password_plain)
    setSelectedRole(user.role)
    setError("")

    if (autoSubmit) {
      executeLogin(user.email, user.password_plain)
    }
  }

  const executeLogin = async (loginUser: string, loginPass: string) => {
    setLoading(true)
    setError("")
    try {
      const loggedIn = await login({ username: loginUser, password: loginPass })
      navigate(landingPath(loggedIn.role))
    } catch (err: any) {
      setError(err?.message || "Invalid credentials or backend connection failure. Please verify email and password.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    executeLogin(email, password)
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

      {/* Top Animated Tricolor Ribbon */}
      <div className="civic-ribbon" />

      {/* Header */}
      <header className="login-header">
        <Link to="/" className="brand-link">
          <div className="logo-glow-wrapper">
            <img src="/logo.png" alt="Project Drishti Logo" className="header-logo" />
          </div>
          <div>
            <div className="brand-title">
              Project Drishti
            </div>
            <div className="brand-subtitle">
              Civic Infrastructure Intelligence Portal
            </div>
          </div>
        </Link>

        <div className="header-right">
          <Link to="/" className="public-portal-link">
            <span>← Public Portal</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="login-main">
        <div className="login-card-container">
          
          {/* Hero Login Card */}
          <div className="login-card">
            
            {/* Animated Card Top Accent */}
            <div className="card-top-accent" />

            {/* Header with Radar Logo Effect */}
            <div className="card-header">
              <div className="radar-emblem-container">
                <div className="radar-ring radar-ring-1" />
                <div className="radar-ring radar-ring-2" />
                <div className="radar-core">
                  <img src="/logo.png" alt="Drishti" className="radar-logo" />
                </div>
              </div>

              <h1 className="card-title">
                Portal Authentication
              </h1>
              <p className="card-subtitle">
                Official Ministry & Civic Oversight Access
              </p>
            </div>

            {error && (
              <div className="error-banner">
                <span className="error-icon">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="input-group">
                <label className="input-label">
                  Email Address or Username
                </label>
                <div className="input-field-wrapper">
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@drishti.gov.in or admin"
                    required
                    className="styled-input"
                  />
                  <span className="input-icon">👤</span>
                </div>
              </div>

              <div className="input-group">
                <div className="password-label-row">
                  <label className="input-label">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="toggle-password-btn"
                  >
                    {showPassword ? "Hide Password" : "Show Password"}
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

              <div className="session-row">
                <label className="checkbox-label">
                  <input type="checkbox" defaultChecked className="styled-checkbox" />
                  <span>Remember Session (24h)</span>
                </label>
                <div className="role-tag">
                  Role: <strong>{selectedRole}</strong>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="submit-btn"
              >
                <div className="btn-shimmer" />
                {loading ? (
                  <span className="btn-loading-content">
                    <span className="btn-spinner" />
                    <span>Verifying JWT Credentials...</span>
                  </span>
                ) : (
                  <span className="btn-content">
                    <span>Authenticate & Access Portal</span>
                    <span className="btn-arrow">→</span>
                  </span>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="section-divider">
              <span className="divider-line" />
              <span className="divider-text">
                ⚡ Quick Test Roles
              </span>
              <span className="divider-line" />
            </div>

            {/* Small Compact Mini Role Cards (2x2 Grid) with Micro-Animations */}
            <div className="mini-cards-grid">
              {demoUsers.map((u) => {
                const isSelected = selectedRole === u.role
                const bStyle = getRoleBadgeStyle(u.role)
                return (
                  <div
                    key={u.role}
                    onClick={() => handleSelectDemoUser(u, false)}
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
                      <span className="state-pill">
                        {u.state}
                      </span>
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
                        onClick={(e) => { e.stopPropagation(); handleSelectDemoUser(u, false); }}
                        className="btn-fill"
                      >
                        Fill
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSelectDemoUser(u, true); }}
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

            {/* Institutional Trust Footer */}
            <div className="card-footer">
              <div className="footer-seal">
                <span>🏛️ National Civic Infrastructure Oversight • Project Drishti</span>
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        /* Global Root Layout */
        .login-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #070d1e;
          position: relative;
          overflow-x: hidden;
          font-family: var(--font-sans, "Inter", sans-serif);
        }

        /* Ambient Glowing Orbs */
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
          background: radial-gradient(circle, #2563eb 0%, #1e3a8a 60%, transparent 80%);
          bottom: -120px;
          right: -100px;
          animation-duration: 18s;
          animation-delay: -5s;
        }

        .ambient-orb-3 {
          width: 420px;
          height: 420px;
          background: radial-gradient(circle, #0d9488 0%, #047857 60%, transparent 80%);
          top: 30%;
          right: 20%;
          opacity: 0.25;
          animation-duration: 16s;
          animation-delay: -8s;
        }

        @keyframes floatOrb {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, 40px) scale(1.08); }
          100% { transform: translate(-25px, 20px) scale(0.95); }
        }

        /* Subtle Cyber Grid Matrix */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
          z-index: 1;
        }

        /* Top Shimmering Civic Ribbon */
        .civic-ribbon {
          height: 3.5px;
          background: linear-gradient(90deg, #F59E0B 0%, #3B82F6 45%, #10B981 80%, #F59E0B 100%);
          background-size: 250% 100%;
          animation: ribbonFlow 6s linear infinite;
          position: relative;
          z-index: 10;
        }

        @keyframes ribbonFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        /* Header */
        .login-header {
          padding: 0 32px;
          height: 70px;
          background: rgba(7, 13, 30, 0.7);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          align-items: center;
          justify-content: space-between;
          position: relative;
          z-index: 10;
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 14px;
          text-decoration: none;
        }

        .logo-glow-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-logo {
          height: 48px;
          width: 48px;
          object-fit: contain;
          filter: drop-shadow(0 0 10px rgba(37, 99, 235, 0.4));
          transition: transform 0.3s ease;
        }

        .brand-link:hover .header-logo {
          transform: scale(1.05) rotate(-2deg);
        }

        .brand-title {
          font-family: var(--font-display, "Inter", sans-serif);
          font-weight: 800;
          color: #ffffff;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
          line-height: 1;
        }

        .brand-subtitle {
          font-size: 0.58rem;
          color: #94a3b8;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-weight: 700;
          margin-top: 3px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .public-portal-link {
          font-size: 0.78rem;
          color: #60a5fa;
          font-weight: 600;
          text-decoration: none;
          padding: 7px 15px;
          border-radius: 8px;
          background: rgba(37, 99, 235, 0.12);
          border: 1px solid rgba(59, 130, 246, 0.3);
          transition: all 0.2s ease;
        }

        .public-portal-link:hover {
          background: rgba(37, 99, 235, 0.22);
          border-color: rgba(96, 165, 250, 0.6);
          color: #93c5fd;
          transform: translateX(-2px);
        }

        /* Main Container */
        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 36px 18px;
          position: relative;
          z-index: 10;
        }

        .login-card-container {
          width: 100%;
          max-width: 510px;
          animation: cardReveal 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes cardReveal {
          from {
            opacity: 0;
            transform: translateY(24px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* High-Impact Glass Card */
        .login-card {
          background: rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          padding: 38px 36px 28px;
          box-shadow: 
            0 25px 65px -12px rgba(2, 6, 23, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.4),
            0 0 35px rgba(37, 99, 235, 0.12);
          position: relative;
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .login-card:hover {
          box-shadow: 
            0 30px 75px -12px rgba(2, 6, 23, 0.6),
            0 0 0 1px rgba(255, 255, 255, 0.6),
            0 0 45px rgba(37, 99, 235, 0.2);
        }

        /* Card Top Gradient Accent */
        .card-top-accent {
          height: 4px;
          background: linear-gradient(90deg, #F59E0B 0%, #2563EB 50%, #0D9488 100%);
          background-size: 200% 100%;
          animation: ribbonFlow 5s ease infinite;
          margin: -38px -36px 26px;
        }

        /* Radar Emblem */
        .card-header {
          text-align: center;
          margin-bottom: 22px;
        }

        .radar-emblem-container {
          width: 60px;
          height: 60px;
          margin: 0 auto 12px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .radar-ring {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          pointer-events: none;
        }

        .radar-ring-1 {
          border: 1.5px solid rgba(37, 99, 235, 0.3);
          animation: radarPing 3s infinite cubic-bezier(0, 0.2, 0.8, 1);
        }

        .radar-ring-2 {
          border: 1px solid rgba(245, 158, 11, 0.25);
          animation: radarPing 3s infinite cubic-bezier(0, 0.2, 0.8, 1);
          animation-delay: 1.5s;
        }

        @keyframes radarPing {
          0% { transform: scale(0.9); opacity: 0.9; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        .radar-core {
          width: 52px;
          height: 52px;
          background: linear-gradient(135deg, #f0f7ff 0%, #ffffff 100%);
          border: 1px solid #dbeafe;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.14);
          z-index: 2;
          transition: transform 0.2s ease;
        }

        .radar-emblem-container:hover .radar-core {
          transform: scale(1.08) rotate(3deg);
        }

        .radar-logo {
          height: 36px;
          width: 36px;
          object-fit: contain;
        }

        .card-title {
          font-family: var(--font-display, "Inter", sans-serif);
          font-weight: 800;
          font-size: 1.5rem;
          color: #0b1f4b;
          margin: 0 0 4px;
          letter-spacing: -0.025em;
        }

        .card-subtitle {
          color: #64748b;
          font-size: 0.82rem;
          margin: 0;
          font-weight: 500;
        }

        /* Error Banner */
        .error-banner {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #b91c1c;
          padding: 10px 14px;
          border-radius: 8px;
          font-size: 0.8rem;
          margin-bottom: 18px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          animation: shake 0.4s ease;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }

        /* Form Inputs */
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .input-group {
          display: flex;
          flex-direction: column;
        }

        .input-label {
          display: block;
          font-size: 0.8rem;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 6px;
        }

        .input-field-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .styled-input {
          width: 100%;
          padding: 11px 40px 11px 14px;
          border-radius: 10px;
          border: 1.5px solid #cbd5e1;
          font-size: 0.9rem;
          outline: none;
          font-family: inherit;
          box-sizing: border-box;
          background: #ffffff;
          color: #0f172a;
          transition: all 0.2s ease;
        }

        .styled-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
          background: #fafcff;
        }

        .input-icon {
          position: absolute;
          right: 12px;
          font-size: 0.95rem;
          opacity: 0.6;
          pointer-events: none;
        }

        .password-label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .toggle-password-btn {
          background: none;
          border: none;
          color: #2563eb;
          font-size: 0.74rem;
          cursor: pointer;
          font-weight: 600;
          padding: 0;
          transition: color 0.15s ease;
        }

        .toggle-password-btn:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }

        .session-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 2px 0;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
          font-size: 0.78rem;
          color: #64748b;
          user-select: none;
        }

        .styled-checkbox {
          accent-color: #0b1f4b;
          cursor: pointer;
        }

        .role-tag {
          font-size: 0.72rem;
          color: #64748b;
        }

        .role-tag strong {
          color: #0b1f4b;
          background: #eef4ff;
          padding: 2px 6px;
          border-radius: 4px;
        }

        /* Submit Button */
        .submit-btn {
          width: 100%;
          padding: 12.5px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #0b1f4b 0%, #1e3a8a 50%, #2563eb 100%);
          background-size: 200% auto;
          color: white;
          font-size: 0.94rem;
          font-weight: 700;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 0 6px 18px rgba(11, 31, 75, 0.28);
          transition: all 0.25s ease;
        }

        .submit-btn:hover:not(:disabled) {
          background-position: right center;
          transform: translateY(-2px);
          box-shadow: 0 10px 24px rgba(37, 99, 235, 0.35);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0) scale(0.99);
        }

        .submit-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        .btn-shimmer {
          position: absolute;
          top: -50%;
          left: -60%;
          width: 40%;
          height: 200%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.22), transparent);
          transform: rotate(30deg);
          animation: btnSweep 4s infinite ease-in-out;
          pointer-events: none;
        }

        @keyframes btnSweep {
          0% { left: -60%; }
          30%, 100% { left: 140%; }
        }

        .btn-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .btn-arrow {
          transition: transform 0.2s ease;
        }

        .submit-btn:hover .btn-arrow {
          transform: translateX(4px);
        }

        .btn-loading-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          position: relative;
          z-index: 1;
        }

        .btn-spinner {
          display: inline-block;
          width: 15px;
          height: 15px;
          border: 2px solid rgba(255, 255, 255, 0.4);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Divider */
        .section-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 22px 0 14px;
        }

        .divider-line {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider-text {
          font-size: 0.68rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* Mini Role Cards */
        .mini-cards-grid {
          display: grid;
          grid-templateColumns: 1fr 1fr;
          gap: 9px;
        }

        .mini-card {
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 8px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          box-sizing: border-box;
          position: relative;
        }

        .mini-card:hover {
          transform: translateY(-2px);
          background: #ffffff;
          border-color: #93c5fd;
          box-shadow: 0 6px 14px rgba(15, 23, 42, 0.06);
        }

        .mini-card.selected {
          background: rgba(37, 99, 235, 0.035);
        }

        .mini-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .role-pill {
          font-size: 0.58rem;
          font-weight: 800;
          padding: 1.5px 5.5px;
          border-radius: 99px;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          border-width: 1px;
          border-style: solid;
        }

        .state-pill {
          font-size: 0.64rem;
          font-weight: 800;
          color: #0b1f4b;
          background: #e2e8f0;
          padding: 1px 5px;
          border-radius: 4px;
        }

        .mini-card-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .user-name {
          font-size: 0.78rem;
          font-weight: 700;
          color: #0f172a;
        }

        .active-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          animation: pulseGlow 1.5s infinite ease-in-out;
        }

        .mini-card-creds {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.64rem;
          color: #64748b;
        }

        .cred-chip {
          background: #e2e8f0;
          padding: 1px 4px;
          border-radius: 3px;
          color: #1e293b;
          font-weight: 500;
        }

        .cred-pass {
          background: #e2e8f0;
          padding: 1px 4px;
          border-radius: 3px;
          color: #1e293b;
          font-weight: 700;
        }

        .mini-card-actions {
          display: flex;
          gap: 4px;
          margin-top: 3px;
        }

        .btn-fill {
          flex: 1;
          padding: 3.5px 5px;
          border-radius: 5px;
          font-size: 0.64rem;
          font-weight: 600;
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-fill:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .btn-quick-login {
          flex: 1.25;
          padding: 3.5px 5px;
          border-radius: 5px;
          font-size: 0.64rem;
          font-weight: 700;
          border: none;
          background: #0b1f4b;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          transition: all 0.15s ease;
        }

        .btn-quick-login:hover {
          background: #1d4ed8;
          transform: translateY(-0.5px);
        }

        .mini-arrow {
          transition: transform 0.15s ease;
        }

        .btn-quick-login:hover .mini-arrow {
          transform: translateX(2px);
        }

        /* Card Footer */
        .card-footer {
          margin-top: 18px;
          text-align: center;
        }

        .footer-seal {
          font-size: 0.68rem;
          color: #94a3b8;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
