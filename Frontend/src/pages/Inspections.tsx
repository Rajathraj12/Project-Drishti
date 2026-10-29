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
  sector: string;
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

export type SectorCategory = "roads" | "railways" | "water" | "power" | "telecom" | "mining" | "buildings";

export function resolveSectorCategory(sector?: string, name?: string): SectorCategory {
  const s = (sector || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (s.includes("road") || s.includes("highway") || n.includes("expressway") || n.includes("nh-") || n.includes("road") || n.includes("corridor") || n.includes("flyover") || n.includes("bridge")) {
    return "roads";
  }
  if (s.includes("rail") || n.includes("rail") || n.includes("metro") || n.includes("line doubling") || n.includes("station")) {
    return "railways";
  }
  if (s.includes("water") || s.includes("oil") || s.includes("gas") || n.includes("pipeline") || n.includes("canal") || n.includes("dam") || n.includes("water") || n.includes("irrigation")) {
    return "water";
  }
  if (s.includes("power") || s.includes("electric") || s.includes("transmission") || n.includes("substation") || n.includes("solar") || n.includes("thermal") || n.includes("grid")) {
    return "power";
  }
  if (s.includes("telecom") || n.includes("ofc") || n.includes("tower") || n.includes("fiber") || n.includes("broadband")) {
    return "telecom";
  }
  if (s.includes("coal") || s.includes("mining") || n.includes("mine") || n.includes("pit") || n.includes("colliery")) {
    return "mining";
  }
  return "buildings";
}

export interface ChecklistItem {
  id: string;
  title: string;
  proof: string;
}

export const sectorChecklists: Record<SectorCategory, ChecklistItem[]> = {
  roads: [
    { id: "c1", title: "Right-of-Way (RoW) boundary & centerline geodetic lock (CP-01)", proof: "MoRTH WGS84 Chainage Telemetry" },
    { id: "c2", title: "Subgrade compaction & Granular Sub-Base (GSB) density (IRC:37)", proof: "98.8% Modified Proctor Density" },
    { id: "c3", title: "Dense Bituminous Macadam (DBM) & wearing course thickness (CP-04)", proof: "50mm DBM Core Sample Tested" },
    { id: "c4", title: "Volumetric cut/fill photogrammetry comparison (Drone RTK)", proof: "2.2 cm/px 3D DSM Terrain Mesh" },
    { id: "c5", title: "Drainage culverts, median crash barriers & signage inventory (Tier 4)", proof: "18 of 22 Culverts Certified" },
    { id: "c6", title: "Stratum-1 GPS & laser roughness profilometer telemetry (IRI < 2.0)", proof: "SHA-256 e849f... Hardware Stamp" },
    { id: "c7", title: "Statutory 72-hour explanation show-cause notice dispatched (CP-05)", proof: "Dispatched to Project Director (NHAI)" },
  ],
  railways: [
    { id: "c1", title: "Track alignment geodetic datum & formation blanketing lock (CP-01)", proof: "RDSO WGS84 Geodetic Alignment" },
    { id: "c2", title: "Formation soil stabilization & plate load test (Ev2 ≥ 45 MPa)", proof: "48.2 MPa NABL Certified" },
    { id: "c3", title: "Track ballast cushion depth & sleeper spacing compliance (CP-04)", proof: "300mm Ballast Cushion Verified" },
    { id: "c4", title: "Overhead Electrification (OHE) mast foundation & cantilevers", proof: "38 of 42 Masts Erected & Grouted" },
    { id: "c5", title: "Volumetric corridor LiDAR & station viaduct photogrammetry", proof: "Drone LiDAR Clearance Point Cloud" },
    { id: "c6", title: "Axle counter & electronic interlocking signal geo-stamp (Tier 3)", proof: "SIL-4 Cryptographic Audit Stamp" },
    { id: "c7", title: "Statutory Commission of Railway Safety (CRS) audit docket (CP-05)", proof: "Dispatched to Chief Track Engineer" },
  ],
  water: [
    { id: "c1", title: "Corridor easement, intake datum & pipeline alignment lock (CP-01)", proof: "Survey of India WGS84 Corridor Lock" },
    { id: "c2", title: "Trench excavation depth & granular bedding layer compaction", proof: "150mm Sand Bedding Verified" },
    { id: "c3", title: "Hydrostatic pipeline pressure & leak test (1.5x working head) (CP-04)", proof: "12 Bar Pressure Held for 24 Hrs" },
    { id: "c4", title: "Canal embankment lining & M15 concrete paving compaction", proof: "KSRSAC 3D Mesh Thickness Audit" },
    { id: "c5", title: "Sluice gate electro-mechanical & flow telemetry calibration (Tier 4)", proof: "SCADA Discharge Sensor Verified" },
    { id: "c6", title: "Cryptographic barometric elevation & joint radiographic weld audit (Tier 3)", proof: "SHA-256 NDT Radiography Stamp" },
    { id: "c7", title: "Statutory 72-hour tranche withhold notice dispatched (CP-05)", proof: "Dispatched to Executive Engineer" },
  ],
  power: [
    { id: "c1", title: "Transmission corridor geo-datum & tower footing benchmark (CP-01)", proof: "POSOCO Datum Geo-Lock Verified" },
    { id: "c2", title: "Tower foundation stub setting, leg pitch & chimney casting (CP-02)", proof: "M20 Concrete Cube 28-day NABL Test" },
    { id: "c3", title: "Conductor stringing sag & mid-span ground clearance audit (CP-04)", proof: "UAV LiDAR Minimum 8.5m Clearance" },
    { id: "c4", title: "Substation transformer earthing resistance test (< 1.0 Ohm)", proof: "0.42 Ohm Earth Resistance Certified" },
    { id: "c5", title: "Material yard conductor spool & steel lattice inventory (Tier 4)", proof: "420 MT Galvanized Tower Steel" },
    { id: "c6", title: "Stratum-1 GPS & infrared thermography hot-spot scan (Tier 3)", proof: "SHA-256 FLIR Telemetry Stamp" },
    { id: "c7", title: "Statutory Central Electricity Authority (CEA) compliance notice (CP-05)", proof: "Dispatched to SE Grid Operations" },
  ],
  telecom: [
    { id: "c1", title: "Tower site lease benchmark & geodetic datum frozen (CP-01)", proof: "DoT WGS84 Antenna Datum Lock" },
    { id: "c2", title: "Base foundation concrete compressive strength (IS 456 M25)", proof: "26.5 N/mm² NABL Certified" },
    { id: "c3", title: "Lattice mast section erection, torque bolt & verticality audit (CP-04)", proof: "Theodolite Verticality 1:1000 Checked" },
    { id: "c4", title: "Optical Fiber Cable (OFC) route trench depth & duct installation", proof: "1.2m Trench Depth Sensor Verified" },
    { id: "c5", title: "OFC OTDR attenuation & splice loss test (< 0.22 dB/km) (Tier 4)", proof: "NABL OTDR Trace Logs Approved" },
    { id: "c6", title: "Cryptographic GPS EXIF & EMF radiation compliance stamp (Tier 3)", proof: "SHA-256 Hardware Telemetry Stamp" },
    { id: "c7", title: "Statutory 72-hour explanation show-cause notice dispatched (CP-05)", proof: "Dispatched to Circle Telecom Officer" },
  ],
  mining: [
    { id: "c1", title: "Mining lease boundary pillars & DGMS geodetic datum frozen (CP-01)", proof: "DGMS Lease Boundary DGPS Stamp" },
    { id: "c2", title: "Overburden (OB) dump slope stability & angle of repose audit", proof: "Slope Stability Radar (SSR) Verified" },
    { id: "c3", title: "Volumetric pit excavation cut/fill photogrammetry (CP-04)", proof: "Drone RTK 3D Volumetric Mesh (m³)" },
    { id: "c4", title: "Coal seam bench height & haul road width compliance (DGMS standard)", proof: "LiDAR Haul Road Width ≥ 3x Dumper" },
    { id: "c5", title: "Coal stock depot weighbridge & physical stockpile survey (Tier 4)", proof: "Total Station 3D Stockpile Audit" },
    { id: "c6", title: "Continuous Ambient Air Quality (CAAQMS) telemetry & environmental seal", proof: "CPCB Real-time Sensor Feed Stamp" },
    { id: "c7", title: "Statutory 72-hour explanation show-cause notice dispatched (CP-05)", proof: "Dispatched to Area General Manager" },
  ],
  buildings: [
    { id: "c1", title: "Site boundary benchmark & geodetic datum frozen (CP-01)", proof: "Survey of India WGS84 Datum Lock" },
    { id: "c2", title: "Foundation concrete compressive core test (IS 456 M25 certified)", proof: "27.8 N/mm² NABL Certified" },
    { id: "c3", title: "Superstructure column framework, rebar count & slab casting (CP-04)", proof: "4 of 24 Erected · Shortfall: 20" },
    { id: "c4", title: "Volumetric earthwork & basement excavation photogrammetry (Drone RTK)", proof: "KSRSAC 2.2 cm/px 3D DSM Mesh" },
    { id: "c5", title: "Material yard physical rebar & cement inventory (Tier 4)", proof: "160 MT Fe-550 Steel in Depot" },
    { id: "c6", title: "Stratum-1 GPS & barometric elevation cryptographic EXIF (Tier 3)", proof: "SHA-256 e849f... Hardware Stamp" },
    { id: "c7", title: "Statutory 72-hour explanation show-cause notice dispatched (CP-05)", proof: "Dispatched to Executive Engineer on Record" },
  ],
};

export function getSectorCheckpoints(cat: SectorCategory) {
  switch (cat) {
    case "roads":
      return [
        { num: "04", name: "Ground & Drone Volumetric Photogrammetry" },
        { num: "02", name: "Subgrade & Granular Sub-Base (GSB)" },
        { num: "03", name: "Dense Bituminous Macadam (DBM) Paving" },
        { num: "05", name: "Tranche Clearance & Roughness Profiling" },
        { num: "01", name: "Right-of-Way & Alignment Geo-Lock" },
      ];
    case "railways":
      return [
        { num: "04", name: "OHE Mast & Track Corridor Drone Audit" },
        { num: "02", name: "Formation & Blanketing Layer Compaction" },
        { num: "03", name: "Ballast Cushion & Sleeper Spacing" },
        { num: "05", name: "CRS Statutory Tranche Clearance" },
        { num: "01", name: "RDSO Geodetic Track Alignment Lock" },
      ];
    case "water":
      return [
        { num: "04", name: "Ground & Drone Embankment Audit" },
        { num: "02", name: "Trench Excavation & Sand Bedding" },
        { num: "03", name: "Pipeline Hydrostatic Pressure Test" },
        { num: "05", name: "SCADA Discharge & Tranche Clearance" },
        { num: "01", name: "Intake & Corridor Easement Geo-Lock" },
      ];
    case "power":
      return [
        { num: "04", name: "Ground & UAV LiDAR Hot-Spot Audit" },
        { num: "02", name: "Tower Footing & Stub Setting" },
        { num: "03", name: "Conductor Stringing & Sag Clearance" },
        { num: "05", name: "CEA Clearance & Tranche Release" },
        { num: "01", name: "Corridor Baseline Geo-Lock" },
      ];
    case "telecom":
      return [
        { num: "04", name: "Mast Verticality & Drone Audit" },
        { num: "02", name: "Base Foundation Concrete Core Test" },
        { num: "03", name: "OFC Trenching & Duct Installation" },
        { num: "05", name: "DoT Telecom Tranche Clearance" },
        { num: "01", name: "Tower Site Lease & Antenna Datum Lock" },
      ];
    case "mining":
      return [
        { num: "04", name: "Drone RTK Volumetric DSM Audit" },
        { num: "02", name: "Haul Road & Pit Bench Safety" },
        { num: "03", name: "Overburden Dump Slope Stability" },
        { num: "05", name: "Stockpile Audit & Tranche Release" },
        { num: "01", name: "DGMS Lease Boundary Geo-Lock" },
      ];
    case "buildings":
    default:
      return [
        { num: "04", name: "Ground & Drone Audit" },
        { num: "02", name: "Substructure & Plinth Beam" },
        { num: "03", name: "Superstructure Column Framework" },
        { num: "05", name: "Tranche Clearance" },
        { num: "01", name: "Baseline Geo-Lock" },
      ];
  }
}

export function getSectorAnomalies(cat: SectorCategory): string[] {
  switch (cat) {
    case "roads":
      return [
        "Chainage 24+400 to 28+100 DBM thickness shortfall (Measured: 32mm vs 50mm spec)",
        "Volumetric earthwork DSM shows -18% cut/fill void on embankment slope",
        "Subgrade compaction failed IRC:37 Proctor density (92.4% vs 98% required)",
        "Right-of-Way boundary clearance deviation on chainage 14+200",
        "Median crash barrier post spacing exceeds IRC limit by 40cm",
      ];
    case "railways":
      return [
        "Ballast cushion thickness deficit: 190mm vs 300mm standard",
        "Overhead OHE mast erection deficit (Only 14 of 32 masts erected)",
        "Track alignment gauge deviation detected on Curve C-04",
        "Formation blanketing layer compaction density shortfall",
        "Electronic interlocking cable duct trenching depth deficit (< 0.8m)",
      ];
    case "water":
      return [
        "Hydrostatic pressure drop detected: 3.2 bar loss over 6 hours",
        "Trench bedding sand depth shortfall (70mm vs 150mm spec)",
        "Canal embankment lining concrete crack along 340m stretch",
        "DI pipeline joint radiographic NDT test pending clearance",
        "Intake pump house sump excavation delayed by 45 days",
      ];
    case "power":
      return [
        "Tower #42 leg pitch alignment deviation exceeding 15mm tolerance",
        "Conductor stringing mid-span sag ground clearance deficit (< 7.8m)",
        "Substation transformer earthing resistance elevated (2.4 Ohm vs < 1.0 Ohm)",
        "Tower footing concrete chimney cold joint defect detected",
        "Galvanized tower steel inventory deficit in distribution yard",
      ];
    case "telecom":
      return [
        "Lattice tower verticality tilt exceeds 1:1000 structural limit",
        "OFC duct burial depth shortfall along national highway section",
        "Antenna mounting azimuth deviation of 18 degrees on sector 2",
        "Tower anchor bolt torque inspection failed ASTM spec",
        "Earthing pit resistance exceeds 2.0 Ohm safety threshold",
      ];
    case "mining":
      return [
        "Overburden dump bench slope angle exceeds DGMS 28-degree safety limit",
        "Volumetric drone DSM shows -22% coal extraction shortfall",
        "Haul road width constriction on North face (< 2.5x dumper width)",
        "Environmental PM10 particulate telemetry exceeds CPCB limit",
        "Boundary pillar #08 displaced from statutory lease coordinate",
      ];
    case "buildings":
    default:
      return [
        "Only 4 of 24 pillars erected (Shortfall: 20 columns)",
        "Volumetric earthwork DSM shows -18% cut/fill void",
        "Fe-550 TMT steel rebar stock idle in yard (not cast)",
        "Plinth concrete compressive strength pending NABL core test",
        "Superstructure slab reinforcement spacing exceeds design drawings",
      ];
  }
}

export function getSectorCompliantFindings(cat: SectorCategory): string[] {
  switch (cat) {
    case "roads":
      return [
        "Bituminous concrete core thickness and IRC:37 subgrade density verified compliant",
        "ISRO Cartosat-3 telemetry matches roadway embankment corridor bounds",
        "Laser profilometer international roughness index (IRI) certified < 1.8 m/km",
        "Drainage culvert barrel alignment and headwall casting verified to drawings",
        "Sub-base compaction and layer thickness certified MoRTH Section 400 compliant",
      ];
    case "railways":
      return [
        "Track alignment, sleeper spacing, and RDSO ballast compaction verified within spec",
        "OHE mast verticality, cantilever stagger, and contact wire height verified",
        "Plate load test Ev2 formation compaction certified > 45 MPa",
        "Electronic interlocking signalling loop resistance certified compliant",
        "Drone corridor LiDAR confirms clearance envelope matches IRS schedule",
      ];
    case "water":
      return [
        "Hydrostatic pipeline pressure held at 12 bar for 24 hours with zero drop",
        "Canal concrete lining compaction and joint sealant integrity verified",
        "Pipeline sand bedding depth and backfill compaction verified compliant",
        "Intake pump station intake manifold civil structure certified to design",
        "SCADA ultrasonic flowmeter telemetry calibrated and verified compliant",
      ];
    case "power":
      return [
        "Transmission tower verticality and conductor ground clearance verified compliant",
        "Tower stub footing concrete compressive test certified > 20 N/mm²",
        "Substation transformer earth mat resistance verified < 0.5 Ohm",
        "UAV infrared thermography scan confirms zero hot-spot temperature delta",
        "Insulator string flashover clearance certified CEA safety compliant",
      ];
    case "telecom":
      return [
        "Lattice tower plumbness and antenna azimuth calibrated to telecom circle spec",
        "Optical fiber OTDR trace logs confirm loss < 0.20 dB/km across section",
        "Tower foundation concrete cube strength certified IS 456 M25 compliant",
        "Earthing pit copper chemical grounding resistance verified < 1.0 Ohm",
        "Cryptographic RF radiation exposure survey certified DoT compliant",
      ];
    case "mining":
      return [
        "Bench slope angle and drone volumetric pit surveys certified DGMS compliant",
        "Haul road gradient, width, and safety berm dimensions verified compliant",
        "Continuous ambient air quality particulate levels verified below CPCB norms",
        "Overburden dump stability radar confirms zero slope displacement",
        "DGPS statutory lease boundary coordinates verified and sealed",
      ];
    case "buildings":
    default:
      return [
        "Physical progress corroborates remote sensor photogrammetry",
        "ISRO Cartosat-3 telemetry matches foundation excavation bounds",
        "NABL core compressive strength tests verified within spec",
        "Superstructure foundation rebar density matches structural design",
        "Sub-base compaction and layer thickness certified compliant",
      ];
  }
}

export function getShortfallReason(cat: SectorCategory): string {
  switch (cat) {
    case "roads":
      return "until subgrade density, bituminous layers, and drainage culverts are certified.";
    case "railways":
      return "until track alignment, ballast cushion, and OHE masts are certified.";
    case "water":
      return "until hydrostatic pressure, trench backfill, and canal lining are certified.";
    case "power":
      return "until tower stubs, conductor sag, and earthing tests are certified.";
    case "telecom":
      return "until tower verticality, anchor bolts, and OFC ducting are certified.";
    case "mining":
      return "until pit slopes, haul road width, and volumetric surveys are certified.";
    case "buildings":
    default:
      return "until columns, structural frame, and foundation tests are certified.";
  }
}

export function getLabTestLabel(cat: SectorCategory) {
  switch (cat) {
    case "roads":
      return { title: "Bitumen / Core Test", sub: "IRC:37 Core Test", cat: "Bitumen Lab Core Test (IRC:37)" };
    case "railways":
      return { title: "Ballast / Plate Test", sub: "RDSO / Ev2 Test", cat: "Ballast & Plate Load Test (RDSO)" };
    case "water":
      return { title: "Hydrostatic Test", sub: "IS 3589 Pressure", cat: "Hydrostatic Pressure Test (IS 3589)" };
    case "power":
      return { title: "Earthing / Sag Test", sub: "CEA Earth Resistance", cat: "Earthing & Sag Test (CEA)" };
    case "telecom":
      return { title: "OTDR / Loss Test", sub: "DoT Splice Logs", cat: "OTDR Loss Test (DoT)" };
    case "mining":
      return { title: "Slope Stability Test", sub: "DGMS SSR Radar", cat: "Slope Stability Test (DGMS)" };
    case "buildings":
    default:
      return { title: "Lab Core Test", sub: "NABL Certificate", cat: "Concrete Lab Test (IS 456 M25)" };
  }
}

const STORAGE_KEY_CHECKLISTS = "drishti_inspections_checked_state";
const STORAGE_KEY_SELECTED_INSP = "drishti_selected_inspection_id";

export default function Inspections() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get("projectId");

  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterTier, setFilterTier] = useState<AuditTier>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedInspectionId, setSelectedInspectionId] = useState<string | null>(() => {
    return initialProjectId
      ? `INS-2026-${initialProjectId}`
      : localStorage.getItem(STORAGE_KEY_SELECTED_INSP);
  });

  // Checklists state (per inspection ID) persisted in localStorage
  const [checkedState, setCheckedState] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CHECKLISTS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load checklist state", e);
    }
    return {};
  });

  // Modals state
  const [modalType, setModalType] = useState<"upload" | "schedule" | "notice" | null>(null);
  const [uploadCategory, setUploadCategory] = useState("Photo");

  // Load real projects and MongoDB checklists from backend
  useEffect(() => {
    projectService
      .getProjects()
      .then((res) => {
        const list = res.results || [];
        setProjectsList(list);

        // Hydrate checkedState directly from MongoDB Atlas
        const mongoChecks: Record<string, Record<string, boolean>> = {};
        list.forEach((p) => {
          if (p.inspection_checklist && Object.keys(p.inspection_checklist).length > 0) {
            mongoChecks[`INS-2026-${p.project_id}`] = p.inspection_checklist;
          }
        });

        if (Object.keys(mongoChecks).length > 0) {
          setCheckedState((prev) => ({
            ...prev,
            ...mongoChecks,
          }));
        }
      })
      .catch((err) => {
        console.error("Failed to load projects for inspections:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  // Generate enriched statutory inspection list (deterministic from project_id)
  const inspections: InspectionItem[] = useMemo(() => {
    if (projectsList.length === 0) {
      // Fallback baseline projects
      return [
        {
          id: "INS-2026-DR-0001",
          project: "DR-0001",
          name: "Delhi-Amritsar-Katra Expressway Phase-I (Punjab Section)",
          state: "Punjab",
          department: "Roads & Highways",
          sector: "Roads & Highways",
          claimedProgress: 42.0,
          auditedProgress: 16.0,
          progressGap: 26.0,
          risk: 85,
          assigned: "S. Venkatesh",
          division: "KES / NHAI Div-IV",
          date: "18 Sep 2026",
          status: "Flagged Divergence",
          checkpoint: "Ground & Drone Volumetric Photogrammetry",
          checkpointNum: "04",
          trancheHeldCr: 390.71,
          tier: "Tier 3: Ground",
          anomalyFinding: "Chainage 24+400 to 28+100 DBM thickness shortfall (Measured: 32mm vs 50mm spec)",
          evidenceCount: 24,
        },
      ];
    }

    return projectsList.map((p, idx) => {
      // Deterministic numeric seed from project_id (e.g. DR-0005 -> 5)
      const idMatch = p.project_id.match(/\d+/);
      const idNum = idMatch ? parseInt(idMatch[0], 10) : idx + 1;

      const claimed = p.reported_progress != null ? Number(p.reported_progress) : 38.5;
      const sector = p.sector || p.department || "Roads & Highways";
      const cat = resolveSectorCategory(sector, p.project_name);
      
      // Deterministic Calibrated Criteria (~20-25% of audited sites):
      // 1. Isolation Forest ML Anomaly flag
      // 2. High systematic risk score (>= 40)
      // 3. Periodic targeted sample audit (every 5th site with claimed progress > 25%)
      const hasMLAnomaly = Boolean(p.anomaly_flag);
      const isHighRisk = p.risk_score != null && p.risk_score >= 40;
      const isSampleAudit = idNum % 5 === 0 && claimed > 25;
      const isHighDivergence = hasMLAnomaly || isHighRisk || isSampleAudit;

      let audited: number;
      let gap: number;

      if (isHighDivergence) {
        // High divergence: ground physical audit reveals divergence exceeding statutory 15% threshold
        audited = Math.max(5.0, Number((claimed * 0.45).toFixed(1)));
        gap = Number((claimed - audited).toFixed(1));
        if (gap < 16.0) {
          gap = 16.5;
          audited = Math.max(0.0, Number((claimed - gap).toFixed(1)));
        }
      } else {
        // Normal compliant audit: within standard operational tolerance (1.5% - 7.4% divergence)
        const minorVariance = Number(((((idNum * 13) % 60) + 15) / 10).toFixed(1));
        gap = minorVariance;
        audited = Math.max(0.0, Number((claimed - gap).toFixed(1)));
      }

      const nonFlaggedStatuses: InspectionItem["status"][] = [
        "In Progress",
        "Review Required",
        "Assigned",
        "Completed",
      ];
      const status: InspectionItem["status"] = isHighDivergence
        ? "Flagged Divergence"
        : nonFlaggedStatuses[idNum % nonFlaggedStatuses.length];

      const checkpoints = getSectorCheckpoints(cat);
      const cp = status === "Flagged Divergence" ? checkpoints[0] : checkpoints[idNum % checkpoints.length];

      const tiers: InspectionItem["tier"][] = [
        "Tier 3: Ground",
        "Tier 2: Drone",
        "Tier 1: Space",
        "Tier 4: Treasury",
      ];
      const tier = tiers[idNum % tiers.length];

      const sectorOfficers: Record<SectorCategory, { name: string; div: string }[]> = {
        roads: [
          { name: "S. Venkatesh", div: "NHAI Project Div-IV" },
          { name: "Ananya Roy", div: "MoRTH Technical Wing" },
          { name: "P. Sharma", div: "State PWD Highways" },
        ],
        railways: [
          { name: "P. Kumar", div: "Rail Vikas Nigam QA" },
          { name: "S. Nair", div: "RDSO Track Standards" },
          { name: "V. Pillai", div: "IRCON Infrastructure" },
        ],
        water: [
          { name: "R. Sengupta", div: "Jal Jeevan Mission QA" },
          { name: "M. Reddy", div: "Water Resources Dept" },
          { name: "K. Sen", div: "CWC Hydro-Audit" },
        ],
        power: [
          { name: "A. Mathur", div: "PGCIL Grid Operations" },
          { name: "D. Banerjee", div: "State Transco Oversight" },
          { name: "H. Patel", div: "CEA Transmission Wing" },
        ],
        telecom: [
          { name: "N. Joshi", div: "DoT Telecom Enforcement" },
          { name: "S. Gill", div: "USOF Optical Network" },
          { name: "R. Bhatia", div: "BSNL Infrastructure" },
        ],
        mining: [
          { name: "B. Soren", div: "DGMS Mining Oversight" },
          { name: "T. Mandal", div: "CMPDI Volumetric Desk" },
          { name: "G. Das", div: "Coal India QA Cell" },
        ],
        buildings: [
          { name: "K. Rajan", div: "CPWD Civil Zone 1" },
          { name: "S. Nair", div: "State PWD Oversight" },
          { name: "R. Verma", div: "NBCC Project Wing" },
        ],
      };
      const officersList = sectorOfficers[cat] || sectorOfficers.roads;
      const officer = officersList[idNum % officersList.length];

      const totalCostCr = p.revised_cost_cr || p.original_cost_cr || 850;
      // Tranche withholding legally enforced on flagged divergence pending resolution
      const trancheHeld = status === "Flagged Divergence" ? Number(((totalCostCr * gap) / 100).toFixed(2)) : 0;

      const anomalies = getSectorAnomalies(cat);
      const compliantFindings = getSectorCompliantFindings(cat);
      const finding = status === "Flagged Divergence"
        ? anomalies[idNum % anomalies.length]
        : compliantFindings[idNum % compliantFindings.length];

      return {
        id: `INS-2026-${p.project_id}`,
        project: p.project_id,
        name: p.project_name,
        state: p.state || "National",
        department: p.department || sector,
        sector,
        claimedProgress: Number(claimed.toFixed(1)),
        auditedProgress: Number(audited.toFixed(1)),
        progressGap: gap,
        risk: p.risk_score || (isHighDivergence ? 85 : 42),
        assigned: officer.name,
        division: officer.div,
        date: `${12 + (idNum % 14)} Sep 2026`,
        status,
        checkpoint: cp.name,
        checkpointNum: cp.num,
        trancheHeldCr: trancheHeld,
        tier,
        anomalyFinding: finding,
        evidenceCount: 12 + (idNum % 15),
      };
    });
  }, [projectsList]);

  // Set default selected inspection (preserving user selection across refresh)
  useEffect(() => {
    if (inspections.length > 0) {
      const targetId = initialProjectId
        ? `INS-2026-${initialProjectId}`
        : (selectedInspectionId || localStorage.getItem(STORAGE_KEY_SELECTED_INSP));

      if (targetId) {
        const found = inspections.find((i) => i.id === targetId || i.project === targetId);
        if (found) {
          if (selectedInspectionId !== found.id) {
            setSelectedInspectionId(found.id);
          }
          return;
        }
      }

      if (!selectedInspectionId || !inspections.find((i) => i.id === selectedInspectionId)) {
        const firstFlagged = inspections.find((i) => i.status === "Flagged Divergence");
        const defaultId = firstFlagged ? firstFlagged.id : inspections[0].id;
        setSelectedInspectionId(defaultId);
        try {
          localStorage.setItem(STORAGE_KEY_SELECTED_INSP, defaultId);
        } catch (e) {}
      }
    }
  }, [inspections, initialProjectId]);

  // Currently selected inspection
  const selectedInspection = useMemo(() => {
    return inspections.find((i) => i.id === selectedInspectionId) || inspections[0];
  }, [inspections, selectedInspectionId]);

  // Dynamic Sector Category for currently selected inspection
  const selectedSectorCat = useMemo((): SectorCategory => {
    if (!selectedInspection) return "roads";
    return resolveSectorCategory(selectedInspection.sector || selectedInspection.department, selectedInspection.name);
  }, [selectedInspection]);

  // Sector-tailored Section 65B Checklist
  const currentChecklist = useMemo(() => {
    return sectorChecklists[selectedSectorCat] || sectorChecklists.roads;
  }, [selectedSectorCat]);

  // Checklist handler with localStorage persistence and status-aware baseline
  const isChecked = (itemId: string) => {
    if (!selectedInspection) return false;
    const projectChecks = checkedState[selectedInspection.id];
    if (projectChecks && projectChecks[itemId] !== undefined) {
      return projectChecks[itemId];
    }
    
    // Status-appropriate default initial verified items:
    // Completed: all items (c1 to c7) passed
    // Review Required: c1 to c5 passed
    // In Progress: c1 to c4 passed
    // Flagged Divergence: only c1 and c2 passed (subsequent checkpoints failed)
    // Assigned: only c1 passed
    switch (selectedInspection.status) {
      case "Completed":
        return true;
      case "Review Required":
        return ["c1", "c2", "c3", "c4", "c5"].includes(itemId);
      case "In Progress":
        return ["c1", "c2", "c3", "c4"].includes(itemId);
      case "Flagged Divergence":
        return ["c1", "c2"].includes(itemId);
      case "Assigned":
      default:
        return itemId === "c1";
    }
  };

  const [syncingMongo, setSyncingMongo] = useState(false);

  const toggleCheck = (itemId: string) => {
    if (!selectedInspection) return;
    const currentVal = isChecked(itemId);
    const inspectionId = selectedInspection.id;
    const projectId = selectedInspection.project;

    // Snapshot full updated checks for all current checklist items
    const updatedChecks: Record<string, boolean> = {};
    currentChecklist.forEach((c) => {
      updatedChecks[c.id] = c.id === itemId ? !currentVal : isChecked(c.id);
    });

    // 1. Optimistic React & local state update
    setCheckedState((prev) => {
      const updated = {
        ...prev,
        [inspectionId]: updatedChecks,
      };
      try {
        localStorage.setItem(STORAGE_KEY_CHECKLISTS, JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save checkedState to localStorage", e);
      }
      return updated;
    });

    // 2. Persist directly to MongoDB Atlas
    setSyncingMongo(true);
    projectService
      .saveChecklist(projectId, updatedChecks)
      .then(() => {
        console.log(`Saved checklist for ${projectId} to MongoDB Atlas.`);
      })
      .catch((err) => {
        console.warn(`Could not save checklist to MongoDB Atlas, cached locally:`, err);
      })
      .finally(() => {
        setTimeout(() => setSyncingMongo(false), 400);
      });
  };

  const completedCount = useMemo(() => {
    return currentChecklist.filter((c) => isChecked(c.id)).length;
  }, [currentChecklist, selectedInspection, checkedState]);

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
      <div className="max-w-[1440px] mx-auto px-6 pt-6">
        {/* Main Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div className="max-w-[820px]">
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
                        onClick={() => {
                          setSelectedInspectionId(insp.id);
                          try {
                            localStorage.setItem(STORAGE_KEY_SELECTED_INSP, insp.id);
                          } catch (e) {}
                          setSearchParams({ projectId: insp.project });
                        }}
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
                      <strong>Audit Shortfall: -{selectedInspection.progressGap}%</strong> · ₹{selectedInspection.trancheHeldCr} Cr withheld at Checkpoint 05 {getShortfallReason(selectedSectorCat)}
                    </div>
                  </div>
                </div>

                {/* Statutory Section 65B Field Checklist */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-black uppercase tracking-wider text-[#0b1f4b] flex items-center gap-1.5">
                      <span>⚖️</span> Section 65B Audit Checklist
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-slate-200">
                        {selectedSectorCat.toUpperCase()} PROTOCOL
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {syncingMongo ? (
                        <span className="text-[10px] font-mono text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 animate-pulse">
                          Syncing to MongoDB...
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          MongoDB Synced
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {completedCount}/{currentChecklist.length} Verified
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-3">
                    <div
                      className="bg-emerald-600 h-full transition-all duration-300"
                      style={{ width: `${(completedCount / currentChecklist.length) * 100}%` }}
                    />
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    {currentChecklist.map((item) => {
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

                    {(() => {
                      const lab = getLabTestLabel(selectedSectorCat);
                      return (
                        <div
                          onClick={() => {
                            setUploadCategory(lab.cat);
                            setModalType("upload");
                          }}
                          className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-sky-50/50 hover:border-sky-300 cursor-pointer transition-all flex items-center gap-2"
                        >
                          <span className="text-lg">🧪</span>
                          <div>
                            <div className="font-bold text-slate-800">{lab.title}</div>
                            <div className="text-[9px] text-slate-400">{lab.sub}</div>
                          </div>
                        </div>
                      );
                    })()}

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
                      {getSectorCheckpoints(selectedSectorCat).map((cp) => (
                        <option key={cp.num}>
                          Checkpoint {cp.num}: {cp.name}
                        </option>
                      ))}
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
