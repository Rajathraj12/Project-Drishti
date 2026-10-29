import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { projectService } from "../services/projectService";
import { Project } from "../types";

type Tab = "all" | "photos" | "inspections" | "documents" | "remote";

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
  const [showGhostGrid, setShowGhostGrid] = useState(false);
  const [matchPercentage, setMatchPercentage] = useState(54.2);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sliderPos, setSliderPos] = useState(50);
  const [comparisonMode, setComparisonMode] = useState<"side-by-side" | "slider">("side-by-side");
  const [dragging, setDragging] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number>(4);

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

  // Dynamic voucher amount in INR formatted using standard Indian numbering system (e.g. ₹39,07,20,000)
  const voucherAmountVal = Math.max(
    100000,
    (Math.round(Number(unverifiedGapCr) * 10) || 3907) * 100000 + 20000
  );
  const formattedVoucherAmount = `₹${voucherAmountVal.toLocaleString("en-IN")}`;

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
        amount: formattedVoucherAmount,
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

            {/* Export Signed PDF */}
            <button
              onClick={() => {
                setModalType("export");
                setModalData(currentProject);
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold px-3.5 py-2 rounded-lg text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Export Signed PDF</span>
            </button>
          </div>
        </div>

        {/* INTERACTIVE VISUAL VERIFICATION DESK */}
        <div className="mt-4 animate-in fade-in duration-200">
            {/* Statutory Audit Pipeline — Horizontal Stepper */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs mb-5 overflow-hidden">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-100">
                <div>
                  <div className="text-xs font-bold text-[#0b1f4b] tracking-wide uppercase">Statutory Audit Checkpoint Trail</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Section 65B · Sequential compliance pipeline · {currentProject.project_id}</div>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                  Stage 4 Anomaly · Payment Held
                </span>
              </div>

              {/* Stepper */}
              <div className="px-6 py-5">
                <div className="relative flex items-start">
                  {/* Connector line behind nodes */}
                  <div className="absolute left-0 right-0 top-[18px] h-px bg-slate-200 z-0 mx-[10%]">
                    <div className="h-full bg-emerald-400" style={{ width: "50%" }} />
                  </div>

                  {checkpoints.map((cp, idx) => {
                    const isSelected = selectedCheckpoint === idx + 1;
                    const isPassed = cp.status.includes("PASSED");
                    const isFailed = cp.status.includes("FLAGGED");
                    const isHeld = cp.status.includes("HELD");

                    return (
                      <button
                        type="button"
                        key={cp.id}
                        onClick={() => setSelectedCheckpoint(idx + 1)}
                        className="flex-1 flex flex-col items-center gap-2 relative z-10 cursor-pointer group"
                      >
                        {/* Node */}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                          isSelected
                            ? "bg-[#0b1f4b] border-[#0b1f4b] shadow-md"
                            : isPassed
                            ? "bg-emerald-500 border-emerald-500 group-hover:border-emerald-600"
                            : isFailed
                            ? "bg-rose-500 border-rose-500 group-hover:border-rose-600"
                            : isHeld
                            ? "bg-slate-300 border-slate-300 group-hover:border-slate-400"
                            : "bg-white border-slate-300 group-hover:border-slate-400"
                        }`}>
                          {isPassed && !isSelected && (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M3 8l3 3 6-6" />
                            </svg>
                          )}
                          {isFailed && !isSelected && (
                            <svg className="w-4 h-4 text-white" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                              <path d="M8 5v3.5M8 10.5h.01" />
                            </svg>
                          )}
                          {isHeld && !isSelected && (
                            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="4" y="7" width="8" height="6" rx="1" /><path d="M6 7V5a2 2 0 0 1 4 0v2" />
                            </svg>
                          )}
                          {!isPassed && !isFailed && !isHeld && !isSelected && (
                            <span className="text-[11px] font-bold text-slate-400 font-mono">{cp.num}</span>
                          )}
                          {isSelected && (
                            <span className="text-[11px] font-bold text-white font-mono">{cp.num}</span>
                          )}
                        </div>

                        {/* Label */}
                        <div className="text-center px-1">
                          <div className={`text-[10px] font-mono font-bold uppercase tracking-wider mb-0.5 ${
                            isSelected ? "text-[#0b1f4b]" : "text-slate-400"
                          }`}>CP-{cp.num}</div>
                          <div className={`text-[11px] font-semibold leading-tight ${
                            isSelected ? "text-[#0b1f4b]" : "text-slate-600"
                          }`}>{cp.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{cp.date}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail strip */}
              {selectedCheckpoint && (
                <div className="mx-5 mb-4 p-3.5 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-3">
                  <div className={`shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold font-mono ${
                    checkpoints[selectedCheckpoint - 1].status.includes("PASSED") ? "bg-emerald-500"
                      : checkpoints[selectedCheckpoint - 1].status.includes("FLAGGED") ? "bg-rose-500"
                      : checkpoints[selectedCheckpoint - 1].status.includes("HELD") ? "bg-slate-400"
                      : "bg-sky-500"
                  }`}>
                    {checkpoints[selectedCheckpoint - 1].num}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-[#0b1f4b]">{checkpoints[selectedCheckpoint - 1].name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">· {checkpoints[selectedCheckpoint - 1].stage} · {checkpoints[selectedCheckpoint - 1].date}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                      {checkpoints[selectedCheckpoint - 1].detailedFinding}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3 Progress & Capital Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              {/* Card 1: What Contractor Claimed */}
              <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Invoiced Claim</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                    Milestone #4
                  </span>
                </div>
                <div className="text-2xl font-black text-[#0b1f4b] tracking-tight">{claimedProgress}%</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Contractor billing claim for complete column framework erection.
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Invoiced Capital:</span>
                    <strong className="text-slate-900 font-mono font-bold">₹{invoicedTrancheCr} Cr</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Claim Date:</span>
                    <span className="font-mono text-slate-700">22 Jul 2026</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Invoice Ref:</span>
                    <span className="font-mono text-slate-700">NHAI/BILL/2026/881</span>
                  </div>
                </div>
              </div>

              {/* Card 2: What We Actually Found on the Ground */}
              <div className="bg-white rounded-xl border border-rose-200/90 shadow-2xs p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">Audited Reality</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-200">
                    Physical Shortfall
                  </span>
                </div>
                <div className="text-2xl font-black text-rose-600 tracking-tight">{auditedProgress}%</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  High-res drone photogrammetry verified only 4 of 24 pillars erected.
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Verified Capital:</span>
                    <strong className="text-slate-900 font-mono font-bold">₹{verifiedTrancheCr} Cr</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Physical Gap:</span>
                    <strong className="text-rose-700 font-mono font-bold">-{progressGap}% Lag</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Missing Pillars:</span>
                    <strong className="text-rose-700 font-semibold">20 Columns Not Built</strong>
                  </div>
                </div>
              </div>

              {/* Card 3: Action Taken (Payment Blocked) */}
              <div className="bg-white rounded-xl border border-amber-200/90 shadow-2xs p-5 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                      </svg>
                    </div>
                    <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">Treasury Action</span>
                  </div>
                  <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                    Tranche Frozen
                  </span>
                </div>
                <div className="text-2xl font-black text-amber-600 tracking-tight">₹{unverifiedGapCr} Cr</div>
                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Disbursement halted at Checkpoint 05 pending physical rectification.
                </div>
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Notice Status:</span>
                    <span className="font-bold text-amber-700">72-Hr Show-Cause Notice</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Dispatched:</span>
                    <span className="font-mono text-slate-700">19 Sep 2026 (11:42 AM)</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Resolution Due:</span>
                    <span className="font-mono text-rose-600 font-bold">22 Sep 2026</span>
                  </div>
                </div>
              </div>
            </div>

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
                {modalData?.voucherData && (
                  <div className="p-3.5 bg-emerald-50 rounded-lg border border-emerald-200 mb-3">
                    <div className="text-xl font-black text-emerald-900">{modalData.voucherData.amount}</div>
                    <div className="text-xs font-mono text-slate-600 mt-0.5">{modalData.voucherData.ref}</div>
                  </div>
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
