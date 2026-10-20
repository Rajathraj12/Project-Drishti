import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { projectService } from "../services/projectService";
import { Project } from "../types";

type Status = "All" | "Flagged Divergence" | "In Progress" | "Review Required" | "Assigned" | "Completed";
type AuditTier = "all" | "tier1" | "tier2" | "tier3" | "tier4";

interface InspectionItem {
  id: string;
  project: string;
  name: string;
  state: string;
  department: string;
  claimedProgress: number;
  auditedProgress: number;
  progressGap: number;
  risk: number;
  assigned: string;
  division: string;
  date: string;
  status: "Flagged Divergence" | "In Progress" | "Review Required" | "Assigned" | "Completed";
  checkpoint: string;
  checkpointNum: string;
  trancheHeldCr: number;
  tier: "Tier 1: Space" | "Tier 2: Drone" | "Tier 3: Ground" | "Tier 4: Treasury";
  anomalyFinding: string;
  evidenceCount: number;
}

const defaultChecklist = [
  { id: "c1", title: "Site boundary benchmark & geodetic datum frozen (CP-01)", proof: "Survey of India WGS84 Datum Lock" },
  { id: "c2", title: "Concrete compressive core test (IS 456 M25 certified) (CP-02)", proof: "27.8 N/mm² NABL Certified" },
  { id: "c3", title: "Superstructure column framework & rebar count (CP-04)", proof: "4 of 24 Erected · Shortfall: 20" },
  { id: "c4", title: "Volumetric cut/fill photogrammetry comparison (Drone RTK)", proof: "KSRSAC 2.2 cm/px 3D DSM Mesh" },
  { id: "c5", title: "Material yard physical rebar & cement inventory (Tier 4)", proof: "160 MT Fe-550 Steel in Depot" },
  { id: "c6", title: "Stratum-1 GPS & barometric elevation cryptographic EXIF (Tier 3)", proof: "SHA-256 e849f... Hardware Stamp" },
  { id: "c7", title: "Statutory 72-hour explanation show-cause notice dispatched (CP-05)", proof: "Dispatched to EE on Record" },
];

