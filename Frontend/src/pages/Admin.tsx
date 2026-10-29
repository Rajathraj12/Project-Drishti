import React, { useState, useEffect, useCallback, useMemo } from "react"
import { adminService, SystemHealth, AdminSettings, DepartmentMetric } from "../services/adminService"
import { User } from "../types"

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "settings">("users")
  
  // Live Data States
  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<DepartmentMetric[]>([])
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [settings, setSettings] = useState<AdminSettings>({
    risk_delay_threshold_pct: 20,
    notify_high_risk_email: true,
    notify_inspection_hours: 48,
    weekly_digest_enabled: true,
    ai_confidence_threshold_pct: 85,
  })

  // UI & Loading States
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null)
  const [savingSettings, setSavingSettings] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  
  // Filter States: Default to "OFFICERS" so verified government officers with emails are immediately shown
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("OFFICERS")
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Modern Delete confirmation modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  // New user form state
  const [newName, setNewName] = useState("")
  const [newUsername, setNewUsername] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("GOVERNMENT_OFFICER")
  const [newDept, setNewDept] = useState("Ministry of Road Transport & Highways (MoRTH)")
  const [modalSubmitting, setModalSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev))
    }, 4000)
  }

  // Load all real data from backend
  const loadRealData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [usersData, deptData, healthData, settingsData] = await Promise.allSettled([
        adminService.getUsers(),
        adminService.getDepartmentMetrics(),
        adminService.getSystemHealth(),
        adminService.getSettings(),
      ])

      if (usersData.status === "fulfilled") {
        // Keep only accounts with valid emails
        const validUsers = usersData.value.results.filter(
          (u) => u.email && u.email.includes("@") && !u.username?.startsWith("dev_user_")
        )
        setUsers(validUsers)
      }
      if (deptData.status === "fulfilled") {
        setDepartments(deptData.value)
      }
      if (healthData.status === "fulfilled") {
        setHealth(healthData.value)
      }
      if (settingsData.status === "fulfilled") {
        setSettings(settingsData.value)
      }
    } catch (err) {
      console.error("Failed to load real admin data:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadRealData()
  }, [loadRealData])

  // Toggle user active/inactive in real database
  const toggleStatus = async (user: User) => {
    const nextStatus = !user.is_active
    setActionLoadingId(user.id)
    try {
      const updated = await adminService.updateUser(user.id, { is_active: nextStatus })
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_active: updated.is_active } : u))
      )
      showToast(`Account for ${user.email} is now ${nextStatus ? "Active" : "Inactive"}.`)
    } catch (err: any) {
      console.error("Status toggle error:", err)
      showToast(`Failed to update status: ${err.message || "Network error"}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  // Confirm and delete user from database and MongoDB
  const handleConfirmDelete = async () => {
    if (!userToDelete) return

    setIsDeleting(true)
    try {
      await adminService.deleteUser(userToDelete.id)
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
      showToast(`Officer account (${userToDelete.email}) permanently deleted.`)
      setUserToDelete(null)
      setDeleteConfirmText("")
    } catch (err: any) {
      console.error("Delete user error:", err)
      showToast(`Failed to delete officer: ${err.message || "Error"}`)
    } finally {
      setIsDeleting(false)
    }
  }

  // Add new official user to database
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmail.trim() || !newEmail.includes("@")) {
      setModalError("A valid official email address is required.")
      return
    }

    setModalSubmitting(true)
    setModalError(null)

    const nameParts = newName.trim().split(" ")
    const firstName = nameParts[0] || ""
    const lastName = nameParts.slice(1).join(" ") || ""
    const username = newUsername.trim() || newEmail.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_")

    try {
      const created = await adminService.createUser({
        username,
        email: newEmail.trim().toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        role: newRole as any,
        department: newDept,
        password: newName.trim(),
        is_active: true,
      })

      setUsers((prev) => [created, ...prev])
      showToast(`Account created in MongoDB & Central DB! Password is "${newName.trim()}".`)
      setIsModalOpen(false)
      setNewName("")
      setNewUsername("")
      setNewEmail("")
    } catch (err: any) {
      console.error("Failed to add user:", err)
      setModalError(err.message || "Failed to create official account in database.")
    } finally {
      setModalSubmitting(false)
    }
  }

  // Save settings to backend
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const res = await adminService.saveSettings(settings)
      setSettings(res.settings)
      showToast("Risk engine thresholds & alert policies saved to system database!")
    } catch (err: any) {
      console.error("Save settings error:", err)
      showToast(`Failed to save settings: ${err.message || "Error"}`)
    } finally {
      setSavingSettings(false)
    }
  }

  // Officers count
  const officersCount = useMemo(() => {
    return users.filter(
      (u) => u.role === "ADMIN" || u.role === "GOVERNMENT_OFFICER" || u.role === "FIELD_OFFICER"
    ).length
  }, [users])

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Must have valid email
      if (!u.email || !u.email.includes("@")) return false

      const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase()
      const email = (u.email || "").toLowerCase()
      const username = (u.username || "").toLowerCase()
      const dept = (u.department || "").toLowerCase()
      const q = search.toLowerCase()

      const matchesSearch =
        fullName.includes(q) || email.includes(q) || username.includes(q) || dept.includes(q)

      let matchesRole = true
      if (roleFilter === "OFFICERS") {
        matchesRole =
          u.role === "ADMIN" || u.role === "GOVERNMENT_OFFICER" || u.role === "FIELD_OFFICER"
      } else if (roleFilter !== "ALL") {
        matchesRole = u.role === roleFilter
      }

      return matchesSearch && matchesRole
    })
  }, [users, search, roleFilter])

  // Role visual helper
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-indigo-50 text-indigo-700 border-indigo-200"
      case "GOVERNMENT_OFFICER":
        return "bg-emerald-50 text-emerald-700 border-emerald-200"
      case "FIELD_OFFICER":
        return "bg-amber-50 text-amber-700 border-amber-200"
      case "CITIZEN":
        return "bg-blue-50 text-blue-700 border-blue-200"
      default:
        return "bg-slate-50 text-slate-700 border-slate-200"
    }
  }

  const formatRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrator"
      case "GOVERNMENT_OFFICER":
        return "Government Officer"
      case "FIELD_OFFICER":
        return "Field Inspector"
      case "CITIZEN":
        return "Citizen Auditor"
      default:
        return role
    }
  }

  const totalBudgetSum = departments.reduce((acc, d) => acc + d.rawBudgetCr, 0)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-navy-900 text-white px-5 py-3 rounded-xl shadow-2xl border border-navy-700 text-sm flex items-center gap-3 animate-fade-in">
          <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-slate-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Header with Clean Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-navy-900 font-display">Admin Portal</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Central Oversight Active
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            National officer directory, departmental analytics, and project governance settings.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => loadRealData(true)}
            disabled={refreshing}
            className="p-2 text-slate-600 hover:text-navy-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold"
            title="Refresh personnel directory"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin text-navy-700" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {activeTab === "users" && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add Officer</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Officers */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Active Officers &amp; Staff</div>
              <div className="text-2xl font-bold text-navy-900 mt-1">
                {loading ? "..." : officersCount}
              </div>
              <div className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {users.filter((u) => u.is_active !== false && u.role !== "CITIZEN").length} verified official email accounts
              </div>
            </div>
            <div className="p-2.5 bg-navy-50 text-navy-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 2: Departments & Projects */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-slate-500 font-semibold tracking-wide uppercase">Monitored Sectors &amp; Wings</div>
              <div className="text-2xl font-bold text-navy-900 mt-1">
                {loading ? "..." : departments.length}
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium">
                {health?.monitored_projects ?? 69} active national infrastructure projects
              </div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </div>

        {/* Card 3: System Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-xs text-slate-500 font-semibold tracking-wide uppercase">System Status</div>
              <div className="text-2xl font-bold text-emerald-600 mt-1 flex items-center gap-2">
                Operational
              </div>
              <div className="text-xs text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                All Central Government Services Online
              </div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "users"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Official Personnel &amp; Officers ({filteredUsers.length})
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "departments"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Departments &amp; Wings ({departments.length})
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "settings"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          System &amp; Risk Settings
        </button>
      </div>

      {/* TAB 1: USERS (OFFICIAL OFFICERS WITH EMAILS) */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search officer by name, email, department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs font-semibold text-slate-500 hidden sm:inline">Filter By:</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white font-medium text-slate-700"
              >
                <option value="OFFICERS">All Officers &amp; Staff ({officersCount})</option>
                <option value="GOVERNMENT_OFFICER">Government Officers</option>
                <option value="FIELD_OFFICER">Field Inspectors</option>
                <option value="ADMIN">System Administrators</option>
                <option value="CITIZEN">Citizen Auditors</option>
                <option value="ALL">All Registered Users ({users.length})</option>
              </select>
            </div>
          </div>

          {/* Officers Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Officer Identity</th>
                    <th className="py-3 px-4">Official Email Address</th>
                    <th className="py-3 px-4">Role / Scope</th>
                    <th className="py-3 px-4">Department / Ministry</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <svg className="w-6 h-6 animate-spin text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Loading official directory...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        No officer accounts found matching your query.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isActive = user.is_active !== false
                      const displayName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "Officer"
                      const isPendingAction = actionLoadingId === user.id

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                          {/* Name & Username */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-navy-900 flex items-center gap-2">
                              {displayName}
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              @{user.username || user.email?.split("@")[0]}
                            </div>
                          </td>

                          {/* Email Column - Prominently Displayed */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-navy-900 font-medium">
                              <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span className="font-mono text-xs">{user.email}</span>
                            </div>
                            {user.state && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Jurisdiction: {user.state} {user.district ? `(${user.district})` : ""}
                              </div>
                            )}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <span
                              className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadge(
                                user.role
                              )}`}
                            >
                              {formatRoleLabel(user.role)}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 text-slate-700 text-xs font-medium max-w-xs">
                            {user.department || "General Administration"}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : "bg-slate-100 text-slate-500 border-slate-200"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isActive ? "bg-emerald-500" : "bg-slate-400"
                                }`}
                              ></span>
                              {isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => toggleStatus(user)}
                                disabled={isPendingAction}
                                className={`text-xs font-semibold px-3 py-1 rounded-lg border transition-all ${
                                  isActive
                                    ? "text-rose-600 hover:bg-rose-50 border-rose-200 hover:border-rose-300"
                                    : "text-emerald-700 hover:bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                                }`}
                              >
                                {isPendingAction ? "Saving..." : isActive ? "Deactivate" : "Activate"}
                              </button>
                              
                              <button
                                onClick={() => {
                                  setUserToDelete(user)
                                  setDeleteConfirmText("")
                                }}
                                disabled={isPendingAction}
                                title="Delete account"
                                className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div>
              <h2 className="text-sm font-bold text-navy-900">National Capital Outlay by Executing Sector</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aggregated in real-time from active project records recorded in the national infrastructure registry.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 uppercase font-semibold">Total Portfolio Outlay</span>
              <div className="text-lg font-bold text-navy-900">
                ₹{(totalBudgetSum / 1000).toFixed(1)}k Cr
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {departments.map((dept) => {
              const pctOfTotal = totalBudgetSum > 0 ? (dept.rawBudgetCr / totalBudgetSum) * 100 : 0

              return (
                <div key={dept.name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="font-bold text-navy-900 text-base">{dept.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Executing Wing / Ministry Division</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-navy-50 text-navy-700 shrink-0">
                      {pctOfTotal.toFixed(1)}% of Budget
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-navy-700 h-1.5 rounded-full"
                      style={{ width: `${Math.max(5, pctOfTotal)}%` }}
                    ></div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
                    <div>
                      <div className="text-xl font-bold text-navy-800">{dept.projects}</div>
                      <div className="text-xs text-slate-500 font-medium">Projects</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-navy-800">{dept.budget}</div>
                      <div className="text-xs text-slate-500 font-medium">Budget Outlay</div>
                    </div>
                    <div>
                      <div className="text-xl font-bold text-navy-800">{dept.officers}</div>
                      <div className="text-xs text-slate-500 font-medium">Engineers</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-navy-900 text-base flex items-center gap-2">
              <svg className="w-4 h-4 text-navy-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Automated Alert Dispatch Settings
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Control automated alert triggers for delayed and high-risk projects.</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notify_high_risk_email}
                  onChange={(e) => setSettings({ ...settings, notify_high_risk_email: e.target.checked })}
                  className="w-4 h-4 rounded text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm text-slate-700">Email alerts to inspecting engineers for High Risk project milestone delays</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.weekly_digest_enabled}
                  onChange={(e) => setSettings({ ...settings, weekly_digest_enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-navy-700 focus:ring-navy-600"
                />
                <span className="text-sm text-slate-700">Weekly progress and expenditure anomaly digest to Department Heads</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-navy-900 text-base">Risk Delay Engine Threshold</h3>
            <p className="text-xs text-slate-500 mt-0.5">Projects above this delay percentage are automatically categorized as High Risk.</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={5}
                max={100}
                value={settings.risk_delay_threshold_pct}
                onChange={(e) => setSettings({ ...settings, risk_delay_threshold_pct: Number(e.target.value) })}
                className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 font-semibold text-navy-900"
              />
              <span className="text-sm text-slate-600 font-medium">% progress delay threshold</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-navy-900 text-base">Advance Inspection Notice</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automated notice sent to on-site field engineers before scheduled verification.</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                min={12}
                max={168}
                value={settings.notify_inspection_hours}
                onChange={(e) => setSettings({ ...settings, notify_inspection_hours: Number(e.target.value) })}
                className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 font-semibold text-navy-900"
              />
              <span className="text-sm text-slate-600 font-medium">hours prior to site visit</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors shadow-sm flex items-center gap-2"
            >
              {savingSettings ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Saving to Database...</span>
                </>
              ) : (
                <span>Save Settings</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* ADD OFFICER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-navy-900 text-base">Provision Official Officer Account</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
              >
                &times;
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
                {modalError}
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Official Government Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh.kumar@morth.gov.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">System Username (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ramesh_kumar"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Role &amp; Authorization Level</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white font-medium"
                >
                  <option value="GOVERNMENT_OFFICER">Government Officer (Ministry / State Oversight)</option>
                  <option value="FIELD_OFFICER">Field Inspector (On-Site Verification)</option>
                  <option value="ADMIN">System Administrator (National PMO)</option>
                  <option value="CITIZEN">Citizen Auditor</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Assigned Department / Ministry</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white font-medium"
                >
                  <option value="Ministry of Road Transport & Highways (MoRTH)">Ministry of Road Transport & Highways (MoRTH)</option>
                  <option value="National Highways Authority of India (NHAI)">National Highways Authority of India (NHAI)</option>
                  <option value="Public Works Department (PWD)">Public Works Department (PWD)</option>
                  <option value="Ministry of Railways">Ministry of Railways</option>
                  <option value="Ministry of Jal Shakti / Water Resources">Ministry of Jal Shakti / Water Resources</option>
                  <option value="National Informatics Centre (NIC)">National Informatics Centre (NIC)</option>
                  <option value="MoSPI - National Infrastructure Oversight">MoSPI - National Infrastructure Oversight</option>
                  <option value="State Infrastructure Audit Wing">State Infrastructure Audit Wing</option>
                </select>
              </div>

              {/* Login Credentials Notice */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2.5">
                <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <span className="font-bold">Instant Login Enabled:</span> This officer can immediately sign in using this email address. Their password is automatically set to their name:{" "}
                  <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-900">
                    {newName.trim() || "Officer Name"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 text-sm bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-sm"
                >
                  {modalSubmitting ? "Provisioning..." : "Save Officer & Enable Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODERN DELETE OFFICER CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-navy-900 text-base">Delete Officer Account</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Revoke access and purge official record.</p>
                </div>
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Officer Details Preview Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-navy-900">
                  {`${userToDelete.first_name || ""} ${userToDelete.last_name || ""}`.trim() || userToDelete.username}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadge(userToDelete.role)}`}>
                  {formatRoleLabel(userToDelete.role)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-600 font-mono">
                <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>{userToDelete.email}</span>
              </div>
              <div className="text-xs text-slate-500">
                Department: <span className="font-medium text-slate-700">{userToDelete.department || "General Administration"}</span>
              </div>
            </div>

            {/* Warning Message */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <span className="font-bold">Permanent Deletion:</span> This account will be immediately deleted from the central directory and MongoDB Atlas. The officer will lose access to all projects and audits.
              </div>
            </div>

            {/* Safety Confirmation Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Type <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                placeholder="Type DELETE..."
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-rose-500 font-mono"
                autoFocus
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteConfirmText.trim().toUpperCase() !== "DELETE" || isDeleting}
                className={`px-4 py-2 text-sm font-semibold rounded-xl text-white flex items-center gap-2 transition-all ${
                  deleteConfirmText.trim().toUpperCase() === "DELETE" && !isDeleting
                    ? "bg-rose-600 hover:bg-rose-700 shadow-sm"
                    : "bg-slate-300 cursor-not-allowed opacity-60"
                }`}
              >
                {isDeleting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>Delete Officer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
