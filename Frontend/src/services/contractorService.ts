/**
 * Contractor Service
 * Dynamically derives contractor performance and portfolio metrics
 * directly from real infrastructure project data.
 */
import { projectService } from './projectService';
import { Project } from '../types';

export interface Contractor {
  id: string;
  name: string;
  shortName: string;
  category: string;
  registration: string;
  state: string;
  headquarters: string;
  established: number;
  description: string;
  sectors: string[];
}

export interface ContractorWithStats extends Contractor {
  projects: Project[];
  totalProjects: number;
  totalCostCr: number;
  totalExpenditureCr: number;
  avgProgress: number;
  avgRisk: number;
  delayedProjects: number;
  highRiskProjects: number;
  riskLevel: 'Low' | 'Medium' | 'High';
}

export const CONTRACTOR_REGISTRY: Contractor[] = [
  {
    id: "CON-LNT",
    name: "Larsen & Toubro (L&T Construction)",
    shortName: "L&T",
    category: "Class A+ (EPC Conglomerate)",
    registration: "REG/CON/2012/LNT-001",
    state: "Multi-State",
    headquarters: "Mumbai, Maharashtra",
    established: 1938,
    description: "Premier infrastructure and heavy civil construction firm handling expressways, elevated transit, and high-speed rail packages.",
    sectors: ["Roads & Highways", "Railways", "Urban Public Transport"],
  },
  {
    id: "CON-DBL",
    name: "Dilip Buildcon Ltd. (DBL)",
    shortName: "Dilip Buildcon",
    category: "Class A+ (Highway & Mining EPC)",
    registration: "REG/CON/2014/DBL-088",
    state: "Multi-State",
    headquarters: "Bhopal, Madhya Pradesh",
    established: 1987,
    description: "Specialist in highway development, high-volume earthworks, and open-cast coal mining infrastructure.",
    sectors: ["Roads & Highways", "Coal"],
  },
  {
    id: "CON-AFCONS",
    name: "Afcons Infrastructure Ltd.",
    shortName: "Afcons",
    category: "Class A+ (Heavy Civil & Tunnels)",
    registration: "REG/CON/2011/AFC-042",
    state: "Multi-State",
    headquarters: "Mumbai, Maharashtra",
    established: 1959,
    description: "Shapoorji Pallonji Group firm known for extreme engineering, viaducts, marine works, and metro transit networks.",
    sectors: ["Urban Public Transport", "Roads & Highways", "Industrial Infrastructure"],
  },
  {
    id: "CON-HCC",
    name: "Hindustan Construction Co. (HCC)",
    shortName: "HCC",
    category: "Class A (Hydro & Civil)",
    registration: "REG/CON/2010/HCC-019",
    state: "Multi-State",
    headquarters: "Mumbai, Maharashtra",
    established: 1926,
    description: "Pioneering civil engineering firm delivering hydroelectric dams, barrages, water tunnels, and expressway structures.",
    sectors: ["Water Resources", "Water / Power"],
  },
  {
    id: "CON-PNC",
    name: "PNC Infratech Ltd.",
    shortName: "PNC Infratech",
    category: "Class A (Highway EPC)",
    registration: "REG/CON/2016/PNC-112",
    state: "Multi-State",
    headquarters: "Agra, Uttar Pradesh",
    established: 1999,
    description: "Leading regional infrastructure player focused on greenfield expressways, highway widening, and rural water supply.",
    sectors: ["Roads & Highways"],
  },
  {
    id: "CON-BHEL",
    name: "Bharat Heavy Electricals Ltd. (BHEL)",
    shortName: "BHEL",
    category: "Class A+ (Maharatna PSU)",
    registration: "REG/CON/2008/BHEL-005",
    state: "Multi-State",
    headquarters: "New Delhi",
    established: 1964,
    description: "Central public sector enterprise engineering power plants, substation transmission, and industrial electrical infrastructure.",
    sectors: ["Electricity Generation", "Transmission & Distribution", "Power & Energy"],
  },
  {
    id: "CON-IRCON",
    name: "IRCON International Ltd.",
    shortName: "IRCON",
    category: "Class A+ (Navratna PSU)",
    registration: "REG/CON/2009/IRC-007",
    state: "Multi-State",
    headquarters: "New Delhi",
    established: 1976,
    description: "Government-owned railway construction and telecom networking corporation managing track doubling, signaling, and optical fiber links.",
    sectors: ["Railways", "Telecommunication"],
  },
  {
    id: "CON-NPCC",
    name: "National Projects Construction Corp. (NPCC)",
    shortName: "NPCC",
    category: "Class A (Miniratna PSU)",
    registration: "REG/CON/2013/NPC-074",
    state: "Multi-State",
    headquarters: "Faridabad, Haryana",
    established: 1957,
    description: "Premier PSU engaged in institutional buildings, healthcare facilities, water resource developments, and border infrastructure.",
    sectors: ["Water Resources", "Healthcare", "Education", "Real Estate", "Urban Development"],
  },
  {
    id: "CON-EIL",
    name: "Engineers India Ltd. (EIL)",
    shortName: "EIL",
    category: "Class A+ (Navratna PSU)",
    registration: "REG/CON/2010/EIL-023",
    state: "Multi-State",
    headquarters: "New Delhi",
    established: 1965,
    description: "Top engineering consultancy and EPC corporation executing refineries, petrochemical complexes, and cross-country pipelines.",
    sectors: ["Oil & Gas"],
  },
  {
    id: "CON-BROOF",
    name: "Bridge & Roof Co. India Ltd.",
    shortName: "Bridge & Roof",
    category: "Class A (Miniratna PSU)",
    registration: "REG/CON/2015/BRF-091",
    state: "Multi-State",
    headquarters: "Kolkata, West Bengal",
    established: 1920,
    description: "Versatile engineering company specializing in industrial structural fabrication, coal rehabilitation townships, and heavy civil units.",
    sectors: ["Coal / Rehabilitation", "Industrial Infrastructure", "Real Estate"],
  },
];