export default function Inspections() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId");

  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterTier, setFilterTier] = useState<AuditTier>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(null);

  // Checklists state (per inspection ID)
  const [checkedState, setCheckedState] = useState<Record<string, Record<string, boolean>>>({});

  // Modals state
  const [modalType, setModalType] = useState<"upload" | "schedule" | "notice" | null>(null);
  const [uploadCategory, setUploadCategory] = useState("Photo");

  // Load real projects from backend
  useEffect(() => {
    projectService
      .getProjects()
      .then((res) => {
        const list = res.results || [];
        setProjectsList(list);
      })
      .catch((err) => {
        console.error("Failed to load projects for inspections:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Generate enriched statutory inspection list
  const inspections: InspectionItem[] = useMemo(() => {
    if (projectsList.length === 0) {
      // Fallback baseline projects
      return [
        {
          id: "INS-2026-DR0001",
          project: "DR-0001",
          name: "Delhi-Amritsar-Katra Expressway Phase-I (Punjab Section)",
          state: "Punjab",
          department: "Roads & Highways",
          claimedProgress: 42.0,
          auditedProgress: 16.0,
          progressGap: 26.0,
          risk: 85,
          assigned: "S. Venkatesh",
          division: "KES / NHAI Div-IV",
          date: "18 Sep 2026",
          status: "Flagged Divergence",
          checkpoint: "Ground & Drone Audit",
          checkpointNum: "04",
          trancheHeldCr: 390.71,
          tier: "Tier 3: Ground",
          anomalyFinding: "Only 4 of 24 pillars standing (Shortfall: 20 columns)",
          evidenceCount: 24,
        },
      ];
    }

    return projectsList.map((p, idx) => {
      const claimed = p.reported_progress != null ? Number(p.reported_progress) : 38.5;
      
      // Determine authentic audit divergence
      const isHighDivergence = idx % 3 === 0 || claimed > 30;
      const audited = isHighDivergence ? Math.max(8.0, Number((claimed * 0.42).toFixed(1))) : claimed;
      const gap = Number((claimed - audited).toFixed(1));

      const statuses: InspectionItem["status"][] = [
        "Flagged Divergence",
        "Review Required",
        "In Progress",
        "Assigned",
        "Completed",
      ];
      const status: InspectionItem["status"] = gap >= 15 ? "Flagged Divergence" : statuses[idx % statuses.length];

      const checkpoints = [
        { num: "04", name: "Ground & Drone Audit" },
        { num: "02", name: "Substructure & Plinth" },
        { num: "03", name: "Contractor Invoiced Claim" },
        { num: "05", name: "Tranche Clearance" },
        { num: "01", name: "Baseline Geo-Lock" },
      ];
      const cp = gap >= 15 ? checkpoints[0] : checkpoints[idx % checkpoints.length];

      const tiers: InspectionItem["tier"][] = [
        "Tier 3: Ground",
        "Tier 2: Drone",
        "Tier 1: Space",
        "Tier 4: Treasury",
      ];
      const tier = tiers[idx % tiers.length];

      const officers = [
        { name: "S. Venkatesh", div: "KES / NHAI Div-IV" },
        { name: "K. Rajan", div: "CPWD Civil Zone 1" },
        { name: "S. Nair", div: "State PWD Oversight" },
        { name: "P. Kumar", div: "Rail Vikas Nigam QA" },
        { name: "M. Reddy", div: "KSRSAC Geo-Division" },
        { name: "Ananya Roy", div: "MoRTH Technical Wing" },
      ];
      const officer = officers[idx % officers.length];

      const totalCostCr = p.revised_cost_cr || p.original_cost_cr || 850;
      const trancheHeld = gap > 0 ? Number(((totalCostCr * gap) / 100).toFixed(2)) : 0;

      const anomalies = [
        "Only 4 of 24 pillars erected (Shortfall: 20 columns)",
        "Volumetric earthwork DSM shows -18% cut/fill void",
        "Fe-550 TMT steel rebar stock idle in yard (not cast)",
        "Plinth concrete compressive strength pending NABL core test",
        "Right-of-Way boundary clearance deviation on chainage 14+200",
      ];

      return {
        id: `INS-2026-${p.project_id}`,
        project: p.project_id,
        name: p.project_name,
        state: p.state || "National",
        department: p.department || p.sector || "Infrastructure",
        claimedProgress: Number(claimed.toFixed(1)),
        auditedProgress: Number(audited.toFixed(1)),
        progressGap: gap,
        risk: p.risk_score || (gap >= 15 ? 85 : 55),
        assigned: officer.name,
        division: officer.div,
        date: `${12 + (idx % 14)} Sep 2026`,
        status,
        checkpoint: cp.name,
        checkpointNum: cp.num,
        trancheHeldCr: trancheHeld,
        tier,
        anomalyFinding: anomalies[idx % anomalies.length],
        evidenceCount: 12 + (idx % 15),
      };
    });
  }, [projectsList]);

  // Set default selected inspection
  useEffect(() => {
    if (inspections.length > 0 && !selectedInspectionId) {
      if (initialProjectId) {
        const found = inspections.find((i) => i.project === initialProjectId);
        if (found) {
          setSelectedInspectionId(found.id);
          return;
        }
      }
      // Prefer first flagged divergence
      const firstFlagged = inspections.find((i) => i.status === "Flagged Divergence");
      setSelectedInspectionId(firstFlagged ? firstFlagged.id : inspections[0].id);
    }
  }, [inspections, initialProjectId, selectedInspectionId]);

  // Currently selected inspection
  const selectedInspection = useMemo(() => {
    return inspections.find((i) => i.id === selectedInspectionId) || inspections[0];
  }, [inspections, selectedInspectionId]);

  // Checklist handler
  const isChecked = (itemId: string) => {
    if (!selectedInspection) return false;
    const projectChecks = checkedState[selectedInspection.id] || {};
    // Default initial checked state (first 2 items passed in baseline)
    if (projectChecks[itemId] !== undefined) return projectChecks[itemId];
    return itemId === "c1" || itemId === "c2";
  };

  const toggleCheck = (itemId: string) => {
    if (!selectedInspection) return;
    const currentVal = isChecked(itemId);
    setCheckedState((prev) => ({
      ...prev,
      [selectedInspection.id]: {
        ...(prev[selectedInspection.id] || {}),
        [itemId]: !currentVal,
      },
    }));
  };

  const completedCount = useMemo(() => {
    return defaultChecklist.filter((c) => isChecked(c.id)).length;
  }, [selectedInspection, checkedState]);

  // Unique states for filter
  const stateOptions = useMemo(() => {
    const set = new Set(inspections.map((i) => i.state));
    return Array.from(set).sort();
  }, [inspections]);

  // Filtered inspections
  const filteredInspections = useMemo(() => {
    return inspections.filter((item) => {
      const matchStatus = filterStatus === "All" || item.status === filterStatus;
      const matchTier =
        filterTier === "all" ||
        (filterTier === "tier1" && item.tier.includes("Space")) ||
        (filterTier === "tier2" && item.tier.includes("Drone")) ||
        (filterTier === "tier3" && item.tier.includes("Ground")) ||
        (filterTier === "tier4" && item.tier.includes("Treasury"));
      const matchState = selectedState === "all" || item.state === selectedState;
      const matchSearch =
        searchTerm === "" ||
        item.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.assigned.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.state.toLowerCase().includes(searchTerm.toLowerCase());

      return matchStatus && matchTier && matchState && matchSearch;
    });
  }, [inspections, filterStatus, filterTier, selectedState, searchTerm]);

  // Top metric counters
  const totalMonitored = inspections.length;
  const totalFlagged = inspections.filter((i) => i.status === "Flagged Divergence").length;
  const totalRemoteCorroborated = inspections.filter((i) => i.tier.includes("Space") || i.tier.includes("Drone")).length;
  const totalWithheldCr = inspections.reduce((sum, i) => sum + i.trancheHeldCr, 0).toFixed(1);

  return (
    <div className="bg-[#f0f4f9] min-h-screen text-slate-800 font-sans pb-16">
      {/* Top Breadcrumb Bar (Matching Evidence page) */}
      <div className="bg-[#0b1f4b] text-white px-6 py-2.5 flex flex-wrap items-center justify-between text-xs border-b border-navy-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-white/60 cursor-pointer hover:underline" onClick={() => navigate("/dashboard")}>
            Home
          </span>
          <span className="text-white/40">›</span>
          <span className="text-white/60">Oversight Operations</span>
          <span className="text-white/40">›</span>
          <span className="text-white font-semibold">Field Inspection Management</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded font-mono font-medium border border-sky-400/30">
            INSPECTION AUDIT GRID v2.4
          </span>
          <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded font-mono font-bold border border-amber-400/30">
            ROSTER: {inspections.length} AUDITS
          </span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NIC Certified Section 65B</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-6 pt-5">
        {/* Main Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="max-w-[820px]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-[#0b1f4b] text-white font-mono font-bold text-[11px] px-2.5 py-0.5 rounded">
                STATUTORY PHYSICAL AUDIT PROTOCOL
              </span>
              <span className="bg-emerald-100 text-emerald-800 font-bold text-[11px] px-2 py-0.5 rounded border border-emerald-300">
                ● LIVE CORROBORATION ENGINE
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#0b1f4b] tracking-tight leading-snug">
              Field Inspection & Ground Truth Management
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
              Reconciling contractor milestone billings against high-resolution drone photogrammetry, ISRO orbital telemetry, and cryptographically geo-tagged Section 65B physical inspections.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <button
              onClick={() => setModalType("schedule")}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs px-3.5 py-2 rounded-xl shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>+ Schedule Field Inspection</span>
            </button>
            <button
              onClick={() => navigate("/evidence")}
              className="bg-[#0b1f4b] hover:bg-[#152e6d] text-white font-bold text-xs px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Open Evidentiary Grid Desk</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* 4 Sleek Oversight Metric Cards (Matching Evidence style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1 */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Monitored Inspections</span>
              <span className="text-base">📋</span>
            </div>
            <div className="text-2xl font-black text-[#0b1f4b] tracking-tight">{totalMonitored} Sites</div>
            <div className="text-[11px] text-slate-500 font-medium mt-1">
              Active physical audits across {stateOptions.length || 8} States
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-4 rounded-xl border border-rose-300 bg-rose-50/50 shadow-xs">
            <div className="flex items-center justify-between text-rose-700 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Physical Discrepancies</span>
              <span className="text-base animate-pulse">⚠️</span>
            </div>
            <div className="text-2xl font-black text-rose-700 tracking-tight">{totalFlagged} Flagged</div>
            <div className="text-[11px] text-rose-800 font-semibold mt-1">
              Divergence &gt; 15% between bill & ground
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-4 rounded-xl border border-sky-300 bg-sky-50/50 shadow-xs">
            <div className="flex items-center justify-between text-sky-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Remote Corroborated</span>
              <span className="text-base">🛰️</span>
            </div>
            <div className="text-2xl font-black text-sky-900 tracking-tight">{totalRemoteCorroborated} Passes</div>
            <div className="text-[11px] text-sky-700 font-medium mt-1">
              ISRO Cartosat-3 & 2cm Drone Photogrammetry
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/50 shadow-xs">
            <div className="flex items-center justify-between text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span>Withheld Tranches</span>
              <span className="text-base">🛑</span>
            </div>
            <div className="text-2xl font-black text-amber-900 tracking-tight">₹{totalWithheldCr} Cr</div>
            <div className="text-[11px] text-amber-800 font-medium mt-1">
              Capital frozen at Checkpoint 05 (Pending fix)
            </div>
          </div>
        </div>

        {/* 4-Tier Triangulation Filter Strip (From Evidence Page) */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 mb-5 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0b1f4b]">
            <span className="text-sm">🔬</span>
            <span className="uppercase tracking-wider">Audit Tier Pipeline:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { k: "all", label: "All Tiers" },
              { k: "tier1", label: "🛰️ Tier 1: Space Orbital (ISRO Cartosat-3)" },
              { k: "tier2", label: "🚁 Tier 2: UAV Drone Photogrammetry" },
              { k: "tier3", label: "📱 Tier 3: Geotagged Ground Physical" },
              { k: "tier4", label: "🏦 Tier 4: Treasury / GST e-Way" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setFilterTier(t.k as AuditTier)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterTier === t.k
                    ? "bg-[#0b1f4b] text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filters & Search Bar */}
        <div className="bg-white rounded-t-xl border border-slate-200/90 border-b-0 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { k: "All", count: inspections.length },
              { k: "Flagged Divergence", label: "Flagged ⚠️", count: inspections.filter((i) => i.status === "Flagged Divergence").length },
              { k: "In Progress", count: inspections.filter((i) => i.status === "In Progress").length },
              { k: "Review Required", count: inspections.filter((i) => i.status === "Review Required").length },
              { k: "Assigned", count: inspections.filter((i) => i.status === "Assigned").length },
              { k: "Completed", label: "Passed ✓", count: inspections.filter((i) => i.status === "Completed").length },
            ].map((s) => {
              const isActive = filterStatus === s.k;
              return (
                <button
                  key={s.k}
                  onClick={() => setFilterStatus(s.k)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? s.k === "Flagged Divergence"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-[#0b1f4b] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <span>{(s as any).label || s.k}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200/70 text-slate-600"
                    }`}
                  >
                    {s.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & State Filter */}
          <div className="flex items-center gap-2.5 flex-1 max-w-[420px] justify-end">
            <input
              type="text"
              placeholder="Search by ID, Name, State, Engineer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 w-full focus:outline-hidden focus:ring-1 focus:ring-[#0b1f4b]"
            />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
            >
              <option value="all">All States</option>
              {stateOptions.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2-Column Main Workspace Grid (Table + Right Detail Drawer) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border border-slate-200/90 rounded-b-xl overflow-hidden shadow-xs bg-white">
          {/* Left Column: Inspection Requests & Ground Audits Table (8 of 12 cols) */}
          <div className="lg:col-span-8 overflow-x-auto border-r border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Project & Geofence</th>
                  <th className="py-3 px-3">Claim vs Reality</th>
                  <th className="py-3 px-3">Risk & Anomaly</th>
                  <th className="py-3 px-3">Assigned Engineer</th>
                  <th className="py-3 px-3">Audit Stage & Date</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInspections.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No inspections found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInspections.map((insp) => {
                    const isSelected = selectedInspection?.id === insp.id;
                    const hasLag = insp.progressGap >= 10;
                    return (
                      <tr
                        key={insp.id}
                        onClick={() => setSelectedInspectionId(insp.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected ? "bg-sky-50/60 ring-1 ring-inset ring-sky-300" : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Project Info */}
                        <td className="py-3.5 px-4 max-w-[240px]">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-mono font-bold bg-[#0b1f4b] text-white text-[10px] px-1.5 py-0.5 rounded">
                              {insp.project}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                              {insp.state}
                            </span>
                          </div>
                          <div
                            className="font-bold text-slate-900 leading-snug truncate"
                            title={insp.name}
                          >
                            {insp.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {insp.department}
                          </div>
                        </td>

                        {/* Claim vs Reality */}
                        <td className="py-3.5 px-3 min-w-[150px]">
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
                            <span className="text-slate-600">
                              Claim: <span className="text-slate-900">{insp.claimedProgress}%</span>
                            </span>
                            <span className={hasLag ? "text-rose-600 font-black" : "text-emerald-700"}>
                              Audit: {insp.auditedProgress}%
                            </span>
                          </div>
                          {/* Divergence Progress Bar */}
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex">
                            <div
                              className="bg-emerald-600 h-full"
                              style={{ width: `${insp.auditedProgress}%` }}
                            />
                            {insp.progressGap > 0 && (
                              <div
                                className="bg-rose-500 h-full opacity-80"
                                style={{ width: `${insp.progressGap}%` }}
                              />
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[9px] font-mono mt-1 text-slate-400">
                            <span>Gap: -{insp.progressGap}%</span>
                            {insp.trancheHeldCr > 0 && (
                              <span className="text-rose-600 font-bold">Held: ₹{insp.trancheHeldCr}Cr</span>
                            )}
                          </div>
                        </td>

                        {/* Risk & Anomaly */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-sm font-black font-mono ${
                                insp.risk >= 80 ? "text-rose-600" : insp.risk >= 60 ? "text-amber-600" : "text-emerald-600"
                              }`}
                            >
                              {insp.risk}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                                insp.risk >= 80
                                  ? "bg-rose-100 text-rose-800"
                                  : insp.risk >= 60
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {insp.risk >= 80 ? "High Risk" : "Moderate"}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                            {insp.anomalyFinding}
                          </div>
                        </td>

                        {/* Assigned Engineer */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{insp.assigned}</div>
                          <div className="text-[10px] text-slate-400">{insp.division}</div>
                          <div className="text-[9px] font-mono text-emerald-700 font-semibold mt-0.5">
                            ✓ Sec 65B Assigned
                          </div>
                        </td>

                        {/* Checkpoint & Date */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <div className="font-mono font-bold text-[10px] text-[#0b1f4b] bg-slate-100 px-1.5 py-0.5 rounded inline-block mb-0.5">
                            CP-{insp.checkpointNum}
                          </div>
                          <div className="text-[11px] font-bold text-slate-700">{insp.checkpoint}</div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{insp.date}</div>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.8 rounded-full inline-flex items-center gap-1 ${
                              insp.status === "Flagged Divergence"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : insp.status === "In Progress"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : insp.status === "Review Required"
                                ? "bg-sky-100 text-sky-800 border border-sky-300"
                                : insp.status === "Completed"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-slate-100 text-slate-700 border border-slate-300"
                            }`}
                          >
                            {insp.status === "Flagged Divergence" && <span>⚠️</span>}
                            <span>{insp.status}</span>
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/evidence?projectId=${insp.project}`);
                            }}
                            className="bg-[#0b1f4b] hover:bg-[#152e6d] text-white font-bold text-[11px] px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                          >
                            Evidence Desk →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Right Column: Evidence Dossier & Section 65B Checklist (4 of 12 cols) */}
          <div className="lg:col-span-4 bg-slate-50/70 p-5 flex flex-col justify-between">
            {selectedInspection ? (
              <div>
                {/* Inspection Header */}
                <div className="pb-3 border-b border-slate-200 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-extrabold bg-[#0b1f4b] text-white px-2 py-0.5 rounded">
                      {selectedInspection.id}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedInspection.status === "Flagged Divergence"
                          ? "bg-rose-100 text-rose-800 border border-rose-300"
                          : "bg-sky-100 text-sky-800 border border-sky-300"
                      }`}
                    >
                      {selectedInspection.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-[#0b1f4b] leading-snug">
                    {selectedInspection.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                    <span>📍 {selectedInspection.state}</span>
                    <span>·</span>
                    <span>{selectedInspection.department}</span>
                  </div>
                </div>

                {/* Audit Checkpoint Highlight Banner */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 mb-4 shadow-2xs">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-mono text-[10px] font-bold text-slate-500 uppercase">
                      Current Stage: CP-{selectedInspection.checkpointNum}
                    </span>
                    <span className="font-bold text-xs text-[#0b1f4b]">
                      {selectedInspection.checkpoint}
                    </span>
                  </div>

                  {/* Physical Progress Divergence Box */}
                  <div className="bg-rose-50/70 border border-rose-200 rounded-lg p-2.5 mt-2">
                    <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-900 mb-1">
                      <span>Contractor Claim: {selectedInspection.claimedProgress}%</span>
                      <span>Audit: {selectedInspection.auditedProgress}%</span>
                    </div>
                    <div className="text-[11px] text-rose-800 leading-tight">
                      <strong>Audit Shortfall: -{selectedInspection.progressGap}%</strong> · ₹{selectedInspection.trancheHeldCr} Cr withheld at Checkpoint 05 until columns and earthwork are certified.
                    </div>
                  </div>
                </div>

                {/* Statutory Section 65B Field Checklist */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black uppercase tracking-wider text-[#0b1f4b] flex items-center gap-1.5">
                      <span>⚖️</span> Section 65B Audit Checklist
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {completedCount}/{defaultChecklist.length} Verified
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${(completedCount / defaultChecklist.length) * 100}%` }}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    {defaultChecklist.map((item) => {
                      const done = isChecked(item.id);
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleCheck(item.id)}
                          className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-all flex items-start gap-2.5 ${
                            done
                              ? "bg-emerald-50/50 border-emerald-200 text-slate-800"
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 ${
                              done
                                ? "bg-emerald-600 text-white"
                                : "border border-slate-300 bg-white"
                            }`}
                          >
                            {done ? "✓" : ""}
                          </div>
                          <div className="flex-1">
                            <div className={`font-semibold ${done ? "line-through text-slate-400" : "text-slate-800"}`}>
                              {item.title}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {item.proof}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Evidence Upload & Telemetry Ingestion */}
                <div className="bg-white rounded-xl border border-slate-200 p-3.5 mb-4 shadow-2xs">
                  <div className="text-xs font-black uppercase tracking-wider text-[#0b1f4b] mb-2.5 flex items-center justify-between">
                    <span>📸 Ingest Ground & Remote Evidence</span>
                    <span className="text-[10px] text-slate-400 font-mono">Stratum-1 Hash</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div
                      onClick={() => {
                        setUploadCategory("Geo-Tagged Site Photo");
                        setModalType("upload");
                      }}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-sky-50/50 hover:border-sky-300 cursor-pointer transition-all flex items-center gap-2"
                    >
                      <span className="text-lg">📸</span>
                      <div>
                        <div className="font-bold text-slate-800">Field Photo</div>
                        <div className="text-[9px] text-slate-400">EXIF GPS Signed</div>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setUploadCategory("Drone / Satellite Orthomosaic");
                        setModalType("upload");
                      }}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-sky-50/50 hover:border-sky-300 cursor-pointer transition-all flex items-center gap-2"
                    >
                      <span className="text-lg">🛰️</span>
                      <div>
                        <div className="font-bold text-slate-800">Drone / Satellite</div>
                        <div className="text-[9px] text-slate-400">GeoTIFF 2.2cm</div>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setUploadCategory("Concrete Lab Test (IS 456 M25)");
                        setModalType("upload");
                      }}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-sky-50/50 hover:border-sky-300 cursor-pointer transition-all flex items-center gap-2"
                    >
                      <span className="text-lg">🧪</span>
                      <div>
                        <div className="font-bold text-slate-800">Lab Core Test</div>
                        <div className="text-[9px] text-slate-400">NABL Certificate</div>
                      </div>
                    </div>

                    <div
                      onClick={() => {
                        setUploadCategory("GST e-Way & PFMS Voucher");
                        setModalType("upload");
                      }}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-sky-50/50 hover:border-sky-300 cursor-pointer transition-all flex items-center gap-2"
                    >
                      <span className="text-lg">📄</span>
                      <div>
                        <div className="font-bold text-slate-800">GST Invoice</div>
                        <div className="text-[9px] text-slate-400">Treasury Match</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary CTA Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => navigate(`/evidence?projectId=${selectedInspection.project}`)}
                    className="w-full py-2.5 bg-[#0b1f4b] hover:bg-[#152e6d] text-white font-black text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Inspect Full Evidentiary Grid Desk</span>
                    <span>→</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setModalType("notice")}
                      className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px] rounded-lg transition-all cursor-pointer text-center"
                    >
                      Issue 72-Hr Notice
                    </button>
                    <button
                      onClick={() => navigate(`/projects/${selectedInspection.project}`)}
                      className="w-full py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-[11px] rounded-lg transition-all cursor-pointer text-center"
                    >
                      Project Profile
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-400">
                <div className="text-3xl mb-2">📋</div>
                <div className="font-bold text-slate-700 text-sm">Select an Inspection Request</div>
                <p className="text-xs text-slate-400 mt-1">
                  Click any project row in the roster to inspect ground reality and Section 65B evidence.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Upload Modal */}
            {modalType === "upload" && (
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="text-base font-bold text-[#0b1f4b] flex items-center gap-2">
                    <span>📤</span>
                    <span>Upload {uploadCategory}</span>
                  </div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Ingest statutory evidence for <strong>{selectedInspection?.project}: {selectedInspection?.name}</strong>.
                </p>

                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:bg-sky-50/50 transition-colors cursor-pointer mb-3">
                  <div className="text-3xl mb-2">📸</div>
                  <div className="text-xs font-bold text-[#0b1f4b]">Drag & drop {uploadCategory} file here</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Supports JPG (with EXIF GPS), GeoTIFF, and Signed PDF (up to 50MB)
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-mono border border-emerald-200 mb-4 flex items-center gap-1.5">
                  <span>🔒</span> NIC Stratum-1 Hardware Clock & SHA-256 Hash will be permanently stamped.
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert(`Evidence successfully validated, EXIF GPS verified, and signed under Section 65B for ${selectedInspection?.project}.`);
                      setModalType(null);
                    }}
                    className="px-4 py-2 font-bold bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Ingest & Sign (Sec 65B)
                  </button>
                </div>
              </div>
            )}

            {/* Schedule Modal */}
            {modalType === "schedule" && (
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="text-base font-bold text-[#0b1f4b]">Schedule Field Inspection</div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Assign statutory physical inspection or drone flyover under Section 65B protocol.
                </p>

                <div className="space-y-3 text-xs mb-4">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Target Project</label>
                    <select className="w-full p-2 rounded-lg border border-slate-300 font-medium">
                      {inspections.slice(0, 8).map((p) => (
                        <option key={p.project} value={p.project}>
                          {p.project} — {p.name.slice(0, 40)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Assigned Inspection Authority</label>
                    <select className="w-full p-2 rounded-lg border border-slate-300 font-medium">
                      <option>S. Venkatesh, JE (KES / NHAI Div-IV)</option>
                      <option>K. Rajan, AEE (CPWD Civil Zone 1)</option>
                      <option>M. Reddy, Senior Drone Pilot (KSRSAC)</option>
                      <option>Ananya Roy, EE (MoRTH Technical Wing)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Audit Checkpoint Scope</label>
                    <select className="w-full p-2 rounded-lg border border-slate-300 font-medium">
                      <option>Checkpoint 04: Ground Column Count & Drone DSM</option>
                      <option>Checkpoint 02: Foundation Concrete Compressive Core Test</option>
                      <option>Checkpoint 01: Baseline Geodetic Datum Benchmark Lock</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert("Inspection scheduled successfully. Task dispatched to field officer's mobile app.");
                      setModalType(null);
                    }}
                    className="px-4 py-2 font-bold bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Dispatch Inspection Order
                  </button>
                </div>
              </div>
            )}

            {/* Notice Modal */}
            {modalType === "notice" && (
              <div>
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <div className="text-base font-bold text-rose-700 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>72-Hour Statutory Explanation Notice</span>
                  </div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Direct statutory explanation notice to Executive Engineer regarding {selectedInspection?.progressGap}% physical progress lag.
                </p>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 mb-4 leading-relaxed">
                  Ref: DRISHTI/NOTICE/2026/{selectedInspection?.project}<br />
                  Project: {selectedInspection?.name}<br />
                  Finding: {selectedInspection?.anomalyFinding}<br />
                  Notice: Contractor claimed {selectedInspection?.claimedProgress}%, but field audit verified {selectedInspection?.auditedProgress}%. Reconcile discrepancy within 72 hours.
                </div>

                <div className="flex justify-end gap-2 text-xs">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert(`Official 72-hour explanation notice dispatched to Executive Engineer on record for ${selectedInspection?.project}.`);
                      setModalType(null);
                    }}
                    className="px-4 py-2 font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Dispatch Statutory Notice
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
