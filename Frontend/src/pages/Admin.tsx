import { useState } from "react"

type AdminTab = "users" | "projects" | "departments" | "contractors" | "settings"

const users = [
  { id: "U001", name: "R. Sharma", email: "r.sharma@gov.in", role: "Government Officer", dept: "Rural Development", status: "Active", lastLogin: "10 Sep 2026" },
  { id: "U002", name: "K. Rajan", email: "k.rajan@gov.in", role: "Field Inspector", dept: "Infrastructure", status: "Active", lastLogin: "9 Sep 2026" },
  { id: "U003", name: "S. Nair", email: "s.nair@gov.in", role: "Field Inspector", dept: "Urban Development", status: "Active", lastLogin: "10 Sep 2026" },
  { id: "U004", name: "P. Kumar", email: "p.kumar@gov.in", role: "Senior Officer", dept: "Finance", status: "Active", lastLogin: "8 Sep 2026" },
  { id: "U005", name: "M. Reddy", email: "m.reddy@gov.in", role: "Field Inspector", dept: "Rural Development", status: "Inactive", lastLogin: "2 Sep 2026" },
  { id: "U006", name: "A. Pillai", email: "a.pillai@gov.in", role: "Admin", dept: "IT", status: "Active", lastLogin: "10 Sep 2026" },
]

const departments = [
  { name: "Rural Development", projects: 342, budget: "₹218 Cr", officers: 8 },
  { name: "Urban Development", projects: 287, budget: "₹195 Cr", officers: 6 },
  { name: "Infrastructure", projects: 198, budget: "₹312 Cr", officers: 5 },
  { name: "Water Resources", projects: 156, budget: "₹89 Cr", officers: 4 },
  { name: "Education", projects: 143, budget: "₹67 Cr", officers: 7 },
  { name: "Health", projects: 122, budget: "₹78 Cr", officers: 5 },
]

const contractors = [
  { name: "ABC Infrastructure Pvt. Ltd.", projects: 18, delayed: 5, risk: 72 },
  { name: "Karnataka Build Corp", projects: 24, delayed: 2, risk: 45 },
  { name: "Sri Venkateshwara Constructions", projects: 12, delayed: 3, risk: 58 },
  { name: "National Roads & Bridges Ltd.", projects: 31, delayed: 6, risk: 67 },
  { name: "Deccan Civil Works", projects: 9, delayed: 1, risk: 38 },
]