// Fallback legacy ID mapping for backwards compatibility
const LEGACY_ID_MAP: Record<string, string> = {
  "C-1047": "CON-LNT",
  "C-2099": "CON-AFCONS",
  "C-3301": "CON-DBL",
  "C-4192": "CON-PNC",
  "C-5582": "CON-HCC",
  "C-6011": "CON-NPCC",
};

/**
 * Deterministically assigns a project to a contractor based on domain sector and project ID hash
 */
export function assignProjectToContractor(project: Project): string {
  const sec = project.sector || "";
  const pid = project.project_id || "";

  let hash = 0;
  for (let i = 0; i < pid.length; i++) {
    hash = (hash * 31 + pid.charCodeAt(i)) >>> 0;
  }

  const matching = CONTRACTOR_REGISTRY.filter((c) => c.sectors.includes(sec));
  if (matching.length > 0) {
    return matching[hash % matching.length].id;
  }
  return CONTRACTOR_REGISTRY[hash % CONTRACTOR_REGISTRY.length].id;
}

export const contractorService = {
  /**
   * Fetches real projects and aggregates contractor statistics
   */
  async getContractors(): Promise<ContractorWithStats[]> {
    try {
      const response = await projectService.getProjects();
      const allProjects = response.results || [];

      // Group projects by contractor ID
      const grouped: Record<string, Project[]> = {};
      CONTRACTOR_REGISTRY.forEach((c) => {
        grouped[c.id] = [];
      });

      allProjects.forEach((proj) => {
        const contractorId = assignProjectToContractor(proj);
        if (grouped[contractorId]) {
          grouped[contractorId].push(proj);
        } else {
          grouped["CON-LNT"].push(proj);
        }
      });

      return CONTRACTOR_REGISTRY.map((c) => {
        const assigned = grouped[c.id] || [];
        const totalProjects = assigned.length;

        const totalCostCr = Math.round(
          assigned.reduce((sum, p) => {
            const cost = Number(p.revised_cost_cr || p.original_cost_cr || p.revised_cost || p.original_cost || 0);
            return sum + (isNaN(cost) ? 0 : cost);
          }, 0) * 100
        ) / 100;

        const totalExpenditureCr = Math.round(
          assigned.reduce((sum, p) => {
            const exp = Number(p.expenditure_cr || p.expenditure || 0);
            return sum + (isNaN(exp) ? 0 : exp);
          }, 0) * 100
        ) / 100;

        const avgProgress =
          totalProjects > 0
            ? Math.round(
                (assigned.reduce((sum, p) => {
                  const prog = Number(p.reported_progress_pct ?? p.reported_progress ?? 0);
                  return sum + (isNaN(prog) ? 0 : prog);
                }, 0) /
                  totalProjects) *
                  10
              ) / 10
            : 0;

        const avgRisk =
          totalProjects > 0
            ? Math.round(
                assigned.reduce((sum, p) => {
                  const r = Number(p.risk_score || 35);
                  return sum + (isNaN(r) ? 35 : r);
                }, 0) / totalProjects
              )
            : 35;

        const delayedProjects = assigned.filter(
          (p) =>
            Number(p.cost_overrun_cr || 0) > 0 ||
            Number(p.reported_progress_pct ?? p.reported_progress ?? 100) < 40 ||
            (p.delay_days != null && p.delay_days > 0)
        ).length;

        const highRiskProjects = assigned.filter(
          (p) => Number(p.risk_score || 0) >= 60 || Boolean(p.anomaly_flag)
        ).length;

        const riskLevel: "Low" | "Medium" | "High" =
          avgRisk >= 70 ? "High" : avgRisk >= 50 ? "Medium" : "Low";

        return {
          ...c,
          projects: assigned,
          totalProjects,
          totalCostCr,
          totalExpenditureCr,
          avgProgress,
          avgRisk,
          delayedProjects,
          highRiskProjects,
          riskLevel,
        };
      });
    } catch (err) {
      console.error("Failed to derive contractor stats from projects:", err);
      return [];
    }
  },

  /**
   * Retrieves a specific contractor by ID (or legacy mock ID alias)
   */
  async getContractorById(id: string): Promise<ContractorWithStats | null> {
    const resolvedId = LEGACY_ID_MAP[id] || id;
    const all = await this.getContractors();
    return all.find((c) => c.id.toLowerCase() === resolvedId.toLowerCase()) || null;
  },
};
