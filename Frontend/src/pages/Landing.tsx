import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"

export default function Landing() {
  const navigate = useNavigate()
  const [heroSlide, setHeroSlide] = useState(0)
  const [mounted, setMounted] = useState(false)

  const heroSlides = [
    { title: "Project Monitoring", subtitle: "Government Infrastructure Projects Across India" },
    { title: "Evidence-Driven Oversight", subtitle: "Real-time field data, satellite imagery & inspection records" },
    { title: "Risk Analysis & Alerts", subtitle: "Automated anomaly detection for project oversight" },
  ]

  useEffect(() => {
    setMounted(true)
    const t = setInterval(() => setHeroSlide(s => (s + 1) % heroSlides.length), 5000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ minHeight: "100%", background: "white", fontFamily: "var(--font-sans)" }}>

      {/* ===== TOP HEADER ===== */}
      <header style={{ background: "white", borderBottom: "3px solid var(--color-orange-400)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Project Drishti Logo" style={{ height: 48, objectFit: "contain" }} />
          </div>

          {/* CTA Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => navigate("/dashboard")} className="btn-gov-primary">
              ADD PROJECT / UPDATE
            </button>
            <button onClick={() => navigate("/dashboard")} className="btn-gov-secondary">
              REPORTS
            </button>
          </div>
        </div>
      </header>

      {/* ===== NAV BAR ===== */}
      <nav style={{ background: "var(--color-navy-700)", position: "sticky", top: 68, zIndex: 99 }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 44, display: "flex", alignItems: "center" }}>
          {[
            { label: "Home", href: "#" },
            { label: "Publications", href: "#" },
            { label: "Dashboard", href: "/dashboard" },
            { label: "About", href: "#about" },
          ].map((item, i) => (
            <a
              key={item.label}
              href={item.href}
              onClick={item.href.startsWith("/") ? (e) => { e.preventDefault(); navigate(item.href) } : undefined}
              className={`nav-link ${i === 0 ? "active" : ""}`}
              style={{ textDecoration: "none" }}
            >
              {item.label}
              {item.label === "Publications" && <span style={{ marginLeft: 4, fontSize: "0.6rem" }}>▾</span>}
              {item.label === "Dashboard" && <span style={{ marginLeft: 4, fontSize: "0.6rem" }}>▾</span>}
            </a>
          ))}
        </div>
      </nav>

      {/* ===== HERO SLIDER ===== */}
      <section style={{ position: "relative", height: 500, overflow: "hidden" }}>
        {/* Animated Background Gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #312e81 100%)",
          backgroundSize: "400% 400%",
          animation: "gradient 15s ease infinite"
        }} />
        
        {/* Modern Grid Pattern Overlay */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          opacity: 0.5
        }} />
        
        {/* Glow Effects */}
        <div style={{
          position: "absolute", top: "20%", left: "20%", width: 300, height: 300,
          background: "rgba(99, 102, 241, 0.2)", filter: "blur(100px)", borderRadius: "50%"
        }} />
        <div style={{
          position: "absolute", bottom: "10%", right: "20%", width: 400, height: 400,
          background: "rgba(139, 92, 246, 0.2)", filter: "blur(120px)", borderRadius: "50%"
        }} />

        {/* Slide content */}
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 24px" }}>
          <div style={{
            background: "rgba(15, 23, 42, 0.4)", borderRadius: 24, padding: "48px 56px",
            backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            maxWidth: 760,
            transform: "translateY(0)",
            transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          }}>
            <h1 style={{
              fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "3rem",
              background: "linear-gradient(to right, #f8fafc, #cbd5e1)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              lineHeight: 1.1, marginBottom: 20, letterSpacing: "-0.02em"
            }}>
              {heroSlides[heroSlide].title}
            </h1>
            <p style={{
              color: "#94a3b8", fontSize: "1.1rem", marginBottom: 36,
              maxWidth: 580, margin: "0 auto", lineHeight: 1.6, fontWeight: 400
            }}>
              {heroSlides[heroSlide].subtitle}
            </p>
            <button onClick={() => navigate("/dashboard")} style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white", border: "none", padding: "14px 32px", borderRadius: 12,
              fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "1.05rem",
              cursor: "pointer", boxShadow: "0 10px 25px -5px rgba(37, 99, 235, 0.5)",
              transition: "transform 0.2s, box-shadow 0.2s",
              marginTop: 16
            }}>
              Access Dashboard →
            </button>
          </div>
        </div>

        {/* Slide indicators */}
        <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 8 }}>
          {heroSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setHeroSlide(i)}
              style={{
                width: i === heroSlide ? 24 : 10, height: 10, borderRadius: 5,
                background: i === heroSlide ? "var(--color-orange-400)" : "rgba(255,255,255,0.4)",
                border: "none", cursor: "pointer", transition: "all 0.3s",
              }}
            />
          ))}
        </div>

        {/* Arrows */}
        <button onClick={() => setHeroSlide(s => (s - 1 + heroSlides.length) % heroSlides.length)} style={{
          position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
          width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.3)", color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
        }}>‹</button>
        <button onClick={() => setHeroSlide(s => (s + 1) % heroSlides.length)} style={{
          position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
          width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
          border: "1px solid rgba(255,255,255,0.3)", color: "white", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.1rem",
        }}>›</button>
      </section>



      {/* ===== HOW IT WORKS ===== */}
      <section style={{ padding: "56px 24px", background: "white" }} id="about">
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div className="section-label" style={{ marginBottom: 10 }}>Platform Overview</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.75rem", color: "var(--color-navy-700)", marginBottom: 10 }}>
              How Project Drishti Works
            </h2>
            <p style={{ color: "var(--color-text-muted)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
              An integrated monitoring platform combining financial data, field evidence, and inspection records.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              { step: "01", icon: "🔗", title: "Data Integration", desc: "Project expenditure, timelines, contractor records, inspection photos and field reports aggregated from multiple government systems." },
              { step: "02", icon: "🔍", title: "Pattern Analysis", desc: "Algorithms compare reported progress against financial data, timeline expectations, and historical contractor performance to identify anomalies." },
              { step: "03", icon: "📋", title: "Prioritized Action", desc: "Officers receive a curated list of projects flagged for attention, with evidence-based reasons and recommended verification steps." },
            ].map((s, i) => (
              <div key={s.step} className="gov-card" style={{ padding: "24px 22px", position: "relative", overflow: "hidden" }}>
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: i === 0 ? "var(--color-orange-400)" : i === 1 ? "var(--color-navy-500)" : "var(--color-risk-low)",
                }} />
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: "1.2rem", color: "var(--color-navy-100)", lineHeight: 1 }}>{s.step}</span>
                  <span style={{ fontSize: "1.5rem" }}>{s.icon}</span>
                </div>
                <h3 style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "1rem", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HIGH VALUE PROJECTS (like reference) ===== */}
      <section className="wave-bg" style={{ padding: "56px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.75rem", color: "var(--color-navy-700)", textAlign: "center", marginBottom: 36 }}>
            High Risk Projects
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {[
              { sector: "Infrastructure", org: "PWD Karnataka", project: "Expressway Phase-I", cost: "₹ 1,895 Cr", progress: 47, revised: "₹ 2,034 Cr", date: "31/12/2026", icon: "🏛️" },
              { sector: "Roads", org: "BBMP Bengaluru", project: "Ward Road Widening", cost: "₹ 5.1 Cr", progress: 61, revised: "₹ 5.1 Cr", date: "30/06/2026", icon: "🛣️" },
              { sector: "Education", org: "School Dept. KA", project: "Primary School Building", cost: "₹ 1.8 Cr", progress: 55, revised: "₹ 1.95 Cr", date: "31/03/2027", icon: "🏫" },
              { sector: "Transport", org: "NHAI Hassan", project: "Bridge Construction (NH-48)", cost: "₹ 12.4 Cr", progress: 38, revised: "₹ 13.2 Cr", date: "31/12/2028", icon: "🌉" },
            ].map(p => (
              <div key={p.project} className="gov-card" style={{ padding: "20px 18px", textAlign: "center" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>{p.icon}</div>
                <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, color: "var(--color-navy-700)", fontSize: "0.85rem", marginBottom: 4 }}>{p.sector}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: 8, fontWeight: 500 }}>{p.org}</div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginBottom: 14, lineHeight: 1.4 }}>{p.project}</div>
                <div style={{ height: 1, background: "var(--color-border)", marginBottom: 12 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, textAlign: "left" }}>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>Original Cost (in Cr.)</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.82rem", color: "var(--color-navy-700)" }}>{p.cost}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>Physical Progress (%)</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.82rem", color: "var(--color-navy-700)" }}>{p.progress}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>Latest Revised Cost</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.82rem", color: "var(--color-navy-700)" }}>{p.revised}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.6rem", color: "var(--color-text-muted)" }}>Latest Revised Comp. Date</div>
                    <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: "0.82rem", color: "var(--color-navy-700)" }}>{p.date}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ background: "var(--color-navy-800)", padding: "28px 24px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.15)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <EyeSvg size={18} />
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, color: "white", fontSize: "0.9rem" }}>Project Drishti</div>
              <div style={{ fontSize: "0.65rem", color: "rgba(255,255,255,0.5)" }}>Ministry of Statistics & Programme Implementation</div>
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.5)", textAlign: "center" }}>
            © 2026 Government of India · All Rights Reserved · Content owned by Ministry of Infrastructure
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {["Home", "About", "Contact Us", "Privacy Policy"].map(l => (
              <a key={l} href="#" style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}

function EyeSvg({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  )
}
