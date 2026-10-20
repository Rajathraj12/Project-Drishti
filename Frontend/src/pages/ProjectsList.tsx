import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { projectService } from "../services/projectService";
import { Project } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { hasCapability } from "../permissions/rbac";
import DrishtiLoader from "../components/DrishtiLoader";

export default function ProjectsList() {
  const { user } = useAuth();
  const canViewRisk = hasCapability(user?.role, "view_internal_risk");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [selectedState, setSelectedState] = useState("All States");
  const [selectedSector, setSelectedSector] = useState("All Sectors");
  
  const navigate = useNavigate();

  useEffect(() => {
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
    fetchProjects();
  }, []);

  const states = useMemo(() => {
    const unique = new Set(projects.map(p => p.state).filter(Boolean));
    return ["All States", ...Array.from(unique).sort()];
  }, [projects]);

  const sectors = useMemo(() => {
    const unique = new Set(projects.map(p => p.department || p.project_category).filter(Boolean));
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
    <div style={{ padding: 24, maxWidth: 1400, margin: "0 auto" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", color: "var(--color-navy-700)", marginBottom: 16 }}>
        All Projects ({filteredProjects.length})
      </h1>
      
      <div className="flex gap-4 mb-6">
        <input 
          type="text"
          placeholder="Search by ID, name, state, sector..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm flex-1"
        />
        <select 
          value={selectedState} 
          onChange={e => setSelectedState(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        >
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select 
          value={selectedSector} 
          onChange={e => setSelectedSector(e.target.value)}
          className="border border-slate-300 rounded px-3 py-2 text-sm"
        >
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div style={{ overflowX: "auto" }}>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-600">
              <tr>
                <th className="px-4 py-3">Project ID</th>
                <th className="px-4 py-3">Project Name</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Original Cost</th>
                <th className="px-4 py-3">Revised Cost</th>
                <th className="px-4 py-3">Expenditure</th>
                <th className="px-4 py-3">Progress</th>
                {canViewRisk && <th className="px-4 py-3">Risk</th>}
                <th className="px-4 py-3">Data Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProjects.length === 0 && (
                <tr><td colSpan={canViewRisk ? 10 : 9} className="px-4 py-8 text-center text-slate-500">No projects found.</td></tr>
              )}
              {filteredProjects.map((p) => {
                const sector = p.sector || p.department || p.project_category || "-";
                // Data is already in Crores from the backend API
                const formatCr = (val?: number) => val != null ? `₹${Number(val).toLocaleString('en-IN', {maximumFractionDigits: 2})} Cr` : "-";
                return (
                  <tr key={p.project_id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/projects/${p.project_id}`)}>
                    <td className="px-4 py-3 font-mono text-xs">{p.project_id}</td>
                    <td className="px-4 py-3 min-w-[300px] max-w-[400px]" style={{ whiteSpace: "normal", lineHeight: "1.4" }} title={p.project_name}>{p.project_name}</td>
                    <td className="px-4 py-3">{p.state}</td>
                    <td className="px-4 py-3">{sector}</td>
                    <td className="px-4 py-3">{formatCr(p.original_cost_cr ?? p.original_cost)}</td>
                    <td className="px-4 py-3">{formatCr(p.revised_cost_cr ?? p.revised_cost)}</td>
                    <td className="px-4 py-3">{formatCr(p.expenditure_cr ?? p.expenditure)}</td>
                    <td className="px-4 py-3">{(p.reported_progress_pct ?? p.reported_progress) != null ? `${p.reported_progress_pct ?? p.reported_progress}%` : "-"}</td>
                    {canViewRisk && (
                    <td className="px-4 py-3">
                      {p.risk_score != null ? (
                        <div className="flex items-center gap-2">
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
                        <span className="text-slate-400 font-mono text-sm">N/A</span>
                      )}
                    </td>
                    )}
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-700">
                        Official
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
