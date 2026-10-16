import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import { reportService, OversightDashboardData } from "../services/reportService"

type ReportType =
  | "risk_assessments"
  | "overdue_actions"
  | "pending_reviews"
  | "unresolved_findings"
  | "public_oversight"

export default function Reports() {
  const { user } = useAuth()
  const isCitizen = user?.role === "CITIZEN"

  // State
  const [dashboardData, setDashboardData] = useState<OversightDashboardData | null>(null)
  const [activeReport, setActiveReport] = useState<ReportType>(
    isCitizen ? "public_oversight" : "risk_assessments"
  )
  const [reportResults, setReportResults] = useState<Record<string, any>[]>([])
  const [reportCount, setReportCount] = useState(0)
  const [generatedAt, setGeneratedAt] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [tableLoading, setTableLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  // Filters
  const [selectedState, setSelectedState] = useState<string>("All States")
  const [selectedSector, setSelectedSector] = useState<string>("All Sectors")
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL")
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>("ALL")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Fetch Dashboard Aggregates
  const loadDashboard = async () => {
    setLoading(true)
    setError(null)
    try {
      const filters: Record<string, string> = {}
      if (selectedState !== "All States") filters.state = selectedState
      if (selectedSector !== "All Sectors") filters.sector = selectedSector
      if (selectedStatus !== "ALL") filters.verification_status = selectedStatus
      if (selectedRiskLevel !== "ALL") filters.risk_level = selectedRiskLevel
      if (dateFrom) filters.date_from = dateFrom
      if (dateTo) filters.date_to = dateTo
      if (searchQuery) filters.search = searchQuery

      const data = await reportService.getDashboardSummary(filters)
      setDashboardData(data)
    } catch (err: any) {
      console.error("Failed to load oversight dashboard data:", err)
      setError(err?.message || "Failed to load dashboard metrics.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch Tabular Report Data
  const loadReportData = async (rtype: ReportType) => {
    setTableLoading(true)
    try {
      const filters: Record<string, string> = {}
      if (selectedState !== "All States") filters.state = selectedState
      if (selectedSector !== "All Sectors") filters.sector = selectedSector
      if (selectedStatus !== "ALL") filters.verification_status = selectedStatus
      if (selectedRiskLevel !== "ALL") filters.risk_level = selectedRiskLevel
      if (dateFrom) filters.date_from = dateFrom
      if (dateTo) filters.date_to = dateTo
      if (searchQuery) filters.search = searchQuery

      const res = await reportService.getReportData(rtype, filters)
      setReportResults(res.results || [])
      setReportCount(res.count || 0)
      setGeneratedAt(res.generated_at || "")
    } catch (err: any) {
      console.error("Failed to load report data:", err)
    } finally {
      setTableLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
    loadReportData(activeReport)
  }, [
    selectedState,
    selectedSector,
    selectedStatus,
    selectedRiskLevel,
    dateFrom,
    dateTo,
    activeReport,
  ])

  // Reset Filters
  const handleResetFilters = () => {
    setSelectedState("All States")
    setSelectedSector("All Sectors")
    setSelectedStatus("ALL")
    setSelectedRiskLevel("ALL")
    setDateFrom("")
    setDateTo("")
    setSearchQuery("")
  }

  // Handle Export CSV
  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const filters: Record<string, string> = {}
      if (selectedState !== "All States") filters.state = selectedState
      if (selectedSector !== "All Sectors") filters.sector = selectedSector
      if (selectedStatus !== "ALL") filters.verification_status = selectedStatus
      if (selectedRiskLevel !== "ALL") filters.risk_level = selectedRiskLevel
      if (dateFrom) filters.date_from = dateFrom
      if (dateTo) filters.date_to = dateTo
      if (searchQuery) filters.search = searchQuery

      await reportService.exportCsv(activeReport, filters)
    } catch (err: any) {
      alert("Failed to export report: " + (err?.message || "Network error"))
    } finally {
      setExporting(false)
    }
  }

  const formatCr = (val?: number) =>
    val != null ? `₹${val.toLocaleString("en-IN", { maximumFractionDigits: 1 })} Cr` : "₹0"

  const userScopeState = user?.state || "All Jurisdictions"

  return (
    <div style={{ padding: "24px 28px 48px", maxWidth: 1440, margin: "0 auto" }}>
      {/* Page Title Bar */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: "1.4rem" }}>📊</span>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--color-navy-800)",
              }}
            >
              Infrastructure Monitoring, Reporting & Oversight
            </h1>
            <span
              style={{
                fontSize: "0.72rem",
                background: "var(--color-navy-100)",
                color: "var(--color-navy-800)",
                padding: "2px 8px",
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              {isCitizen ? "Public Accountability Portal" : `Jurisdiction: ${userScopeState}`}
            </span>
          </div>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.82rem" }}>
            Multi-dimensional oversight: deterministic risk distributions, ML anomaly detection, site verifications, and corrective actions.
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          disabled={exporting}
          className="gov-button"
          style={{
            background: "var(--color-navy-800)",
            color: "white",
            padding: "8px 16px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "0.82rem",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 2px 6px rgba(26,48,104,0.18)",
            cursor: exporting ? "not-allowed" : "pointer",
            opacity: exporting ? 0.7 : 1,
          }}
        >
          <span>{exporting ? "⏳" : "📥"}</span>
          <span>{exporting ? "Generating CSV..." : "Export CSV Report"}</span>
        </button>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", borderRadius: 8, padding: "10px 16px", marginBottom: 16, color: "#991b1b", fontSize: "0.82rem" }}>
          ⚠️ {error}
        </div>
      )}

      {/* ===== SECTION 1: OVERSIGHT AGGREGATE DASHBOARD ===== */}
      <div style={{ marginBottom: 24 }}>
        {/* Row A: Financial & Project Totals */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 16 }}>
          {[
            {
              label: "Scoped Projects",
              value: dashboardData?.project_counts.total_projects ?? 0,
              icon: "📋",
              sub: isCitizen ? "Official Records" : "Active In Scope",
            },
            {
              label: "Sanctioned Cost",
              value: formatCr(dashboardData?.project_counts.total_original_cost_cr),
              icon: "💰",
              sub: "Original Sanctions",
            },
            {
              label: "Revised Cost",
              value: formatCr(dashboardData?.project_counts.total_revised_cost_cr),
              icon: "📊",
              sub: "Latest Approved",
            },
            {
              label: "Expenditure Spent",
              value: formatCr(dashboardData?.project_counts.total_expenditure_cr),
              icon: "📈",
              sub: `Avg Progress: ${dashboardData?.project_counts.average_progress_pct ?? 0}%`,
            },
            {
              label: "Verified Projects",
              value: dashboardData?.verification_distribution.verified ?? 0,
              icon: "✅",
              sub: "Site Audited",
            },
            {
              label: isCitizen ? "Public Oversight" : "Access Scope",
              value: isCitizen ? "Citizen" : (dashboardData?.user_scope.role || "Official"),
              icon: "🏛️",
              sub: "MoSPI Database",
            },
          ].map((stat, i) => (
            <div
              key={stat.label}
              className="gov-card"
              style={{
                padding: "14px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
                borderLeft: i === 0 ? "3px solid var(--color-navy-700)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                  {stat.label}
                </span>
                <span style={{ fontSize: "0.9rem" }}>{stat.icon}</span>
              </div>
              <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "var(--color-navy-900)", fontFamily: "var(--font-display)" }}>
                {loading ? "..." : stat.value}
              </div>
              <div style={{ fontSize: "0.68rem", color: "var(--color-text-secondary)", opacity: 0.8 }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Row B: 4 Multi-Dimensional Distributions (Strictly Separated!) */}
        <div style={{ display: "grid", gridTemplateColumns: isCitizen ? "1fr 1fr" : "repeat(4, 1fr)", gap: 14 }}>
          {/* Card 1: Rule-Based Risk Engine */}
          {!isCitizen && (
            <div className="gov-card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-navy-800)" }}>
                  🎯 Rule Risk Engine
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>v1.1 Deterministic</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "#fee2e2", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#991b1b", fontWeight: 600 }}>Critical / High</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#991b1b" }}>
                    {(dashboardData?.risk_distribution.critical ?? 0) + (dashboardData?.risk_distribution.high ?? 0)}
                  </div>
                </div>
                <div style={{ background: "#fef3c7", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#92400e", fontWeight: 600 }}>Medium Risk</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#92400e" }}>
                    {dashboardData?.risk_distribution.medium ?? 0}
                  </div>
                </div>
                <div style={{ background: "#ecfdf5", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#065f46", fontWeight: 600 }}>Low Risk</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46" }}>
                    {dashboardData?.risk_distribution.low ?? 0}
                  </div>
                </div>
                <div style={{ background: "#f1f5f9", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 600 }}>Unassessed</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#475569" }}>
                    {dashboardData?.risk_distribution.unassessed ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: ML Isolation Forest */}
          {!isCitizen && (
            <div className="gov-card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-navy-800)" }}>
                  🤖 ML Isolation Forest
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>v1.0 Anomaly</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "#f3e8ff", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#6b21a8", fontWeight: 600 }}>Anomalous Outlier</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#6b21a8" }}>
                    {dashboardData?.ml_anomaly_distribution.anomalous ?? 0}
                  </div>
                </div>
                <div style={{ background: "#ecfdf5", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#065f46", fontWeight: 600 }}>Normal Profile</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46" }}>
                    {dashboardData?.ml_anomaly_distribution.normal ?? 0}
                  </div>
                </div>
                <div style={{ background: "#f1f5f9", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 600 }}>Insufficient Data</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#475569" }}>
                    {dashboardData?.ml_anomaly_distribution.insufficient_data ?? 0}
                  </div>
                </div>
                <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Unassessed</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#64748b" }}>
                    {dashboardData?.ml_anomaly_distribution.unassessed ?? 0}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card 3: Site Verification Status */}
          <div className="gov-card" style={{ padding: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-navy-800)" }}>
                📋 Site Verifications
              </span>
              <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>Audit Status</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <div style={{ background: "#ecfdf5", padding: "8px 10px", borderRadius: 6 }}>
                <div style={{ fontSize: "0.68rem", color: "#065f46", fontWeight: 600 }}>Verified Clear</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46" }}>
                  {dashboardData?.verification_distribution.verified ?? 0}
                </div>
              </div>
              <div style={{ background: "#eff6ff", padding: "8px 10px", borderRadius: 6 }}>
                <div style={{ fontSize: "0.68rem", color: "#1e40af", fontWeight: 600 }}>In Review</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e40af" }}>
                  {dashboardData?.verification_distribution.in_review ?? 0}
                </div>
              </div>
              <div style={{ background: "#f1f5f9", padding: "8px 10px", borderRadius: 6 }}>
                <div style={{ fontSize: "0.68rem", color: "#475569", fontWeight: 600 }}>Not Reviewed</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#475569" }}>
                  {dashboardData?.verification_distribution.not_reviewed ?? 0}
                </div>
              </div>
              <div style={{ background: "#f8fafc", padding: "8px 10px", borderRadius: 6 }}>
                <div style={{ fontSize: "0.68rem", color: "#64748b", fontWeight: 600 }}>Closed Audit</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#64748b" }}>
                  {dashboardData?.verification_distribution.closed ?? 0}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Corrective Actions Lifecycle */}
          {!isCitizen ? (
            <div className="gov-card" style={{ padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "var(--color-navy-800)" }}>
                  ⚡ Corrective Actions
                </span>
                <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>Lifecycle</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div style={{ background: "#eff6ff", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#1e40af", fontWeight: 600 }}>Active / Open</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#1e40af" }}>
                    {dashboardData?.corrective_actions_summary.open ?? 0}
                  </div>
                </div>
                <div style={{ background: "#fef3c7", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#92400e", fontWeight: 600 }}>Awaiting Review</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#92400e" }}>
                    {dashboardData?.corrective_actions_summary.awaiting_review ?? 0}
                  </div>
                </div>
                <div style={{ background: "#ecfdf5", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#065f46", fontWeight: 600 }}>Closed / Resolved</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#065f46" }}>
                    {dashboardData?.corrective_actions_summary.closed ?? 0}
                  </div>
                </div>
                <div style={{ background: "#fee2e2", padding: "8px 10px", borderRadius: 6 }}>
                  <div style={{ fontSize: "0.68rem", color: "#991b1b", fontWeight: 600 }}>Overdue Flags</div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "#991b1b" }}>
                    {dashboardData?.corrective_actions_summary.overdue ?? 0}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="gov-card" style={{ padding: "16px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-navy-800)", marginBottom: 6 }}>
                📢 Citizen Oversight Notice
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                Public accountability metrics are aggregated from official MoSPI releases. Citizens can review physical progress against sanctioned funds across all priority states.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ===== SECTION 2: AUTHORIZED FILTER BAR ===== */}
      <div
        className="gov-card"
        style={{
          padding: "16px 20px",
          marginBottom: 20,
          background: "#f8fafc",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "0.9rem" }}>🔍</span>
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-navy-800)" }}>
              Authorized Filters & Scope Boundaries
            </span>
          </div>
          <button
            onClick={handleResetFilters}
            style={{
              background: "transparent",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: "0.72rem",
              color: "var(--color-text-muted)",
              cursor: "pointer",
            }}
          >
            Clear Filters
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr) 1.5fr", gap: 10, marginBottom: 10 }}>
          {/* State */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 3 }}>
              State Jurisdiction
            </label>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.76rem" }}
            >
              {(dashboardData?.filter_options.states || ["All States"]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sector */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 3 }}>
              Sector / Department
            </label>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.76rem" }}
            >
              {(dashboardData?.filter_options.sectors || ["All Sectors"]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Verification Status */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 3 }}>
              Verification Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.76rem" }}
            >
              {(dashboardData?.filter_options.statuses || ["ALL"]).map((st) => (
                <option key={st} value={st}>{st === "ALL" ? "All Verification Statuses" : st}</option>
              ))}
            </select>
          </div>

          {/* Risk Level (Internal) */}
          {!isCitizen ? (
            <div>
              <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 3 }}>
                Deterministic Risk Level
              </label>
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.76rem" }}
              >
                {(dashboardData?.filter_options.risk_levels || ["ALL"]).map((r) => (
                  <option key={r} value={r}>{r === "ALL" ? "All Risk Levels" : r}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 3 }}>
                Data Source Provenance
              </label>
              <div style={{ padding: "6px 8px", borderRadius: 6, background: "#f1f5f9", fontSize: "0.76rem", color: "#334155", fontWeight: 600 }}>
                Official Verified Public Records
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div>
            <label style={{ display: "block", fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 3 }}>
              Search Filter
            </label>
            <input
              type="text"
              placeholder="Search by ID, Name, or State..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  loadDashboard()
                  loadReportData(activeReport)
                }
              }}
              style={{ width: "100%", padding: "6px 10px", borderRadius: 6, border: "1px solid var(--color-border)", fontSize: "0.76rem" }}
            />
          </div>
        </div>

        {/* Date boundary & Data source type */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, paddingTop: 6, borderTop: "1px dashed var(--color-border)", fontSize: "0.72rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Reporting Date From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--color-border)", fontSize: "0.72rem" }}
            />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "var(--color-text-muted)", fontWeight: 600 }}>Date To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid var(--color-border)", fontSize: "0.72rem" }}
            />
          </div>
        </div>
      </div>

      {/* ===== SECTION 3: REPORT SELECTION TABS ===== */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, borderBottom: "1.5px solid var(--color-border)", paddingBottom: 8 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {!isCitizen ? (
            <>
              <button
                onClick={() => setActiveReport("risk_assessments")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px 6px 0 0",
                  fontWeight: activeReport === "risk_assessments" ? 700 : 500,
                  fontSize: "0.8rem",
                  border: "none",
                  cursor: "pointer",
                  background: activeReport === "risk_assessments" ? "var(--color-navy-800)" : "transparent",
                  color: activeReport === "risk_assessments" ? "white" : "var(--color-navy-700)",
                }}
              >
                📋 Risk Assessments Registry
              </button>

              <button
                onClick={() => setActiveReport("unresolved_findings")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px 6px 0 0",
                  fontWeight: activeReport === "unresolved_findings" ? 700 : 500,
                  fontSize: "0.8rem",
                  border: "none",
                  cursor: "pointer",
                  background: activeReport === "unresolved_findings" ? "var(--color-navy-800)" : "transparent",
                  color: activeReport === "unresolved_findings" ? "white" : "var(--color-navy-700)",
                }}
              >
                ⚠️ Unresolved Findings
              </button>

              <button
                onClick={() => setActiveReport("overdue_actions")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px 6px 0 0",
                  fontWeight: activeReport === "overdue_actions" ? 700 : 500,
                  fontSize: "0.8rem",
                  border: "none",
                  cursor: "pointer",
                  background: activeReport === "overdue_actions" ? "var(--color-navy-800)" : "transparent",
                  color: activeReport === "overdue_actions" ? "white" : "var(--color-navy-700)",
                }}
              >
                ⏱️ Overdue Actions
              </button>

              <button
                onClick={() => setActiveReport("pending_reviews")}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px 6px 0 0",
                  fontWeight: activeReport === "pending_reviews" ? 700 : 500,
                  fontSize: "0.8rem",
                  border: "none",
                  cursor: "pointer",
                  background: activeReport === "pending_reviews" ? "var(--color-navy-800)" : "transparent",
                  color: activeReport === "pending_reviews" ? "white" : "var(--color-navy-700)",
                }}
              >
                🔎 Pending Reviews
              </button>
            </>
          ) : (
            <button
              onClick={() => setActiveReport("public_oversight")}
              style={{
                padding: "8px 16px",
                borderRadius: "6px 6px 0 0",
                fontWeight: 700,
                fontSize: "0.8rem",
                border: "none",
                background: "var(--color-navy-800)",
                color: "white",
              }}
            >
              🏛️ Public Infrastructure Transparency Report
            </button>
          )}
        </div>

        <div style={{ fontSize: "0.74rem", color: "var(--color-text-muted)" }}>
          Showing <strong>{reportCount}</strong> records · Generated: {generatedAt ? new Date(generatedAt).toLocaleTimeString() : "Just now"}
        </div>
      </div>

      {/* ===== SECTION 4: TABULAR REPORT CONTENT ===== */}
      <div className="gov-card" style={{ overflow: "hidden", marginBottom: 20 }}>
        {tableLoading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            ⏳ Loading report records...
          </div>
        ) : reportResults.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <div style={{ fontSize: "1.8rem", marginBottom: 8 }}>📭</div>
            <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>No matching records found</div>
            <p style={{ fontSize: "0.78rem", marginTop: 4 }}>
              Try loosening filter criteria or clearing date boundaries.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="gov-table">
              <thead>
                <tr>
                  {/* Tab 1: Risk Assessments Registry */}
                  {activeReport === "risk_assessments" && (
                    <>
                      <th style={{ paddingLeft: 16 }}>Project ID & Name</th>
                      <th>Location</th>
                      <th>Sector</th>
                      <th>Provenance</th>
                      <th>Sanctioned (Cr)</th>
                      <th>Expenditure (Cr)</th>
                      <th>Progress</th>
                      <th>Rule Risk</th>
                      <th>Triggered Rules</th>
                      <th>ML Anomaly</th>
                      <th>Verification</th>
                      <th>Source Date</th>
                    </>
                  )}

                  {/* Tab 2: Overdue Actions */}
                  {activeReport === "overdue_actions" && (
                    <>
                      <th style={{ paddingLeft: 16 }}>Action ID</th>
                      <th>Project</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Assignee / Agency</th>
                      <th>Target Due Date</th>
                      <th>Days Overdue</th>
                      <th>Status</th>
                    </>
                  )}

                  {/* Tab 3: Pending Reviews */}
                  {activeReport === "pending_reviews" && (
                    <>
                      <th style={{ paddingLeft: 16 }}>Item ID</th>
                      <th>Type</th>
                      <th>Project</th>
                      <th>Submitted By</th>
                      <th>Submitted Date</th>
                      <th>Summary / Observation</th>
                      <th>Status</th>
                    </>
                  )}

                  {/* Tab 4: Unresolved Findings */}
                  {activeReport === "unresolved_findings" && (
                    <>
                      <th style={{ paddingLeft: 16 }}>Project ID & Name</th>
                      <th>Location</th>
                      <th>Sector</th>
                      <th>Rule Risk Score</th>
                      <th>ML Anomaly</th>
                      <th>Triggered Violations</th>
                      <th>Open Actions</th>
                      <th>Verification Status</th>
                      <th>Source Date</th>
                    </>
                  )}

                  {/* Tab 5: Public Oversight */}
                  {activeReport === "public_oversight" && (
                    <>
                      <th style={{ paddingLeft: 16 }}>Project ID & Name</th>
                      <th>Location</th>
                      <th>Sector</th>
                      <th>Sanctioned Budget</th>
                      <th>Revised Budget</th>
                      <th>Expenditure</th>
                      <th>Reported Progress</th>
                      <th>Verification Status</th>
                      <th>Source Agency</th>
                      <th>Published As-Of</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {reportResults.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    {/* Render Tab 1 */}
                    {activeReport === "risk_assessments" && (
                      <>
                        <td style={{ paddingLeft: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.76rem", color: "var(--color-navy-800)" }}>{r.project_id}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", maxWidth: 180 }} className="truncate" title={r.project_name}>
                            {r.project_name}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.76rem" }}>{r.state}</td>
                        <td style={{ fontSize: "0.76rem" }}>{r.sector}</td>
                        <td>
                          <span style={{
                            fontSize: "0.66rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "#ecfdf5",
                            color: "#065f46",
                          }}>
                            Official
                          </span>
                        </td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>₹{r.original_cost_cr?.toLocaleString()}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>₹{r.expenditure_cr?.toLocaleString()}</td>
                        <td style={{ fontSize: "0.76rem", fontWeight: 600 }}>{r.reported_progress_pct}%</td>
                        <td>
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.rule_risk_level === "High" || r.rule_risk_level === "Critical" ? "#fee2e2" : r.rule_risk_level === "Medium" ? "#fef3c7" : r.rule_risk_level === "Low" ? "#ecfdf5" : "#f1f5f9",
                            color: r.rule_risk_level === "High" || r.rule_risk_level === "Critical" ? "#991b1b" : r.rule_risk_level === "Medium" ? "#92400e" : r.rule_risk_level === "Low" ? "#065f46" : "#475569",
                          }}>
                            {r.rule_risk_score != null ? `${r.rule_risk_score} pts (${r.rule_risk_level})` : "UNASSESSED"}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", maxWidth: 160 }} className="truncate" title={r.rules_triggered_summary}>
                          {r.rules_triggered_summary || "None"}
                        </td>
                        <td>
                          <span style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.ml_category === "ANOMALOUS" ? "#f3e8ff" : r.ml_category === "NORMAL" ? "#ecfdf5" : "#f1f5f9",
                            color: r.ml_category === "ANOMALOUS" ? "#6b21a8" : r.ml_category === "NORMAL" ? "#065f46" : "#475569",
                          }}>
                            {r.ml_category}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.verification_status === "VERIFIED" ? "#ecfdf5" : r.verification_status === "IN_REVIEW" ? "#eff6ff" : "#f1f5f9",
                            color: r.verification_status === "VERIFIED" ? "#065f46" : r.verification_status === "IN_REVIEW" ? "#1e40af" : "#475569",
                          }}>
                            {r.verification_status}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{r.source_as_of_date}</td>
                      </>
                    )}

                    {/* Render Tab 2 */}
                    {activeReport === "overdue_actions" && (
                      <>
                        <td style={{ paddingLeft: 16, fontWeight: 700, fontSize: "0.76rem", color: "var(--color-navy-800)" }}>{r.action_id}</td>
                        <td style={{ fontSize: "0.76rem" }}>
                          <div style={{ fontWeight: 600 }}>{r.project_id}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{r.state}</div>
                        </td>
                        <td style={{ fontSize: "0.76rem", maxWidth: 180 }} className="truncate" title={r.title}>{r.title}</td>
                        <td>
                          <span style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.priority === "HIGH" || r.priority === "CRITICAL" ? "#fee2e2" : "#fef3c7",
                            color: r.priority === "HIGH" || r.priority === "CRITICAL" ? "#991b1b" : "#92400e",
                          }}>
                            {r.priority}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.74rem" }}>
                          <div>{r.assigned_to}</div>
                          <div style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>{r.assigned_agency}</div>
                        </td>
                        <td style={{ fontSize: "0.74rem", color: "#991b1b", fontWeight: 600 }}>{r.due_date?.slice(0, 10)}</td>
                        <td>
                          <span style={{ background: "#dc2626", color: "white", padding: "2px 8px", borderRadius: 10, fontSize: "0.68rem", fontWeight: 700 }}>
                            {Math.abs(r.days_remaining || 0)} Days Overdue
                          </span>
                        </td>
                        <td style={{ fontSize: "0.74rem", fontWeight: 600 }}>{r.status}</td>
                      </>
                    )}

                    {/* Render Tab 3 */}
                    {activeReport === "pending_reviews" && (
                      <>
                        <td style={{ paddingLeft: 16, fontWeight: 700, fontSize: "0.76rem", color: "var(--color-navy-800)" }}>{r.item_id}</td>
                        <td style={{ fontSize: "0.74rem" }}>
                          <span style={{ padding: "2px 6px", borderRadius: 4, background: "#f1f5f9", fontWeight: 600 }}>
                            {r.item_type}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.76rem" }}>
                          <div style={{ fontWeight: 600 }}>{r.project_id}</div>
                          <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{r.state}</div>
                        </td>
                        <td style={{ fontSize: "0.74rem" }}>{r.submitted_by}</td>
                        <td style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{r.submitted_at?.slice(0, 10)}</td>
                        <td style={{ fontSize: "0.74rem", maxWidth: 220 }} className="truncate" title={r.notes_or_summary}>
                          {r.notes_or_summary}
                        </td>
                        <td>
                          <span style={{ background: "#fef3c7", color: "#92400e", padding: "2px 8px", borderRadius: 6, fontSize: "0.7rem", fontWeight: 700 }}>
                            {r.status}
                          </span>
                        </td>
                      </>
                    )}

                    {/* Render Tab 4 */}
                    {activeReport === "unresolved_findings" && (
                      <>
                        <td style={{ paddingLeft: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.76rem", color: "var(--color-navy-800)" }}>{r.project_id}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", maxWidth: 180 }} className="truncate" title={r.project_name}>
                            {r.project_name}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.76rem" }}>{r.state}</td>
                        <td style={{ fontSize: "0.76rem" }}>{r.sector}</td>
                        <td>
                          <span style={{
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.rule_risk_level === "High" || r.rule_risk_level === "Critical" ? "#fee2e2" : "#fef3c7",
                            color: r.rule_risk_level === "High" || r.rule_risk_level === "Critical" ? "#991b1b" : "#92400e",
                          }}>
                            {r.rule_risk_score} pts ({r.rule_risk_level})
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.ml_category === "ANOMALOUS" ? "#f3e8ff" : "#ecfdf5",
                            color: r.ml_category === "ANOMALOUS" ? "#6b21a8" : "#065f46",
                          }}>
                            {r.ml_category} ({r.ml_anomaly_score})
                          </span>
                        </td>
                        <td style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", maxWidth: 160 }} className="truncate" title={r.rules_triggered_summary}>
                          {r.rules_triggered_summary}
                        </td>
                        <td style={{ fontSize: "0.76rem", fontWeight: 700, color: r.open_actions_count > 0 ? "var(--color-navy-800)" : "#94a3b8" }}>
                          {r.open_actions_count} Action(s)
                        </td>
                        <td>
                          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "#fee2e2", color: "#991b1b" }}>
                            {r.verification_status}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{r.source_as_of_date}</td>
                      </>
                    )}

                    {/* Render Tab 5 */}
                    {activeReport === "public_oversight" && (
                      <>
                        <td style={{ paddingLeft: 16 }}>
                          <div style={{ fontWeight: 700, fontSize: "0.76rem", color: "var(--color-navy-800)" }}>{r.project_id}</div>
                          <div style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", maxWidth: 180 }} className="truncate" title={r.project_name}>
                            {r.project_name}
                          </div>
                        </td>
                        <td style={{ fontSize: "0.76rem" }}>{r.state}</td>
                        <td style={{ fontSize: "0.76rem" }}>{r.sector}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>₹{r.original_cost_cr?.toLocaleString()} Cr</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>₹{r.revised_cost_cr?.toLocaleString()} Cr</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.76rem" }}>₹{r.expenditure_cr?.toLocaleString()} Cr</td>
                        <td style={{ fontSize: "0.76rem", fontWeight: 700, color: "var(--color-navy-800)" }}>{r.reported_progress_pct}%</td>
                        <td>
                          <span style={{
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: r.verification_status === "VERIFIED" ? "#ecfdf5" : "#f1f5f9",
                            color: r.verification_status === "VERIFIED" ? "#065f46" : "#475569",
                          }}>
                            {r.verification_status}
                          </span>
                        </td>
                        <td style={{ fontSize: "0.72rem" }}>{r.source_agency}</td>
                        <td style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{r.source_as_of_date}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== SECTION 5: DATA PROVENANCE & FOOTER AUDIT NOTICE ===== */}
      <div
        className="gov-card"
        style={{
          padding: "16px 20px",
          background: "#f8fafc",
          border: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.74rem",
          color: "var(--color-text-muted)",
        }}
      >
        <div>
          <strong>Data Provenance:</strong> {dashboardData?.data_provenance.official_source || "Ministry of Statistics & Programme Implementation (MoSPI PAIMANA)"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span>Available Reporting As-Of Dates: {dashboardData?.data_provenance.reporting_dates_available.join(", ") || "2026-09-24"}</span>
          <span style={{ color: "var(--color-border)" }}>|</span>
          <span style={{ fontWeight: 600, color: "var(--color-navy-700)" }}>Project Drishti Oversight v2.0</span>
        </div>
      </div>
    </div>
  )
}
