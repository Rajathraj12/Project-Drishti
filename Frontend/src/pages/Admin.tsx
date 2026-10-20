import React, { useState } from "react"

interface User {
  id: string
  name: string
  email: string
  role: string
  department: string
  status: "Active" | "Inactive"
}

const INITIAL_USERS: User[] = [
  { id: "1", name: "Rajesh Sharma", email: "r.sharma@gov.in", role: "Government Officer", department: "Rural Development", status: "Active" },
  { id: "2", name: "Sunita Rao", email: "s.rao@pwd.gov.in", role: "Field Inspector", department: "Public Works (PWD)", status: "Active" },
  { id: "3", name: "Anand Verma", email: "a.verma@nic.in", role: "Administrator", department: "IT & Administration", status: "Active" },
  { id: "4", name: "M. K. Deshmukh", email: "deshmukh@nhai.gov.in", role: "Government Officer", department: "NHAI Highways", status: "Active" },
  { id: "5", name: "Pooja Sundaram", email: "p.sundaram@gov.in", role: "Government Officer", department: "Finance & Accounts", status: "Active" },
  { id: "6", name: "K. Narayanaswamy", email: "k.swamy@treasury.gov.in", role: "Field Inspector", department: "State Finance", status: "Inactive" },
]

const DEPARTMENTS = [
  { name: "Public Works Department (PWD)", projects: 28, budget: "₹340 Cr", officers: 12 },
  { name: "Rural Development", projects: 45, budget: "₹210 Cr", officers: 16 },
  { name: "National Highways (NHAI)", projects: 14, budget: "₹580 Cr", officers: 8 },
  { name: "Water Resources", projects: 19, budget: "₹145 Cr", officers: 6 },
]

export default function Admin() {
  const [activeTab, setActiveTab] = useState<"users" | "departments" | "settings">("users")
  const [users, setUsers] = useState<User[]>(INITIAL_USERS)
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("ALL")
  const [isModalOpen, setIsModalOpen] = useState(false)

  // New user form state
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [newRole, setNewRole] = useState("Field Inspector")
  const [newDept, setNewDept] = useState("Public Works (PWD)")

  // Toggle user active/inactive
  const toggleStatus = (id: string) => {
    setUsers(users.map(u => u.id === id ? { ...u, status: u.status === "Active" ? "Inactive" : "Active" } : u))
  }

  // Add new user
  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim()) return

    const user: User = {
      id: Date.now().toString(),
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      department: newDept,
      status: "Active"
    }
    setUsers([user, ...users])
    setNewName("")
    setNewEmail("")
    setIsModalOpen(false)
  }

  // Filter users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Simple Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-navy-900 font-display">Admin Portal</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage system users, departments, and general settings.</p>
        </div>
        {activeTab === "users" && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>+</span> Add User
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase">Total Users</div>
          <div className="text-2xl font-bold text-navy-900 mt-1">{users.length}</div>
          <div className="text-xs text-emerald-600 mt-0.5 font-medium">{users.filter(u => u.status === "Active").length} active accounts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase">Departments</div>
          <div className="text-2xl font-bold text-navy-900 mt-1">{DEPARTMENTS.length}</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium">106 monitored projects</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs text-slate-500 font-medium uppercase">System Status</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">Normal</div>
          <div className="text-xs text-slate-500 mt-0.5 font-medium">All services connected</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          Users ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("departments")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "departments"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          Departments
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "settings"
              ? "border-navy-800 text-navy-900"
              : "border-transparent text-slate-500 hover:text-navy-900"
          }`}
        >
          Settings
        </button>
      </div>

      {/* TAB 1: USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-72 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value="Government Officer">Government Officer</option>
              <option value="Field Inspector">Field Inspector</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          {/* User Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No users found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-navy-900">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          <span className="inline-block bg-slate-100 text-slate-700 text-xs font-medium px-2 py-0.5 rounded">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 text-xs">{user.department}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${
                              user.status === "Active"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => toggleStatus(user.id)}
                            className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${
                              user.status === "Active"
                                ? "text-red-600 hover:bg-red-50"
                                : "text-emerald-600 hover:bg-emerald-50"
                            }`}
                          >
                            {user.status === "Active" ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DEPARTMENTS */}
      {activeTab === "departments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEPARTMENTS.map((dept) => (
            <div key={dept.name} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="font-bold text-navy-900 text-base">{dept.name}</h3>
              <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-100 text-center">
                <div>
                  <div className="text-lg font-bold text-navy-800">{dept.projects}</div>
                  <div className="text-xs text-slate-400">Projects</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-navy-800">{dept.budget}</div>
                  <div className="text-xs text-slate-400">Total Budget</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-navy-800">{dept.officers}</div>
                  <div className="text-xs text-slate-400">Officers</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: SETTINGS */}
      {activeTab === "settings" && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 max-w-2xl">
          <div>
            <h3 className="font-bold text-navy-900 text-base">Notification Settings</h3>
            <p className="text-xs text-slate-500 mt-0.5">Control automated alerts for delayed and high-risk projects.</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-navy-700" />
                <span className="text-sm text-slate-700">Email alerts for High Risk project milestone delays</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-navy-700" />
                <span className="text-sm text-slate-700">Notify field officers 48 hours before scheduled inspection</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-navy-700" />
                <span className="text-sm text-slate-700">Weekly progress digest to Department Heads</span>
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="font-bold text-navy-900 text-base">Risk Threshold</h3>
            <p className="text-xs text-slate-500 mt-0.5">Projects above this delay percentage are automatically marked as High Risk.</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="number"
                defaultValue={20}
                className="w-24 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600"
              />
              <span className="text-sm text-slate-500">% progress delay</span>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => alert("Settings saved successfully!")}
              className="bg-navy-800 hover:bg-navy-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-bold text-navy-900 text-base">Add New User</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3">
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@gov.in"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white"
                >
                  <option value="Government Officer">Government Officer</option>
                  <option value="Field Inspector">Field Inspector</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-navy-600 bg-white"
                >
                  <option value="Public Works (PWD)">Public Works (PWD)</option>
                  <option value="Rural Development">Rural Development</option>
                  <option value="NHAI Highways">NHAI Highways</option>
                  <option value="Finance & Accounts">Finance & Accounts</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm bg-navy-800 hover:bg-navy-900 text-white rounded-lg font-semibold"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
