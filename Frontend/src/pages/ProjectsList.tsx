import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { projectService } from "../services/projectService";
import { Project } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { hasCapability } from "../permissions/rbac";
import DrishtiLoader from "../components/DrishtiLoader";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const SECTOR_OPTIONS = [
  "Roads & Highways", "Railways", "Urban Infrastructure", "Power & Energy",
  "Water Resources", "Telecom & IT", "Ports & Shipping", "Mining & Minerals"
];

export default function ProjectsList() {
  const { user } = useAuth();
  const canViewRisk = hasCapability(user?.role, "view_internal_risk");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  
  // CRUD Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Form state for Create
  const [createForm, setCreateForm] = useState({
    project_name: "",
    state: "Delhi",
    district: "New Delhi",
    sector: "Roads & Highways",
    scheme: "PM GatiShakti National Master Plan",
    original_cost_cr: 500,
    revised_cost_cr: 500,
    expenditure_cr: 120,
    reported_progress: 35,
    latitude: 28.6139,
    longitude: 77.2090,
  });

  // Form state for Edit
  const [editForm, setEditForm] = useState<Partial<Project>>({});

  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const response = await projectService.getProjects();
      setProjects(response.results || []);
    } catch (err: any) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const states = useMemo(() => {
    const unique = new Set(projects.map(p => p.state).filter(Boolean));
    return ["All States", ...Array.from(unique).sort()];
  }, [projects]);

  const sectors = useMemo(() => {
    const unique = new Set(projects.map(p => p.sector || p.department || p.project_category).filter(Boolean));
    return ["All Sectors", ...Array.from(unique).sort()];
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchState = selectedState === "All States" || p.state === selectedState;
      const sectorVal = p.sector || p.department || p.project_category || "";
      const matchSector = selectedSector === "All Sectors" || sectorVal === selectedSector;
      const term = search.toLowerCase();
      const matchSearch = !term || [
        p.project_id, p.project_name, p.state, p.source_project_id, p.sector, p.department, p.project_category
      ].some(val => val && String(val).toLowerCase().includes(term));
      
      return matchState && matchSector && matchSearch;
    });
  }, [projects, selectedState, selectedSector, search]);

  // Handle Create Project
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.project_name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await projectService.createProject(createForm);
      setBannerMessage({
        text: `Project ${created.project_id} successfully created!`,
        type: "success",
      });
      setIsCreateOpen(false);
      setCreateForm({
        project_name: "",
        state: "Delhi",
        district: "New Delhi",
        sector: "Roads & Highways",
        scheme: "PM GatiShakti National Master Plan",
        original_cost_cr: 500,
        revised_cost_cr: 500,
        expenditure_cr: 120,
        reported_progress: 35,
        latitude: 28.6139,
        longitude: 77.2090,
      });
      await fetchProjects();
    } catch (err: any) {
      setBannerMessage({ text: err.message || "Failed to create project", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(p);
    setEditForm({
      project_name: p.project_name,
      state: p.state,
      district: p.district || "",
      sector: p.sector || p.department || "Roads & Highways",
      department: p.department || p.sector || "Roads & Highways",
      original_cost_cr: p.original_cost_cr ?? p.original_cost,
      revised_cost_cr: p.revised_cost_cr ?? p.revised_cost,
      expenditure_cr: p.expenditure_cr ?? p.expenditure,
      reported_progress: p.reported_progress ?? p.reported_progress_pct,
      verification_status: p.verification_status || "NOT_REVIEWED",
    });
  };

  // Handle Edit Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    setIsSubmitting(true);
    try {
      await projectService.updateProject(editingProject.project_id, editForm);
      setBannerMessage({
        text: `Project ${editingProject.project_id} updated successfully!`,
        type: "success",
      });
      setEditingProject(null);
      await fetchProjects();
    } catch (err: any) {
      setBannerMessage({ text: err.message || "Failed to update project", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingProject(p);
  };

  // Handle Delete Confirm
  const handleDeleteConfirm = async () => {
    if (!deletingProject) return;

    setIsSubmitting(true);
    try {
      await projectService.deleteProject(deletingProject.project_id);
      setBannerMessage({
        text: `Project ${deletingProject.project_id} successfully deleted!`,
        type: "success",
      });
      setDeletingProject(null);
      await fetchProjects();
    } catch (err: any) {
      setBannerMessage({ text: err.message || "Failed to delete project", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DrishtiLoader
        title="Loading official projects..."
        subtitle="Accessing PAIMANA Central Federated Records"
      />
    );
  }
  if (error) return <div style={{ padding: 24, color: "red" }}>Error: {error}</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1440, margin: "0 auto" }}>
      {/* Banner Feedback */}
      {bannerMessage && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-bold transition-all shadow-xs ${
            bannerMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
              : "bg-rose-50 text-rose-800 border-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <span>{bannerMessage.type === "success" ? "✓" : "✕"}</span>
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="text-slate-400 hover:text-slate-700 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-navy-700)" }}>
            All Infrastructure Projects ({filteredProjects.length})
          </h1>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="bg-[#0b1f4b] hover:bg-[#152e6d] text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Add New Project</span>
        </button>
      </div>
      
      {/* Search & Filters */}
      <div className="flex flex-wrap gap-3 mb-6 bg-white p-3 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex-1 min-w-[260px] relative">
          <input 
            type="text"
            placeholder="Search by ID, name, state, sector..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs outline-none focus:border-[#0b1f4b]"
          />
          <span className="absolute left-3 top-2.5 text-slate-400 text-xs">🔍</span>
        </div>
        <select 
          value={selectedState} 
          onChange={e => setSelectedState(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none cursor-pointer bg-white"
        >
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select 
          value={selectedSector} 
          onChange={e => setSelectedSector(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 outline-none cursor-pointer bg-white"
        >
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-mono">Project ID</th>
                <th className="px-4 py-3">Project Name</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Original Cost</th>
                <th className="px-4 py-3">Revised Cost</th>
                <th className="px-4 py-3">Expenditure</th>
                <th className="px-4 py-3">Progress</th>
                {canViewRisk && <th className="px-4 py-3">Risk</th>}
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {filteredProjects.length === 0 && (
                <tr>
                  <td colSpan={canViewRisk ? 10 : 9} className="px-4 py-12 text-center text-slate-400">
                    No matching projects found.
                  </td>
                </tr>
              )}
              {filteredProjects.map((p) => {
                const sector = p.sector || p.department || p.project_category || "-";
                const formatCr = (val?: number) => val != null ? `₹${Number(val).toLocaleString('en-IN', {maximumFractionDigits: 2})} Cr` : "-";
                return (
                  <tr
                    key={p.project_id}
                    className="hover:bg-sky-50/40 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/projects/${p.project_id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-bold text-[#0b1f4b] whitespace-nowrap">
                      {p.project_id}
                    </td>
                    <td className="px-4 py-3 min-w-[280px] max-w-[380px] font-semibold text-slate-800" style={{ whiteSpace: "normal", lineHeight: "1.4" }} title={p.project_name}>
                      {p.project_name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-600">{p.state}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">{sector}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{formatCr(p.original_cost_cr ?? p.original_cost)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{formatCr(p.revised_cost_cr ?? p.revised_cost)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono">{formatCr(p.expenditure_cr ?? p.expenditure)}</td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold">
                      {(p.reported_progress_pct ?? p.reported_progress) != null ? `${p.reported_progress_pct ?? p.reported_progress}%` : "-"}
                    </td>
                    {canViewRisk && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.risk_score != null ? (
                          <div className="flex items-center gap-1.5">
                            <span className={`font-mono font-bold ${p.risk_level === 'Critical' ? 'text-red-600' : p.risk_level === 'High' ? 'text-orange-600' : p.risk_level === 'Medium' ? 'text-amber-600' : 'text-green-600'}`}>
                              {p.risk_score}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.risk_level === 'Critical' ? 'bg-red-100 text-red-700' : 
                              p.risk_level === 'High' ? 'bg-orange-100 text-orange-700' : 
                              p.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700' : 
                              'bg-green-100 text-green-700'
                            }`}>
                              {p.risk_level?.toUpperCase() || 'LOW'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono">N/A</span>
                        )}
                      </td>
                    )}
                    {/* Actions Column (Edit / Delete) */}
                    <td className="px-4 py-3 whitespace-nowrap text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => handleOpenEdit(p, e)}
                          title="Edit Project"
                          className="p-1.5 rounded-md hover:bg-sky-100 text-sky-700 border border-sky-200 transition-colors cursor-pointer"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                          </svg>
                        </button>
                        <button
                          onClick={(e) => handleOpenDelete(p, e)}
                          title="Delete Project"
                          className="p-1.5 rounded-md hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors cursor-pointer"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PROJECT MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-base font-bold text-[#0b1f4b]">Create New Infrastructure Project</h2>
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. National Corridor Expressway Phase-II"
                  value={createForm.project_name}
                  onChange={e => setCreateForm({ ...createForm, project_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-medium outline-none focus:border-[#0b1f4b]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State *</label>
                  <select
                    value={createForm.state}
                    onChange={e => setCreateForm({ ...createForm, state: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium bg-white outline-none cursor-pointer"
                  >
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Ludhiana / Varanasi"
                    value={createForm.district}
                    onChange={e => setCreateForm({ ...createForm, district: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sector / Department *</label>
                  <select
                    value={createForm.sector}
                    onChange={e => setCreateForm({ ...createForm, sector: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium bg-white outline-none cursor-pointer"
                  >
                    {SECTOR_OPTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheme</label>
                  <input
                    type="text"
                    value={createForm.scheme}
                    onChange={e => setCreateForm({ ...createForm, scheme: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Original Cost (₹ Cr) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={createForm.original_cost_cr}
                    onChange={e => setCreateForm({ ...createForm, original_cost_cr: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Revised Cost (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.revised_cost_cr}
                    onChange={e => setCreateForm({ ...createForm, revised_cost_cr: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expenditure (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={createForm.expenditure_cr}
                    onChange={e => setCreateForm({ ...createForm, expenditure_cr: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Reported Progress (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={createForm.reported_progress}
                    onChange={e => setCreateForm({ ...createForm, reported_progress: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={createForm.latitude}
                    onChange={e => setCreateForm({ ...createForm, latitude: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={createForm.longitude}
                    onChange={e => setCreateForm({ ...createForm, longitude: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving Project..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROJECT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse" />
                <h2 className="text-base font-bold text-[#0b1f4b]">
                  Edit Project {editingProject.project_id}
                </h2>
              </div>
              <button onClick={() => setEditingProject(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.project_name || ""}
                  onChange={e => setEditForm({ ...editForm, project_name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-medium outline-none focus:border-[#0b1f4b]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">State</label>
                  <select
                    value={editForm.state || "Delhi"}
                    onChange={e => setEditForm({ ...editForm, state: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium bg-white outline-none cursor-pointer"
                  >
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    value={editForm.district || ""}
                    onChange={e => setEditForm({ ...editForm, district: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sector / Department</label>
                  <select
                    value={editForm.sector || editForm.department || "Roads & Highways"}
                    onChange={e => setEditForm({ ...editForm, sector: e.target.value, department: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium bg-white outline-none cursor-pointer"
                  >
                    {SECTOR_OPTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Verification Status</label>
                  <select
                    value={editForm.verification_status || "NOT_REVIEWED"}
                    onChange={e => setEditForm({ ...editForm, verification_status: e.target.value as any })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-medium bg-white outline-none cursor-pointer"
                  >
                    <option value="NOT_REVIEWED">NOT_REVIEWED</option>
                    <option value="VERIFIED_MATCH">VERIFIED_MATCH</option>
                    <option value="FLAGGED_DISCREPANCY">FLAGGED_DISCREPANCY</option>
                    <option value="UNDER_INVESTIGATION">UNDER_INVESTIGATION</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Original Cost (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.original_cost_cr ?? 0}
                    onChange={e => setEditForm({ ...editForm, original_cost_cr: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Revised Cost (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.revised_cost_cr ?? 0}
                    onChange={e => setEditForm({ ...editForm, revised_cost_cr: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expenditure (₹ Cr)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.expenditure_cr ?? 0}
                    onChange={e => setEditForm({ ...editForm, expenditure_cr: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reported Progress (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={editForm.reported_progress ?? 0}
                  onChange={e => setEditForm({ ...editForm, reported_progress: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-300 rounded-lg p-2.5 font-mono outline-none"
                />
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-rose-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-700 font-bold mb-3 text-base">
              <span className="p-2 rounded-full bg-rose-100 text-rose-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <span>Confirm Project Deletion</span>
            </div>

            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              Are you sure you want to permanently delete project <strong className="text-[#0b1f4b] font-mono">{deletingProject.project_id}</strong>:
            </p>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs font-semibold text-slate-800 mb-4">
              {deletingProject.project_name}
            </div>
            <p className="text-[11px] text-rose-600 font-medium mb-5">
              Warning: This will permanently remove this project and its associated audit records. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 text-xs">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Deleting Project..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