const roleColor: Record<string, string> = {
  "Admin": "bg-navy-100 text-navy-700",
  "Government Officer": "bg-accent-100 text-accent-600",
  "Senior Officer": "bg-purple-100 text-purple-700",
  "Field Inspector": "bg-slate-100 text-slate-600",
}

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>("users")

  const tabs: { k: AdminTab; label: string; icon: string }[] = [
    { k: "users", label: "Users", icon: "👤" },
    { k: "projects", label: "Projects", icon: "📁" },
    { k: "departments", label: "Departments", icon: "🏛️" },
    { k: "contractors", label: "Contractors", icon: "🏗️" },
    { k: "settings", label: "Settings", icon: "⚙️" },
  ]

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-700 text-2xl text-navy-900">Administration</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage users, projects, departments, and system settings</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span className="text-amber-500 text-sm">⚠️</span>
          <span className="text-xs text-amber-700 font-500">Admin access — changes are logged</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1.5 w-fit">
        {tabs.map(t => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-500 transition-colors ${
              tab === t.k
                ? "bg-navy-800 text-white"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Users tab */}
      {tab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-600 text-navy-900">User Management</h2>
            <button className="text-sm bg-navy-800 text-white px-4 py-2 rounded-lg font-600 hover:bg-navy-700 transition-colors">
              + Add User
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["User", "Role", "Department", "Status", "Last Login", "Actions"].map(h => (
                      <th key={h} className="text-left px-6 py-3 text-xs font-600 text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u.id} className="table-row-hover">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center text-sm font-700 text-navy-700 flex-shrink-0">
                            {u.name.split(" ").map(n => n[0]).join("")}
                          </div>
                          <div>
                            <div className="font-500 text-slate-800 text-sm">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${roleColor[u.role] || "bg-slate-100 text-slate-600"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">{u.dept}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-600 px-2 py-0.5 rounded-full ${u.status === "Active" ? "bg-risk-low-bg text-risk-low" : "bg-slate-100 text-slate-400"}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-400">{u.lastLogin}</td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="text-xs text-accent-500 hover:text-accent-600 font-600">Edit</button>
                          <span className="text-slate-200">|</span>
                          <button className="text-xs text-risk-high hover:text-red-700 font-600">Deactivate</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Departments tab */}
      {tab === "departments" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-600 text-navy-900">Department Management</h2>
            <button className="text-sm bg-navy-800 text-white px-4 py-2 rounded-lg font-600 hover:bg-navy-700 transition-colors">
              + Add Department
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {departments.map(d => (
              <div key={d.name} className="bg-white rounded-xl border border-slate-200 p-5 card-hover">
                <h3 className="font-display font-700 text-navy-900 text-sm mb-3">{d.name}</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <div className="font-mono font-700 text-base text-slate-800">{d.projects}</div>
                    <div className="text-[10px] text-slate-400">Projects</div>
                  </div>
                  <div>
                    <div className="font-mono font-700 text-base text-navy-700">{d.budget}</div>
                    <div className="text-[10px] text-slate-400">Budget</div>
                  </div>
                  <div>
                    <div className="font-mono font-700 text-base text-slate-600">{d.officers}</div>
                    <div className="text-[10px] text-slate-400">Officers</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 text-xs border border-slate-200 text-slate-500 py-1.5 rounded-lg hover:bg-slate-50 transition-colors font-500">Edit</button>
                  <button className="flex-1 text-xs bg-accent-100 text-accent-600 py-1.5 rounded-lg hover:bg-accent-100 transition-colors font-600">View Projects</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contractors tab */}
      {tab === "contractors" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-600 text-navy-900">Contractor Registry</h2>
            <button className="text-sm bg-navy-800 text-white px-4 py-2 rounded-lg font-600 hover:bg-navy-700 transition-colors">
              + Register Contractor
            </button>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  {["Contractor", "Projects", "Delayed", "Risk Score", "Actions"].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs font-600 text-slate-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contractors.map(c => (
                  <tr key={c.name} className="table-row-hover">
                    <td className="px-6 py-4 font-500 text-slate-700 text-sm">{c.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-slate-600">{c.projects}</td>
                    <td className="px-6 py-4 font-mono text-sm text-risk-medium font-600">{c.delayed}</td>
                    <td className="px-6 py-4">
                      <span className={`font-mono font-700 text-sm ${c.risk >= 70 ? "text-risk-high" : c.risk >= 50 ? "text-risk-medium" : "text-risk-low"}`}>
                        {c.risk}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button className="text-xs text-accent-500 hover:text-accent-600 font-600">Profile</button>
                        <span className="text-slate-200">|</span>
                        <button className="text-xs text-slate-500 hover:text-slate-700 font-600">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Projects tab */}
      {tab === "projects" && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center min-h-64">
          <div className="text-4xl mb-4">📁</div>
          <h3 className="font-display font-700 text-navy-900 text-lg mb-2">Project Registry</h3>
          <p className="text-slate-400 text-sm max-w-md">
            Manage all project records, assignments, and statuses. This module connects to the Project Map and Risk Analysis screens.
          </p>
          <button className="mt-5 text-sm bg-navy-800 text-white px-5 py-2.5 rounded-xl font-600 hover:bg-navy-700 transition-colors">
            Import from Data Source
          </button>
        </div>
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="space-y-6">
          <h2 className="font-display font-600 text-navy-900">System Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Risk Score Thresholds",
                desc: "Configure the thresholds used to classify projects as high, medium, or low risk.",
                fields: [
                  { label: "High Risk threshold", value: "70" },
                  { label: "Medium Risk threshold", value: "50" },
                ],
              },
              {
                title: "Alert Configuration",
                desc: "Set up automated alerts for when projects cross risk thresholds.",
                fields: [
                  { label: "Alert email recipients", value: "officers@gov.in" },
                  { label: "Alert frequency", value: "Daily digest" },
                ],
              },
              {
                title: "Data Retention",
                desc: "Configure how long evidence and inspection records are retained.",
                fields: [
                  { label: "Evidence retention (years)", value: "7" },
                  { label: "Inspection records (years)", value: "10" },
                ],
              },
              {
                title: "Audit & Compliance",
                desc: "All actions are logged. Configure audit log retention and access.",
                fields: [
                  { label: "Audit log retention", value: "10 years" },
                  { label: "Access review frequency", value: "Quarterly" },
                ],
              },
            ].map(s => (
              <div key={s.title} className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-display font-700 text-navy-900 text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-slate-400 mb-4">{s.desc}</p>
                <div className="space-y-3">
                  {s.fields.map(f => (
                    <div key={f.label}>
                      <label className="text-xs font-500 text-slate-500 block mb-1">{f.label}</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-accent-400 focus:ring-2 focus:ring-accent-100 transition-all"
                        defaultValue={f.value}
                      />
                    </div>
                  ))}
                </div>
                <button className="mt-4 text-xs bg-navy-800 text-white px-3 py-1.5 rounded-lg font-600 hover:bg-navy-700 transition-colors">
                  Save Changes
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
