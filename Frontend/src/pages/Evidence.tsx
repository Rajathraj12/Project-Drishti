import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { projectService } from "../services/projectService";
import { Project } from "../types";

type Tab = "all" | "photos" | "inspections" | "documents" | "remote";
type ViewTab = "desk" | "report";

interface EvidenceItem {
  id: string;
  title: string;
  type: "photos" | "inspections" | "documents" | "remote";
  typeLabel: string;
  date: string;
  status: "Verified" | "Verified Discrepancy" | "Analyzed" | "Pending";
  statusColor: "green" | "amber" | "blue" | "red";
  description: string;
  source: string;
  actionText: string;
  image?: string;
  overlayBadge?: string;
  voucherData?: {
    amount: string;
    ref: string;
    subTags: string[];
  };
  qcData?: {
    standard: string;
    result: string;
    subTags: string[];
  };
}

export default function Evidence() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectIdParam = searchParams.get("projectId");

  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projectIdParam || "DR-0001");
  const [loadingProjects, setLoadingProjects] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [viewTab, setViewTab] = useState<ViewTab>("report");
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number>(4);
  const [showGhostGrid, setShowGhostGrid] = useState(false);
  const [matchPercentage, setMatchPercentage] = useState(54.2);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sliderPos, setSliderPos] = useState(50);
  const [comparisonMode, setComparisonMode] = useState<"side-by-side" | "slider">("side-by-side");
  const [dragging, setDragging] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState<string | null>(null);
  const [modalData, setModalData] = useState<any>(null);

  // Load real projects from backend
  useEffect(() => {
    projectService
      .getProjects()
      .then((res) => {
        const list = res.results || [];
        setProjectsList(list);
        if (list.length > 0) {
          if (projectIdParam && list.some((p) => p.project_id === projectIdParam)) {
            setSelectedProjectId(projectIdParam);
          } else {
            setSelectedProjectId(list[0].project_id);
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load real projects for evidence desk", err);
      })
      .finally(() => {
        setLoadingProjects(false);
      });
  }, [projectIdParam]);

  // Find currently active project
  const currentProject = useMemo(() => {
    return (
      projectsList.find((p) => p.project_id === selectedProjectId) || {
        project_id: selectedProjectId || "DR-0001",
        project_name: "Delhi-Amritsar-Katra Expressway Phase-I (Punjab Section)",
        state: "Punjab",
        department: "Roads & Highways",
        original_cost: 15400000000,
        original_cost_cr: 1540,
        revised_cost_cr: 1820,
        expenditure_cr: 764.4,
        reported_progress: 42.0,
      }
    );
  }, [projectsList, selectedProjectId]);

  const claimedProgress = currentProject.reported_progress != null ? Number(currentProject.reported_progress).toFixed(1) : "42.0";
  const auditedProgress = Math.max(8.0, (Number(claimedProgress) * 0.38)).toFixed(1);
  const progressGap = (Number(claimedProgress) - Number(auditedProgress)).toFixed(1);
  const totalCostCr = currentProject.revised_cost_cr || currentProject.original_cost_cr || 1540;
  const invoicedTrancheCr = ((totalCostCr * Number(claimedProgress)) / 100).toFixed(2);
  const verifiedTrancheCr = ((totalCostCr * Number(auditedProgress)) / 100).toFixed(2);
  const unverifiedGapCr = (Number(invoicedTrancheCr) - Number(verifiedTrancheCr)).toFixed(2);

  const checkpoints = useMemo(() => [
    {
      num: "01",
      id: "cp1",
      name: "Baseline Geo-Lock",
      stage: "Initial Site Datum",
      date: "15 Jan 2026",
      status: "PASSED",
      statusColor: "emerald",
      icon: "✓",
      summary: "Site boundary coordinates, benchmark elevation & survey datum frozen.",
      proof: "12 Geo-photos · EAL Hash 8f4c...3e12",
      detailedFinding: `NIC Geo-tagging server confirmed spatial coordinates and ground elevation datum locked for ${currentProject.project_id} prior to commencement.`,
    },
    {
      num: "02",
      id: "cp2",
      name: "Substructure & Plinth",
      stage: "Foundation Audit",
      date: "18 Apr 2026",
      status: "PASSED",
      statusColor: "emerald",
      icon: "✓",
      summary: "Foundation excavation depth and concrete compressive strength verified.",
      proof: "IS 456 M25 Core Test: 27.8 N/mm² (Pass)",
      detailedFinding: `Laboratory core test certified by NABL-accredited Quality Control division in ${currentProject.state}. Substructure integrity confirmed.`,
    },
    {
      num: "03",
      id: "cp3",
      name: "Contractor Invoiced Claim",
      stage: "Milestone #4 Invoice",
      date: "22 Jul 2026",
      status: "INVOICED",
      statusColor: "sky",
      icon: "03",
      summary: `Contractor submitted bill claiming ${claimedProgress}% completion (Milestone #4).`,
      proof: `Invoiced Tranche: ₹${invoicedTrancheCr} Cr · Bill #TR-9021`,
      detailedFinding: `Agency claimed complete column framework erected for ${currentProject.project_name} and billed for ₹${invoicedTrancheCr} Cr.`,
    },
    {
      num: "04",
      id: "cp4",
      name: "Ground & Drone Audit",
      stage: "Physical Inspection",
      date: "18 Sep 2026",
      status: "FLAGGED ⚠️",
      statusColor: "rose",
      icon: "⚠️",
      summary: `Field engineer & drone scan confirmed only 4 of 24 pillars standing (${auditedProgress}% actual).`,
      proof: `Shortfall: 20 Columns · Lag: -${progressGap}%`,
      detailedFinding: `Critical divergence between contractor claim and ground reality. 20 required reinforced concrete columns are missing from the site.`,
    },
    {
      num: "05",
      id: "cp5",
      name: "Tranche Clearance",
      stage: "Financial Release",
      date: "Active Desk",
      status: "HELD 🛑",
      statusColor: "red",
      icon: "🛑",
      summary: `Disbursement of ₹${unverifiedGapCr} Cr blocked until the 20 columns are erected.`,
      proof: "Statutory 72-Hr Explanation Notice Issued",
      detailedFinding: `Financial disbursement withheld by Central Project Authority pending physical rectification and re-inspection.`,
    },
  ], [currentProject, claimedProgress, auditedProgress, progressGap, invoicedTrancheCr, unverifiedGapCr]);

  // Change project handler
  const handleSelectProject = (id: string) => {
    setSelectedProjectId(id);
    setSearchParams({ projectId: id });
  };

  const handleSliderDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(5, Math.min(95, pos)));
  };

  // Dynamic Milestone Trail based on real project
  const dynamicMilestones = [
    {
      id: "m1",
      date: "15 JAN 2026",
      badge: "Verified",
      badgeColor: "#0284c7",
      title: "Foundation & Excavation",
      detail: "12 Ground Geo-photos · Baseline locked",
      active: false,
    },
    {
      id: "m2",
      date: "18 APR 2026",
      badge: "Verified",
      badgeColor: "#0284c7",
      title: "Plinth Level Progress",
      detail: "8 Ground Geo-photos · Bar bending checks",
      active: false,
    },
    {
      id: "m3",
      date: "22 JUL 2026",
      badge: "Submitted",
      badgeColor: "#38bdf8",
      title: `Agency Milestone #${currentProject.project_id}`,
      detail: `Contractor claimed ${claimedProgress}% progress · Pending cross-audit`,
      active: false,
    },
    {
      id: "m4",
      date: "18 SEP 2026",
      badge: "Flagged",
      badgeColor: "#e11d48",
      title: "Q3 Independent Physical Audit",
      detail: `Audited physical progress is only ${auditedProgress}% · Structural divergence`,
      active: false,
    },
    {
      id: "m5",
      date: "TODAY",
      badge: "Active Desk",
      badgeColor: "#0f2a6b",
      title: "Executive Review Pending",
      detail: "QA Sign-off paused until column shortfall resolved",
      active: true,
    },
  ];

  // Dynamic Evidence Cards
  const dynamicCards: EvidenceItem[] = [
    {
      id: `EV-${currentProject.project_id}-01`,
      title: `${currentProject.project_name.slice(0, 42)}... Column Reinforcement`,
      type: "photos",
      typeLabel: "Photo",
      date: "18 Sep 2026",
      status: "Verified Discrepancy",
      statusColor: "amber",
      image: "/evidence_current.jpg",
      description: `Physical site inspection in ${currentProject.state} detected only 4 of 24 required pillars erected, contrary to contractor's invoiced Stage 4 completion claim.`,
      source: "Junior Engineer Field Inspection",
      actionText: "View Telemetry",
    },
    {
      id: `DOC-${currentProject.project_id}-02`,
      title: "Cement & Steel Procurement Invoices",
      type: "documents",
      typeLabel: "Document (PDF)",
      date: "02 Aug 2026",
      status: "Verified",
      statusColor: "green",
      voucherData: {
        amount: `₹${(Number(unverifiedGapCr) * 10).toFixed(0)},20,000`,
        ref: `Treasury Direct Debit JKA-TR-9021 · ${currentProject.project_id}`,
        subTags: ["GSTIN Corroborated", "Bank Reference Matched"],
      },
      description: "Consolidated purchase order receipts for 160 Metric Tonnes of TMT Grade Fe-550 steel rebars and 900 cement bags stored at local depot.",
      source: "Treasury Direct Debit",
      actionText: "Download Signed PDF",
    },
    {
      id: `SAT-${currentProject.project_id}-03`,
      title: "Drone Aerial Orthomosaic Survey",
      type: "remote",
      typeLabel: "Remote Imagery",
      date: "28 Aug 2026",
      status: "Analyzed",
      statusColor: "blue",
      image: "/evidence_drone.jpg",
      overlayBadge: "GSD: 2.2 cm/pixel",
      description: `Sub-centimeter volumetric photogrammetry in ${currentProject.state} confirmed actual plinth perimeter volume differs from contractor bill by 18%.`,
      source: "State Remote Sensing Applications Centre",
      actionText: "Launch GIS",
    },
    {
      id: `SAT-${currentProject.project_id}-05`,
      title: "ISRO Cartosat-3 Orbital Pass (Corridor Alignment)",
      type: "remote",
      typeLabel: "Satellite Imagery",
      date: "14 Sep 2026",
      status: "Verified",
      statusColor: "blue",
      image: "/evidence_satellite.jpg",
      overlayBadge: "ISRO 0.28m PAN+MX · LEO Orbit",
      description: `High-resolution orbital pass by ISRO Cartosat-3 (505 km polar orbit) tracking project corridor right-of-way, river crossing foundations, and batching plant coordinates for ${currentProject.project_name}.`,
      source: "ISRO NRSC (National Remote Sensing Centre)",
      actionText: "Inspect Satellite Telemetry",
    },
    {
      id: `QC-${currentProject.project_id}-04`,
      title: "Structural Safety Test Certificate",
      type: "inspections",
      typeLabel: "Inspection Report",
      date: "15 Jan 2026",
      status: "Verified",
      statusColor: "green",
      qcData: {
        standard: "IS 456:2000 Grade M25",
        result: "Compressive Core Test: 27.8 N/mm² (Passed)",
        subTags: ["Lab Ref: QC-BLR-912", "NABL Accredited"],
      },
      description: "Laboratory compressive crushing test documentation and rebound hammer analysis signed by Senior Quality Control Engineer.",
      source: "Quality Control Division",
      actionText: "View Certificate",
    },
  ];

  const filteredCards = activeTab === "all" ? dynamicCards : dynamicCards.filter((c) => c.type === activeTab);

  return (
    <div className="bg-[#f0f4f9] min-h-screen text-slate-800 font-sans pb-16">
      {/* Top Breadcrumb Bar */}
      <div className="bg-[#0b1f4b] text-white px-6 py-2.5 flex flex-wrap items-center justify-between text-xs border-b border-navy-800 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-white/60 cursor-pointer hover:underline" onClick={() => navigate("/dashboard")}>
            Home
          </span>
          <span className="text-white/40">›</span>
          <span className="text-white/60">Oversight Operations</span>
          <span className="text-white/40">›</span>
          <span className="text-white font-semibold">Evidence Desk</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded font-mono font-medium border border-sky-400/30">
            EVIDENTIARY GRID v2.4
          </span>
          <span className="bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded font-mono font-bold border border-amber-400/30">
            DOSSIER: {currentProject.project_id}
          </span>
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>NIC Certified Section 65B</span>
          </div>
        </div>
      </div>

      {/* Main Header & Dossier Selector */}
      <div className="max-w-[1440px] mx-auto px-6 pt-5 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-[760px]">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-[#0b1f4b] text-white font-mono font-bold text-[11px] px-2.5 py-0.5 rounded">
                {currentProject.project_id}
              </span>
              <span className="bg-slate-200 text-slate-700 font-bold text-[11px] px-2 py-0.5 rounded">
                {currentProject.state}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {currentProject.department || "Infrastructure"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-[#0b1f4b] tracking-tight leading-snug">
              {currentProject.project_name}
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Official audited digital repository of time-stamped photographs, physical inspection reports, and remote imagery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Real Project Dossier Selector */}
            <div className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 shadow-xs text-xs flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Select Project Dossier:</span>
              <select
                className="font-bold text-[#0b1f4b] bg-transparent outline-none cursor-pointer max-w-[240px] truncate"
                value={selectedProjectId}
                onChange={(e) => handleSelectProject(e.target.value)}
              >
                {projectsList.map((p) => (
                  <option key={p.project_id} value={p.project_id}>
                    {p.project_id} — {p.project_name.slice(0, 36)}... ({p.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Quick View Button for Project Details */}
            <button
              onClick={() => navigate(`/projects/${currentProject.project_id}`)}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold px-3 py-2 rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <span>Project Details</span>
              <span>↗</span>
            </button>

            {/* Flag Inconsistency Button */}
            <button
              onClick={() => {
                setModalType("flag");
                setModalData(currentProject);
              }}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold px-3 py-2 rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
              <span>Flag Discrepancy</span>
            </button>

            {/* Upload Button */}
            <button
              onClick={() => {
                setModalType("upload");
                setModalData(currentProject);
              }}
              className="bg-[#0b1f4b] hover:bg-[#152e6d] text-white font-bold px-3.5 py-2 rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload Evidence</span>
            </button>
          </div>
        </div>

        {/* Mode Switcher: Visual Desk vs Plain-English Executive Report */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewTab("desk")}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                viewTab === "desk"
                  ? "bg-[#0b1f4b] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="12" y1="3" x2="12" y2="21" />
              </svg>
              <span>Interactive Verification Desk</span>
            </button>

            <button
              onClick={() => setViewTab("report")}
              className={`px-4 py-2 rounded-lg text-xs font-black flex items-center gap-2 transition-all cursor-pointer ${
                viewTab === "report"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <span>Easy-to-Understand Audit Report (Plain-English Brief)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setModalType("export");
                setModalData(currentProject);
              }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export Signed PDF</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* VIEW 1: EASY-TO-UNDERSTAND EXECUTIVE REPORT                  */}
        {/* ============================================================ */}
        {viewTab === "report" && (
          <div className="mt-5 space-y-6 animate-in fade-in duration-200">
            {/* Visual Audit Checkpoint Track */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <h3 className="text-sm font-black text-[#0b1f4b] uppercase tracking-wider">
                      Statutory Audit Checkpoint Track — {currentProject.project_id}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Click any checkpoint along the audit trail to inspect verified ground evidence and timestamps.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Pipeline Status:</span>
                  <span className="bg-rose-100 text-rose-800 border border-rose-300 font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <span>🛑</span> Checkpoint 04 Failed · Payment Blocked at Checkpoint 05
                  </span>
                </div>
              </div>

              {/* Connecting Pipeline Stepper */}
              <div className="relative">
                {/* Horizontal connection line behind nodes */}
                <div className="hidden md:block absolute top-[28px] left-[10%] right-[10%] h-[4px] bg-slate-200 z-0">
                  {/* Passed track up to CP-3 */}
                  <div className="h-full bg-emerald-500 w-[50%]" />
                  {/* Alert track from CP-3 to CP-4 */}
                  <div className="absolute top-0 left-[50%] w-[25%] h-full bg-gradient-to-r from-emerald-500 to-rose-500" />
                  {/* Blocked track from CP-4 to CP-5 */}
                  <div className="absolute top-0 left-[75%] w-[25%] h-full border-t-2 border-dashed border-rose-400 bg-transparent" />
                </div>

                {/* The 5 Checkpoint Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative z-10">
                  {checkpoints.map((cp, idx) => {
                    const isSelected = selectedCheckpoint === idx + 1;
                    return (
                      <div
                        key={cp.id}
                        onClick={() => setSelectedCheckpoint(idx + 1)}
                        className={`p-3.5 rounded-xl border transition-all text-center cursor-pointer ${
                          isSelected
                            ? "bg-slate-50 border-[#0b1f4b] shadow-md ring-2 ring-[#0b1f4b]/20"
                            : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs"
                        }`}
                      >
                        {/* Circular badge */}
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-4 border-white mx-auto mb-2 transition-transform duration-200 ${
                            isSelected ? "scale-110" : ""
                          } ${
                            cp.statusColor === "emerald"
                              ? "bg-emerald-600 text-white"
                              : cp.statusColor === "sky"
                              ? "bg-sky-600 text-white"
                              : cp.statusColor === "rose"
                              ? "bg-rose-600 text-white animate-pulse"
                              : "bg-[#0b1f4b] text-rose-300"
                          }`}
                        >
                          {cp.icon}
                        </div>

                        {/* Checkpoint Number & Status Pill */}
                        <div className="flex items-center justify-center gap-1.5 mb-1">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            CP-{cp.num}
                          </span>
                          <span
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                              cp.statusColor === "emerald"
                                ? "bg-emerald-100 text-emerald-800"
                                : cp.statusColor === "sky"
                                ? "bg-sky-100 text-sky-800"
                                : cp.statusColor === "rose"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-slate-900 text-rose-300"
                            }`}
                          >
                            {cp.status}
                          </span>
                        </div>

                        {/* Title & Date */}
                        <div className="font-bold text-xs text-slate-900 leading-tight mb-0.5">
                          {cp.name}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mb-1.5">
                          {cp.date}
                        </div>
                        <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                          {cp.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Selected Checkpoint Highlight Detail Drawer */}
                {selectedCheckpoint && (
                  <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold bg-[#0b1f4b] text-white px-2 py-1 rounded text-xs">
                        CP-0{selectedCheckpoint} Detail
                      </span>
                      <div>
                        <span className="font-bold text-slate-800 mr-2">
                          {checkpoints[selectedCheckpoint - 1].name}:
                        </span>
                        <span className="text-slate-600">
                          {checkpoints[selectedCheckpoint - 1].detailedFinding}
                        </span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-slate-700 bg-white px-3 py-1 rounded border border-slate-200 text-[11px] shadow-2xs">
                      🔍 Evidence: {checkpoints[selectedCheckpoint - 1].proof}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Summary Banner */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 px-6 py-4 text-white flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-lg">
                    ⚠️
                  </span>
                  <div>
                    <h2 className="text-base font-black tracking-tight">
                      Official Evidence Audit Findings — Project {currentProject.project_id}
                    </h2>
                    <p className="text-xs text-white/90">
                      Physical Inspection & Remote Sensing Reconciliation Report · Prepared for Project Authority
                    </p>
                  </div>
                </div>
                <div className="bg-white text-amber-900 font-mono text-xs font-black px-3 py-1 rounded-full shadow-xs">
                  STATUS: AUDIT DISCREPANCY FLAGGED
                </div>
              </div>

              {/* Plain English Takeaway */}
              <div className="p-6">
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 mb-6">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <span>📌</span> What You Need to Know (In Plain Words)
                  </div>
                  <p className="text-sm text-slate-800 leading-relaxed font-medium">
                    The contractor submitted invoices claiming that <strong>{claimedProgress}% of work is completed</strong> (Milestone #4: Superstructure Column Framework). 
                    However, the on-site physical inspection and high-resolution drone scans conducted on 18 Sep 2026 proved that <strong>only {auditedProgress}% of work is actually completed on the ground</strong>. 
                    Only <strong>4 of 24 required reinforced columns</strong> have been built. 
                    Therefore, a financial tranche of <strong>₹{unverifiedGapCr} Crores has been held back</strong> until the contractor completes the missing 20 columns.
                  </p>
                </div>

                {/* 3 Clear Side-by-Side Comparison Blocks */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                  {/* Claim Card */}
                  <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        1. What Was Invoiced / Claimed
                      </span>
                      <span className="text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        Contractor
                      </span>
                    </div>
                    <div className="text-4xl font-black text-slate-800 tracking-tight">{claimedProgress}%</div>
                    <div className="text-xs font-bold text-slate-700 mt-1">Claim: Complete Column Framework</div>
                    <div className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span>Billed Amount:</span>
                      <span className="font-mono font-bold text-slate-900">₹{invoicedTrancheCr} Cr</span>
                    </div>
                  </div>

                  {/* Ground Reality Card */}
                  <div className="p-5 rounded-xl border border-rose-300 bg-rose-50/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                        2. What Was Found on Ground
                      </span>
                      <span className="text-xs font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                        Physical Reality
                      </span>
                    </div>
                    <div className="text-4xl font-black text-rose-700 tracking-tight">{auditedProgress}%</div>
                    <div className="text-xs font-bold text-rose-900 mt-1">Observed: Only 4 of 24 Columns Built</div>
                    <div className="text-xs text-rose-700 mt-3 pt-3 border-t border-rose-200 flex items-center justify-between">
                      <span>Verified Value:</span>
                      <span className="font-mono font-bold text-rose-950">₹{verifiedTrancheCr} Cr</span>
                    </div>
                  </div>

                  {/* Discrepancy Gap Card */}
                  <div className="p-5 rounded-xl border border-amber-300 bg-amber-50/70">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                        3. The Unaccounted Gap
                      </span>
                      <span className="text-xs font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                        Audit Shortfall
                      </span>
                    </div>
                    <div className="text-4xl font-black text-amber-700 tracking-tight">-{progressGap}%</div>
                    <div className="text-xs font-bold text-amber-900 mt-1">Shortfall: 20 Unbuilt Columns</div>
                    <div className="text-xs text-amber-800 mt-3 pt-3 border-t border-amber-200 flex items-center justify-between">
                      <span>Payment Stopped:</span>
                      <span className="font-mono font-bold text-amber-950">₹{unverifiedGapCr} Cr</span>
                    </div>
                  </div>
                </div>

                {/* 4 Pillars of Evidence (Easy Explanations) */}
                <div className="mt-8">
                  <h3 className="text-sm font-black text-[#0b1f4b] uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>🔍</span> Complete Evidence Breakdown (Section 65B Audit Trail)
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Item 1 */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg shrink-0">
                        📸
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-xs text-[#0b1f4b]">1. Site Photographs (Field Engineer)</h4>
                          <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                            Discrepancy Confirmed
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Junior Engineer S. Venkatesh visited the site on 18 Sep 2026. The geo-tagged photos show only 4 pillars completed. Formwork scaffolding is missing for the rest of the site.
                        </p>
                      </div>
                    </div>

                    {/* Item 2 */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-lg shrink-0">
                        🛰️
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-xs text-[#0b1f4b]">2. Drone Aerial Photogrammetry (KSRSAC)</h4>
                          <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                            Analyzed & Divergent
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Drone flyover with 2cm/pixel resolution calculated a 3D elevation model of the plinth. The physical volume differs by 18% from the billing claims submitted by the contractor.
                        </p>
                      </div>
                    </div>

                    {/* Item 3 */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                        📄
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-xs text-[#0b1f4b]">3. Material Purchases & GST Invoices</h4>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            Materials In Yard
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Bank records confirm ₹45.2 Lakhs of Fe-550 TMT steel rebars were purchased. However, site inspection revealed the steel is sitting in the storage yard and has NOT been erected into columns.
                        </p>
                      </div>
                    </div>

                    {/* Item 4 */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                        🧪
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-bold text-xs text-[#0b1f4b]">4. Concrete Quality & Strength Test</h4>
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            Quality Passed (M25)
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          The 4 pillars that HAVE been poured meet government IS 456 standards with 27.8 N/mm² compressive strength. Structural safety of existing pillars is certified.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================================ */}
                {/* SATELLITE IMAGERY & ORBITAL TELEMETRY SPOTLIGHT             */}
                {/* ============================================================ */}
                <div className="mt-8 bg-gradient-to-br from-slate-900 via-[#0b1f4b] to-slate-950 text-white rounded-2xl p-6 shadow-md border border-slate-700/60 overflow-hidden relative">
                  <div className="relative z-10">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 flex items-center justify-center font-bold text-xl">
                          🛰️
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-black tracking-tight text-white">
                              ISRO Cartosat-3 Orbital Pass — Project Corridor Footprint
                            </h3>
                            <span className="bg-sky-500/20 text-sky-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded border border-sky-400/30">
                              0.28m GSD Panchromatic + 4-Band MX
                            </span>
                          </div>
                          <p className="text-xs text-sky-200/80 mt-0.5">
                            Spacecraft ID: C3-505 · Polar Sun-Synchronous LEO (505 km) · Track 43 / Frame 289
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono text-slate-300 bg-white/10 px-2.5 py-1 rounded border border-white/10">
                          Pass: 14 Sep 2026 · 10:42:18 IST
                        </span>
                        <button
                          onClick={() => setModalType("satellite")}
                          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1.5"
                        >
                          <span>Enlarge Satellite Telemetry</span>
                          <span>🔍</span>
                        </button>
                      </div>
                    </div>

                    {/* Visual Layout: Satellite Imagery Showcase + Telemetry Data */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      {/* Left: Satellite Image with Interactive Visual Overlays */}
                      <div 
                        onClick={() => setModalType("satellite")}
                        className="lg:col-span-7 relative rounded-xl overflow-hidden border border-sky-500/30 group bg-black shadow-lg min-h-[300px] cursor-pointer"
                      >
                        <img
                          src="/evidence_satellite.jpg"
                          alt="ISRO Cartosat-3 High-Resolution Satellite Pass"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Telemetry HUD Overlays */}
                        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                          <span className="bg-[#0b1f4b]/90 backdrop-blur-md text-sky-200 font-mono text-[10px] font-bold px-2.5 py-1 rounded border border-sky-400/30">
                            ISRO NRSC ORBITAL FEED · UTM 43N
                          </span>
                          <span className="bg-black/75 backdrop-blur-md text-emerald-300 font-mono text-[10px] px-2 py-0.5 rounded border border-emerald-500/30">
                            ● GEO-LOCKED TO SURVEY OF INDIA DATUM
                          </span>
                        </div>

                        {/* Tactical Annotation Markers on the Satellite View */}
                        <div className="absolute top-[35%] left-[45%] -translate-x-1/2 -translate-y-1/2 group/pin">
                          <div className="w-5 h-5 rounded-full bg-rose-500/40 animate-ping absolute inset-0" />
                          <div className="w-5 h-5 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-lg relative z-10">
                            !
                          </div>
                          <div className="absolute left-6 top-0 bg-slate-900/95 text-white text-[10px] px-2.5 py-1 rounded shadow-lg border border-rose-400 whitespace-nowrap hidden group-hover/pin:block z-20">
                            <strong>River Crossing:</strong> Only 4 bridge piers visible; 20 columns missing
                          </div>
                        </div>

                        <div className="absolute bottom-[28%] right-[22%] group/pin2">
                          <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-white flex items-center justify-center text-[9px] font-bold text-white shadow-lg">
                            ✓
                          </div>
                          <div className="absolute right-6 bottom-0 bg-slate-900/95 text-white text-[10px] px-2.5 py-1 rounded shadow-lg border border-sky-400 whitespace-nowrap hidden group-hover/pin2:block z-20">
                            <strong>Batching Plant:</strong> RMC depot detected on site boundary
                          </div>
                        </div>

                        {/* Bottom Banner on Image */}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 flex items-center justify-between text-xs">
                          <div className="font-mono text-[11px] text-sky-200">
                            Lat 31°18'42.1"N · Lon 75°34'19.8"E · Sun Elev: 62.4°
                          </div>
                          <span className="text-xs text-sky-300 font-bold group-hover:underline flex items-center gap-1">
                            Click to Expand Spectral Layers →
                          </span>
                        </div>
                      </div>

                      {/* Right: Space Observation Findings & Sensor Breakdown */}
                      <div className="lg:col-span-5 flex flex-col justify-between gap-3">
                        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                          <div className="text-[11px] font-bold text-sky-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <span>🛰️</span> Orbital Change Detection Findings
                          </div>
                          <ul className="space-y-2.5 text-xs text-slate-200">
                            <li className="flex items-start gap-2">
                              <span className="text-emerald-400 font-bold shrink-0">✓</span>
                              <span><strong>Right-of-Way (RoW) Cleared:</strong> 45m corridor alignment fully cleared without local encroachment across Chainage 14+200 to 18+600.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-rose-400 font-bold shrink-0">⚠️</span>
                              <span><strong>Structural Column Discrepancy:</strong> High-resolution optical scan confirms only 4 piers visible at river crossing. 20 claimed columns are absent from satellite footprint.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-sky-300 font-bold shrink-0">ℹ️</span>
                              <span><strong>Ground Staging Verified:</strong> Ready-mix concrete plant and rebar storage yard detected at site perimeter matching GST dispatch records.</span>
                            </li>
                          </ul>
                        </div>

                        {/* Telemetry Spec Matrix */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                            <div className="text-[10px] text-slate-400 font-mono">SENSOR TYPE</div>
                            <div className="font-bold text-white text-xs mt-0.5">ISRO Cartosat-3 PAN+MX</div>
                          </div>
                          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                            <div className="text-[10px] text-slate-400 font-mono">SPATIAL RESOLUTION</div>
                            <div className="font-bold text-sky-300 text-xs mt-0.5">0.28m Ground Pixel</div>
                          </div>
                          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                            <div className="text-[10px] text-slate-400 font-mono">SATELLITE ORBIT</div>
                            <div className="font-bold text-white text-xs mt-0.5">505 km Polar Sun-Sync</div>
                          </div>
                          <div className="bg-white/5 p-2.5 rounded-lg border border-white/10">
                            <div className="text-[10px] text-slate-400 font-mono">SPECTRAL BANDS</div>
                            <div className="font-bold text-emerald-300 text-xs mt-0.5">Panchromatic + 4 MX</div>
                          </div>
                        </div>

                        {/* Quick Modal Trigger */}
                        <button
                          onClick={() => setModalType("satellite")}
                          className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/20 transition-all text-center cursor-pointer flex items-center justify-center gap-2"
                        >
                          <span>Open Full Interactive Satellite Telemetry Suite</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ============================================================ */}
                {/* HOW DRISHTI AUDITS ARE MADE (4-TIER METHODOLOGY PIPELINE)    */}
                {/* ============================================================ */}
                <div className="mt-8 bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🔬</span>
                        <h3 className="text-base font-black text-[#0b1f4b] tracking-tight">
                          How Drishti Audits Are Conducted — The 4-Tier Triangulation Pipeline
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Every statutory finding is verified through an automated multi-layer audit chain connecting space telemetry, low-altitude photogrammetry, certified ground engineering, and public treasury banking.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      <span>IMMUTABLE SECTION 65B CHAIN</span>
                    </div>
                  </div>

                  {/* 4 Interactive Tier Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Tier 1 */}
                    <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/40 flex flex-col justify-between hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-sky-600 text-white px-2 py-0.5 rounded">
                            Tier 1 · Space Telemetry
                          </span>
                          <span className="text-lg">🛰️</span>
                        </div>
                        <h4 className="font-bold text-xs text-[#0b1f4b] mb-1.5">
                          Orbital Satellite Observation
                        </h4>
                        <div className="text-[11px] font-mono font-bold text-sky-800 mb-2">
                          ISRO Cartosat-3 & Sentinel-2 Radar
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          Captures bi-weekly 0.28m resolution satellite imagery over project geofences. AI computer vision automatically detects corridor right-of-way clearing, earthwork grading, and major structures without physical presence.
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-sky-200/80 text-[11px] font-medium text-sky-900 flex items-center justify-between">
                        <span>Why it matters:</span>
                        <span className="font-bold text-[10px] bg-white px-1.5 py-0.5 rounded border border-sky-300">Tamper-Proof Macro Truth</span>
                      </div>
                    </div>

                    {/* Tier 2 */}
                    <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 flex flex-col justify-between hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white px-2 py-0.5 rounded">
                            Tier 2 · UAV Drone Scans
                          </span>
                          <span className="text-lg">🚁</span>
                        </div>
                        <h4 className="font-bold text-xs text-[#0b1f4b] mb-1.5">
                          Low-Altitude Photogrammetry
                        </h4>
                        <div className="text-[11px] font-mono font-bold text-indigo-800 mb-2">
                          KSRSAC RTK Drone (2.2 cm/pixel)
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          Licensed UAV pilots execute autonomous grid missions at 75m altitude. Generates 3D Digital Elevation Models (DEM) and volumetric measurements to compute exact cubic meters of earthwork and structural column count.
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-indigo-200/80 text-[11px] font-medium text-indigo-900 flex items-center justify-between">
                        <span>Why it matters:</span>
                        <span className="font-bold text-[10px] bg-white px-1.5 py-0.5 rounded border border-indigo-300">Centimeter Precision</span>
                      </div>
                    </div>

                    {/* Tier 3 */}
                    <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded">
                            Tier 3 · Ground Physical
                          </span>
                          <span className="text-lg">📱</span>
                        </div>
                        <h4 className="font-bold text-xs text-[#0b1f4b] mb-1.5">
                          Geotagged Field Inspection
                        </h4>
                        <div className="text-[11px] font-mono font-bold text-emerald-800 mb-2">
                          Drishti Mobile App + Hardware GPS
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          Field engineers visit physical sites and capture evidence using the Drishti Mobile App. Photos embed hardware-level GPS, compass heading, barometric elevation, and Stratum-1 atomic clock timestamps.
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-emerald-200/80 text-[11px] font-medium text-emerald-900 flex items-center justify-between">
                        <span>Why it matters:</span>
                        <span className="font-bold text-[10px] bg-white px-1.5 py-0.5 rounded border border-emerald-300">Sec 65B Legal Admissibility</span>
                      </div>
                    </div>

                    {/* Tier 4 */}
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 flex flex-col justify-between hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded">
                            Tier 4 · Financial Triangulation
                          </span>
                          <span className="text-lg">🏦</span>
                        </div>
                        <h4 className="font-bold text-xs text-[#0b1f4b] mb-1.5">
                          Treasury & Material Matching
                        </h4>
                        <div className="text-[11px] font-mono font-bold text-amber-800 mb-2">
                          PFMS Releases + GST e-Way Bills
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed mb-3">
                          Automated cross-reconciliation of Public Financial Management System (PFMS) disbursements with GST invoices (cement bags, Fe-550 TMT steel) vs. physical quantities identified by satellites and drones.
                        </p>
                      </div>
                      <div className="pt-2.5 border-t border-amber-200/80 text-[11px] font-medium text-amber-900 flex items-center justify-between">
                        <span>Why it matters:</span>
                        <span className="font-bold text-[10px] bg-white px-1.5 py-0.5 rounded border border-amber-300">Stops Ghost Billing</span>
                      </div>
                    </div>
                  </div>

                  {/* Automated Triangulation Process Banner */}
                  <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-700">Audit Triangulation Rule:</span>
                      <span className="text-slate-600">
                        If <strong>Contractor Invoiced Progress &gt; Audited Physical Reality by ≥ 10%</strong>, the next financial tranche is automatically frozen at Checkpoint 05 until field rectifications are corroborated.
                      </span>
                    </div>
                    <div className="font-mono text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                      TRIGGERED FOR {currentProject.project_id}: LAG -{progressGap}%
                    </div>
                  </div>
                </div>

                {/* Clear Next Steps Box */}
                <div className="mt-8 bg-[#0b1f4b] text-white rounded-xl p-5 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-300 mb-2">
                    <span>⚖️</span> Official Action Order & Next Steps
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-3">
                    <div className="bg-white/10 p-3.5 rounded-lg border border-white/10">
                      <div className="font-bold text-white mb-1">🛑 1. Hold Payment</div>
                      <p className="text-sky-100/80">Pause tranche payment of ₹{unverifiedGapCr} Cr until the remaining 20 columns are erected.</p>
                    </div>
                    <div className="bg-white/10 p-3.5 rounded-lg border border-white/10">
                      <div className="font-bold text-white mb-1">⏱️ 2. 72-Hour Explanation Notice</div>
                      <p className="text-sky-100/80">Issued statutory show-cause notice to the Executive Engineer to clarify the progress discrepancy.</p>
                    </div>
                    <div className="bg-white/10 p-3.5 rounded-lg border border-white/10">
                      <div className="font-bold text-white mb-1">📅 3. Verification Audit</div>
                      <p className="text-sky-100/80">Next follow-up drone inspection and site re-audit scheduled for 15 Oct 2026.</p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-sky-200 font-mono">
                    <span>Officer on Record: S. Venkatesh (JE, KES)</span>
                    <button
                      onClick={() => setViewTab("desk")}
                      className="text-white underline font-bold cursor-pointer hover:text-sky-300"
                    >
                      Inspect Raw Evidence Imagery & Telemetry →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* VIEW 2: INTERACTIVE VISUAL VERIFICATION DESK                 */}
        {/* ============================================================ */}
        {viewTab === "desk" && (
          <div className="mt-4 animate-in fade-in duration-200">
            {/* Verifiable Temporal Milestone Trail */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0b1f4b]">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                  </svg>
                  <span>Verifiable Temporal Milestone Trail — {currentProject.project_id}</span>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#0284c7]" /> Verified
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#38bdf8]" /> Pending Review
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#e11d48]" /> Anomaly / Discrepancy
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-3 relative">
                {dynamicMilestones.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-lg border transition-all text-left relative ${
                      m.active
                        ? "bg-[#0b1f4b] text-white border-[#0b1f4b] shadow-sm"
                        : "bg-[#f8fafc] text-slate-700 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`font-mono text-[10px] font-bold ${m.active ? "text-sky-300" : "text-slate-500"}`}>
                        {m.date}
                      </span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: m.active ? "#38bdf8" : `${m.badgeColor}18`,
                          color: m.active ? "#0b1f4b" : m.badgeColor,
                        }}
                      >
                        {m.badge}
                      </span>
                    </div>
                    <div className={`font-bold text-xs line-clamp-1 ${m.active ? "text-white" : "text-[#0b1f4b]"}`}>
                      {m.title}
                    </div>
                    <div className={`text-[10px] mt-1 line-clamp-1 ${m.active ? "text-sky-100/80" : "text-slate-500"}`}>
                      {m.detail}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Middle Section: Comparison on Left, Metrics & Officer Record on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-5">
              {/* Left Column: Interactive Temporal Change Comparison (8 of 12 cols = ~65%) */}
              <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
                <div>
                  {/* Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3.5">
                    <div>
                      <h2 className="text-sm font-black text-[#0b1f4b] flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <line x1="12" y1="3" x2="12" y2="21" />
                        </svg>
                        Interactive Temporal Change Comparison
                      </h2>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Differential analysis between locked baseline and vendor photographic milestone
                      </p>
                    </div>
                    <div className="bg-rose-50 text-rose-800 border border-rose-200 text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
                      <span>Audited Physical Advance: +{auditedProgress}% (Contractor Claims +{claimedProgress}%)</span>
                    </div>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setComparisonMode("side-by-side")}
                        className={`px-3 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                          comparisonMode === "side-by-side" ? "bg-white text-[#0b1f4b] shadow-xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Side-by-Side View
                      </button>
                      <button
                        onClick={() => setComparisonMode("slider")}
                        className={`px-3 py-1 rounded-md font-semibold text-[11px] transition-all cursor-pointer ${
                          comparisonMode === "slider" ? "bg-white text-[#0b1f4b] shadow-xs" : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Interactive Curtain Slider
                      </button>
                    </div>

                    <button
                      onClick={() => setShowGhostGrid(!showGhostGrid)}
                      className={`px-3 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        showGhostGrid
                          ? "bg-sky-50 text-sky-700 border-sky-300 shadow-xs"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="3" y1="15" x2="21" y2="15" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                        <line x1="15" y1="3" x2="15" y2="21" />
                      </svg>
                      <span>{showGhostGrid ? "Ghost Grid Active" : "Overlay Ghost Grid"}</span>
                    </button>
                  </div>

                  {/* Comparison Display */}
                  {comparisonMode === "side-by-side" ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Left Side: Baseline */}
                      <div className="relative rounded-xl overflow-hidden border border-slate-300 group shadow-xs bg-slate-900">
                        <img
                          src="/evidence_baseline.jpg"
                          alt="Baseline Inspection"
                          className="w-full h-[290px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />

                        {showGhostGrid && (
                          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                        )}

                        <div className="absolute top-3 left-3 bg-[#0b1f4b]/90 backdrop-blur-xs text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded tracking-wider border border-white/20">
                          BASELINE — LOCKED
                        </div>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent p-3 text-white">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-xs text-white">Plinth Anchor Stage - Baseline Verified</div>
                            <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-400/30">
                              Pass
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-300 font-mono flex items-center justify-between">
                            <span>Project: {currentProject.project_id} · {currentProject.state}</span>
                            <span className="text-slate-400">Alt: 742m</span>
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>Audited by NIC Geo-Tag System</span>
                            <span>EAL-284: 8f4c...3e12</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Current Claim */}
                      <div className="relative rounded-xl overflow-hidden border-2 border-rose-400 group shadow-xs bg-slate-900">
                        <img
                          src="/evidence_current.jpg"
                          alt="Current Milestone Claim"
                          className="w-full h-[290px] object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />

                        {showGhostGrid && (
                          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#f43f5e_1px,transparent_1px)] [background-size:16px_16px] opacity-60" />
                        )}

                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          <span className="bg-rose-700 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded tracking-wider flex items-center gap-1 shadow-xs">
                            <span>▲</span> CURRENT CLAIM — INVOICED
                          </span>
                          <span className="bg-slate-900/80 backdrop-blur-xs text-slate-200 text-[10px] font-bold px-2 py-1 rounded border border-white/20">
                            INSPECTION OVERLAY
                          </span>
                        </div>

                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent p-3 text-white">
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-bold text-xs text-rose-300 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                              Critical Structural Variance Detected
                            </div>
                          </div>
                          <div className="text-[10px] text-slate-200 flex items-center justify-between">
                            <span>Claim: Full Column Framework ({claimedProgress}%)</span>
                            <span className="font-bold text-amber-300 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">
                              Audit: 4 of 24 Columns Erected
                            </span>
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-white/10 flex items-center justify-between text-[9px] text-slate-400 font-mono">
                            <span>Unmet Milestone Requirement</span>
                            <button
                              onClick={() => setModalType("gis")}
                              className="text-sky-300 underline hover:text-sky-200 cursor-pointer"
                            >
                              Inspect Ortho Projection →
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Slider Curtain Comparison */
                    <div
                      className="relative h-[290px] rounded-xl overflow-hidden border border-slate-300 cursor-col-resize select-none shadow-xs"
                      onMouseDown={() => setDragging(true)}
                      onMouseUp={() => setDragging(false)}
                      onMouseLeave={() => setDragging(false)}
                      onMouseMove={handleSliderDrag}
                    >
                      <img src="/evidence_baseline.jpg" alt="Baseline" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute top-3 left-3 bg-[#0b1f4b]/90 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded tracking-wider">
                        BASELINE LOCKED
                      </div>

                      <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
                        <img src="/evidence_current.jpg" alt="Current" className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute top-3 right-3 bg-rose-700 text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded tracking-wider">
                          CLAIMED MILESTONE
                        </div>
                      </div>

                      <div className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 pointer-events-none" style={{ left: `${sliderPos}%` }}>
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-[#0b1f4b] text-white flex items-center justify-center shadow-lg border-2 border-white text-xs">
                          ↔
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Corroboration Alignment Tool */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                    <span>Photogrammetric Match Alignment</span>
                  </div>

                  <div className="flex items-center gap-3 flex-1 max-w-[340px]">
                    <span className="text-[11px] font-mono font-bold text-slate-600 whitespace-nowrap">
                      Match: <span className="text-amber-600">{matchPercentage.toFixed(1)}%</span>
                    </span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={matchPercentage}
                      onChange={(e) => setMatchPercentage(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0b1f4b]"
                    />
                  </div>

                  <span className="text-[11px] text-slate-400 font-medium">
                    Auto-aligned with NIC Stratum-1 Clock
                  </span>
                </div>
              </div>

              {/* Right Column: Evidentiary Metrics & Officers (4 of 12 cols = ~35%) */}
              <div className="lg:col-span-4 flex flex-col gap-4">
                {/* Evidentiary Metric Card */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      </svg>
                      Evidentiary Metric
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">Section 65B Certified</span>
                  </div>

                  <div className="my-3.5">
                    <div className="text-[11px] font-bold text-slate-500 mb-1">Composite Evidence Confidence Score</div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-black text-[#0b1f4b] tracking-tight">68%</span>
                      <span className="bg-amber-100 text-amber-800 border border-amber-300 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                        AMBER FLAG
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium ml-auto">Threshold: 85%</span>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                      <div className="bg-gradient-to-r from-amber-500 to-amber-600 h-full w-[68%]" />
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2.5 leading-relaxed">
                      <strong>4 of 6</strong> corroborating layers verified. Drone aerial resolution confirmed divergence from agency progress claims.
                    </p>
                  </div>

                  {/* Corroboration Matrix */}
                  <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Corroboration Matrix
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Spatial Coordinate Geofencing</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        100% Match
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>EXIF Cryptographic Signature</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Untampered
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Treasury Disbursement Cross-check</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Tr. Matched
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                      <div className="flex items-center gap-2 text-slate-700">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>Physical Materials Core Test</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        Passed (M25)
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs py-1.5 bg-rose-50/70 -mx-2 px-2 rounded-md border border-rose-200/80">
                      <div className="flex items-center gap-2 text-rose-800 font-medium">
                        <span className="text-rose-600 font-bold">✕</span>
                        <span>Drone Photogrammetry vs Agency Claim</span>
                      </div>
                      <span className="font-mono text-[11px] font-black text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
                        -26% Divergence
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => {
                      setModalType("clarification");
                      setModalData({ officer: `Executive Engineer (${currentProject.state} Division)` });
                    }}
                    className="w-full mt-4 bg-[#0b1f4b] hover:bg-[#152e6d] text-white font-bold py-2.5 px-4 rounded-lg text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                    <span>Request Clarification from EE/AE</span>
                  </button>
                  <div className="text-[10px] text-slate-400 text-center mt-1.5">
                    Target: Executive Engineer ({currentProject.state} Division)
                  </div>
                </div>

                {/* Evidentiary Admissibility & Officers Info */}
                <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#0b1f4b] mb-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10 9 9 9 8 9" />
                    </svg>
                    <span>Evidentiary Admissibility</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    All stored assets conform to Section 65B of the Indian Evidence Act. Time-stamped via NIC National Stratum-1 Time Server.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Ledger Block #{currentProject.project_id}-714</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span>🔒</span> Immutable Copy
                    </span>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Inspection Officers on Record
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 font-bold flex items-center justify-center text-[11px] shrink-0 border border-sky-200">
                          SV
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">S. Venkatesh, KES</div>
                          <div className="text-[10px] text-slate-500">Junior Engineer · Last Ground Visit: 18 Sep 2026</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center text-[11px] shrink-0 border border-indigo-200">
                          AN
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">Anand N., Scientist 'D'</div>
                          <div className="text-[10px] text-slate-500">Aerial Sensing Analysis · Remote Pass: 28 Aug 2026</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Evidence Filter Tabs & 2x2 Rich Evidence Cards Grid */}
            <div className="mt-6 bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
                <div className="flex items-center gap-1.5">
                  {[
                    { k: "all", label: "All Evidence (24)" },
                    { k: "photos", label: "Site Photographs (14)" },
                    { k: "inspections", label: "Inspection Reports (4)" },
                    { k: "documents", label: "Engineering Documents (3)" },
                    { k: "remote", label: "Remote Imagery (3)" },
                  ].map((tab) => (
                    <button
                      key={tab.k}
                      onClick={() => setActiveTab(tab.k as Tab)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        activeTab === tab.k ? "bg-[#0b1f4b] text-white shadow-xs" : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Layout:</span>
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`p-1.5 rounded border transition-all cursor-pointer ${
                      viewMode === "grid" ? "bg-white text-[#0b1f4b] border-slate-300 shadow-xs" : "text-slate-400 border-transparent hover:text-slate-600"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-1.5 rounded border transition-all cursor-pointer ${
                      viewMode === "list" ? "bg-white text-[#0b1f4b] border-slate-300 shadow-xs" : "text-slate-400 border-transparent hover:text-slate-600"
                    }`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Cards Grid */}
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredCards.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              item.statusColor === "amber"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : item.statusColor === "green"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-sky-100 text-sky-800 border border-sky-300"
                            }`}
                          >
                            {item.status}
                          </span>
                          <span className="text-[10px] font-mono font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {item.typeLabel}
                          </span>
                        </div>

                        {item.image ? (
                          <div
                            onClick={() => {
                              if (item.typeLabel.includes("Satellite") || item.actionText.includes("Satellite")) {
                                setModalType("satellite");
                              } else if (item.actionText.includes("GIS")) {
                                setModalType("gis");
                              } else {
                                setModalType("cardDetail");
                                setModalData(item);
                              }
                            }}
                            className="relative h-[175px] bg-slate-900 overflow-hidden group cursor-pointer"
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            {item.overlayBadge && (
                              <div className="absolute top-2.5 left-2.5 bg-[#0b1f4b]/90 text-white font-mono text-[10px] px-2 py-0.5 rounded border border-white/20">
                                {item.overlayBadge}
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                              <span className="text-white text-xs font-semibold flex items-center gap-1.5">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <circle cx="11" cy="11" r="8" />
                                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                  <line x1="11" y1="8" x2="11" y2="14" />
                                  <line x1="8" y1="11" x2="14" y2="11" />
                                </svg>
                                Click to Enlarge Telemetry
                              </span>
                            </div>
                          </div>
                        ) : item.voucherData ? (
                          <div className="p-4 bg-gradient-to-br from-emerald-50/50 to-slate-50 border-b border-slate-100">
                            <div className="text-2xl font-black text-emerald-900 tracking-tight">
                              {item.voucherData.amount}
                            </div>
                            <div className="text-[11px] font-mono text-slate-600 mt-0.5">
                              {item.voucherData.ref}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {item.voucherData.subTags.map((t, idx) => (
                                <span key={idx} className="text-[10px] font-bold bg-white text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded">
                                  ✓ {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : item.qcData ? (
                          <div className="p-4 bg-gradient-to-br from-sky-50/50 to-slate-50 border-b border-slate-100">
                            <div className="text-xs font-extrabold text-[#0b1f4b] uppercase tracking-wider">
                              {item.qcData.standard}
                            </div>
                            <div className="text-sm font-bold text-slate-800 mt-1">
                              {item.qcData.result}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              {item.qcData.subTags.map((t, idx) => (
                                <span key={idx} className="text-[10px] font-bold bg-white text-sky-800 border border-sky-200 px-2 py-0.5 rounded">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        <div className="p-4">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="font-bold text-sm text-[#0b1f4b] hover:text-sky-700 transition-colors">
                              {item.title}
                            </h3>
                            <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                              {item.id}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono mt-0.5 mb-2">
                            {item.date}
                          </div>
                          <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">
                          Source: {item.source}
                        </span>
                        <button
                          onClick={() => {
                            if (item.typeLabel.includes("Satellite") || item.actionText.includes("Satellite")) {
                              setModalType("satellite");
                            } else if (item.actionText.includes("GIS")) {
                              setModalType("gis");
                            } else {
                              setModalType("cardDetail");
                              setModalData(item);
                            }
                          }}
                          className="text-[#0b1f4b] hover:text-sky-700 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>{item.actionText}</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Modals */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`rounded-2xl w-full p-6 shadow-2xl border animate-in fade-in zoom-in-95 duration-200 ${
              modalType === "satellite"
                ? "max-w-4xl bg-slate-950 text-white border-sky-500/30 max-h-[92vh] overflow-y-auto"
                : "max-w-lg bg-white border-slate-200"
            }`}
          >
            {modalType === "flag" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-bold text-rose-700 flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-600 animate-pulse" />
                    Flag Inconsistency for Audit
                  </div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Log a formal evidentiary discrepancy against <strong>{currentProject.project_id}: {currentProject.project_name}</strong> under Section 65B audit trail.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Discrepancy Category</label>
                    <select className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-medium">
                      <option>Physical Progress Divergence (&gt;15%)</option>
                      <option>Column Framework Shortfall</option>
                      <option>Bill of Quantities Over-invoicing</option>
                      <option>Material Quality Failure</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Auditor Observation Notes</label>
                    <textarea
                      rows={3}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 font-medium"
                      defaultValue={`Physical site inspection on 18 Sep 2026 confirmed only 4 of 24 required reinforced columns erected, contrary to contractor Stage 4 billing claim of ${claimedProgress}%.`}
                    />
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert(`Inconsistency flagged successfully for ${currentProject.project_id} and routed to Chief Technical Examiner (CTE).`);
                      setModalType(null);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Dispatch Audit Flag
                  </button>
                </div>
              </div>
            )}

            {modalType === "upload" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-bold text-[#0b1f4b]">Upload Field Inspection Evidence</div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Submit ground geo-tagged photos, drone orthomosaics, or test certificates for <strong>{currentProject.project_id}</strong> ({currentProject.state}).
                </p>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 hover:bg-sky-50/50 transition-colors cursor-pointer">
                  <div className="text-3xl mb-2">📸</div>
                  <div className="text-xs font-bold text-[#0b1f4b]">Drag & drop geotagged files here</div>
                  <div className="text-[11px] text-slate-400 mt-1">Supports JPG (with EXIF GPS), GeoTIFF, and Signed PDF (up to 50MB)</div>
                </div>
                <div className="mt-4 text-[11px] text-slate-500 flex items-center gap-1.5 bg-emerald-50 text-emerald-800 p-2.5 rounded-lg border border-emerald-200">
                  <span>🔒</span> NIC Stratum-1 Hardware Timestamp will be permanently embedded.
                </div>
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      alert(`Sample evidence successfully processed, EXIF verified, and saved to ${currentProject.project_id}.`);
                      setModalType(null);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg cursor-pointer"
                  >
                    Validate & Ingest
                  </button>
                </div>
              </div>
            )}

            {modalType === "clarification" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-bold text-[#0b1f4b]">Official Clarification Notice</div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-3">
                  Direct formal statutory query to <strong>{modalData?.officer}</strong> with automatic 72-hour compliance countdown.
                </p>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 mb-3 leading-relaxed">
                  Ref: DRISHTI/EAL/2026/{currentProject.project_id}<br />
                  Project: {currentProject.project_name}<br />
                  Subject: Reconcile {progressGap}% physical progress divergence between contractor claim ({claimedProgress}%) and physical audit ({auditedProgress}%).
                </div>
                <div className="mt-4 flex justify-end gap-2.5">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert(`Official clarification dispatched via NIC Email and SMS Gateway for ${currentProject.project_id}.`);
                      setModalType(null);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Dispatch Notice
                  </button>
                </div>
              </div>
            )}

            {modalType === "cardDetail" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-bold text-[#0b1f4b]">{modalData?.title}</div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <div className="text-xs font-mono text-slate-500 mb-3">
                  Identifier: {modalData?.id} · Date: {modalData?.date} · Source: {modalData?.source}
                </div>
                {modalData?.image && (
                  <img src={modalData.image} alt={modalData.title} className="w-full h-48 object-cover rounded-lg border border-slate-200 mb-3" />
                )}
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                  {modalData?.description}
                </p>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-emerald-700 font-bold flex items-center gap-1 font-mono text-[11px]">
                    ✓ Cryptographic Hash: SHA-256 e849f...
                  </span>
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs font-bold bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            )}

            {modalType === "gis" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-bold text-[#0b1f4b]">Aerial Orthomosaic & Volumetric Analysis</div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <img src="/evidence_drone.jpg" alt="Drone Ortho" className="w-full h-56 object-cover rounded-lg border border-slate-200 mb-3" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  Volumetric analysis shows <strong>3D digital elevation mesh</strong> for {currentProject.project_name}. Total earthwork volume calculates to 1,420 m³, which is 18% lower than contractor invoiced volume.
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs font-bold bg-[#0b1f4b] text-white rounded-lg cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {modalType === "export" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-base font-bold text-[#0b1f4b]">Export Evidentiary Dossier</div>
                  <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Generate comprehensive signed PDF dossier with all 24 verified evidentiary assets for <strong>{currentProject.project_id}: {currentProject.project_name}</strong>.
                </p>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="accent-[#0b1f4b]" />
                    <span>Include Plain-English Executive Summary Report</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="accent-[#0b1f4b]" />
                    <span>Include High-Resolution Photographic Comparisons</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="accent-[#0b1f4b]" />
                    <span>Include Section 65B Digital Certificate</span>
                  </label>
                </div>
                <div className="mt-5 flex justify-end gap-2.5">
                  <button
                    onClick={() => setModalType(null)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      alert(`Executive Evidence Report for ${currentProject.project_id} generated successfully. Downloading PDF...`);
                      setModalType(null);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-[#0b1f4b] hover:bg-[#152e6d] text-white rounded-lg shadow-sm cursor-pointer"
                  >
                    Generate & Download
                  </button>
                </div>
              </div>
            )}

            {modalType === "satellite" && (
              <div>
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🛰️</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-white">
                          ISRO Cartosat-3 Orbital Pass & Telemetry Suite
                        </h3>
                        <span className="bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-sky-400/30">
                          GSD 0.28m PAN + MX
                        </span>
                      </div>
                      <div className="text-xs text-sky-200/70 font-mono">
                        Spacecraft: C3-505 · 14 Sep 2026 10:42:18 IST · Project: {currentProject.project_id}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setModalType(null)}
                    className="text-slate-400 hover:text-white text-xl p-1 rounded-lg cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Satellite Imagery View */}
                <div className="relative rounded-xl overflow-hidden border border-sky-500/40 mb-4 bg-black group max-h-[360px]">
                  <img
                    src="/evidence_satellite.jpg"
                    alt="ISRO Cartosat-3 Satellite Imagery"
                    className="w-full h-full object-cover max-h-[360px]"
                  />

                  {/* Overlay Telemetry HUD */}
                  <div className="absolute top-3 left-3 bg-[#0b1f4b]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-sky-400/30 text-xs font-mono space-y-0.5">
                    <div className="text-sky-300 font-bold">GRID: UTM ZONE 43N · WGS84 DATUM</div>
                    <div className="text-[10px] text-slate-300">CENTROID: 31°18'42.1"N, 75°34'19.8"E</div>
                    <div className="text-[10px] text-emerald-400">STATUS: CALIBRATED RADIOMETRIC REFLECTANCE</div>
                  </div>

                  <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-[11px] font-mono text-slate-200">
                    Source: ISRO NRSC Shadnagar Ground Station
                  </div>
                </div>

                {/* Spectral & Telemetry Specifications Matrix */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 text-xs font-mono">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="text-[10px] text-slate-400">PAYLOAD & RESOLUTION</div>
                    <div className="font-bold text-white text-xs mt-1">1.2m Two-Mirror Ritchey-Chrétien</div>
                    <div className="text-[11px] text-sky-300 mt-1">0.28m PAN / 1.12m 4-Band MX</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="text-[10px] text-slate-400">ORBITAL EPHEMERIS</div>
                    <div className="font-bold text-white text-xs mt-1">505 km Altitude · 97.5° Inclination</div>
                    <div className="text-[11px] text-emerald-300 mt-1">Sun-Synchronous Polar LEO</div>
                  </div>

                  <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                    <div className="text-[10px] text-slate-400">CORROBORATION FINDING</div>
                    <div className="font-bold text-rose-400 text-xs mt-1">Divergence Confirmed</div>
                    <div className="text-[11px] text-slate-300 mt-1">Only 4 of 24 Piers Erected</div>
                  </div>
                </div>

                {/* Detailed Analysis Breakdown */}
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 text-xs mb-4">
                  <div className="font-bold text-sky-300 mb-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider">
                    <span>📡</span> Automated Corridor Feature Extraction
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300 text-xs mt-2">
                    <div>
                      <span className="font-bold text-white">Chainage 14+200 to 18+600:</span> 45m right-of-way corridor cleared. Earthwork grading verified at 82% alignment.
                    </div>
                    <div>
                      <span className="font-bold text-white">River Crossing Foundation:</span> Piers P1-P4 clearly visible in water channel. Piers P5-P24 show 0 structural pixel signature.
                    </div>
                  </div>
                </div>

                {/* Section 65B & Download Footer */}
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">🔒 Section 65B Certified:</span>
                    <span className="font-mono text-[11px] text-slate-300">
                      SHA-256: 7f3b49e1a82d490cf128e08d6614a991b15c2d3e4f
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        alert("Exporting calibrated GeoTIFF with ISRO metadata XML for statutory CAG audit record...");
                      }}
                      className="px-3.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Export Signed GeoTIFF
                    </button>
                    <button
                      onClick={() => setModalType(null)}
                      className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Close Telemetry
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
