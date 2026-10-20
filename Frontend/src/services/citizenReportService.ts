/**
 * Citizen Report & Grievance Service
 * Manages citizen submitted complaints and reports across infrastructure projects.
 * Supports persistence in localStorage so updates by Government Officers & Admins
 * are immediately reflected in the citizen's "My Reports" tracking view.
 */

export type ReportStatus = "Submitted" | "Under Review" | "Verified" | "Resolved" | "Closed" | "Dismissed"
export type ReportPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"

export interface CitizenReportItem {
  id: string
  referenceNo: string
  projectId: string
  projectName: string
  issueType: string
  description: string
  location: string
  photoUrl?: string
  photoName?: string
  submittedAt: string
  status: ReportStatus
  priority: ReportPriority
  lastUpdated: string
  resolvedNote?: string
  assignedOfficer?: string
  assignedInspector?: string
  department?: string
  state?: string
  citizenContact?: string
}

const STORAGE_KEY = "drishti_citizen_reports_v1"

const SEED_REPORTS: CitizenReportItem[] = [
  {
    id: "rep-001",
    referenceNo: "RPT-2026-00847",
    projectId: "DR-0012",
    projectName: "NH-48 Expressway Expansion Phase 2",
    issueType: "Work stopped without reason",
    description: "Construction work has been completely halted for over 3 weeks. Heavy machinery is lying idle and no workers or supervisors have been seen at the bypass stretch.",
    location: "Sector 14, Gurugram, Haryana",
    submittedAt: "2026-10-18T10:30:00Z",
    status: "Under Review",
    priority: "HIGH",
    lastUpdated: "2026-10-19T14:20:00Z",
    department: "National Highways (NHAI)",
    state: "Haryana",
    assignedOfficer: "Rajesh Sharma",
    assignedInspector: "Sunita Rao",
    photoName: "nh48_idle_site.jpg",
  },
  {
    id: "rep-002",
    referenceNo: "RPT-2026-00721",
    projectId: "DR-0031",
    projectName: "Rural Drinking Water Supply Scheme - Block B",
    issueType: "Poor material quality",
    description: "The pipeline fittings being installed appear severely substandard. Visible rust and hairline cracks were spotted on newly delivered DI pipes prior to trench filling.",
    location: "Village Rampur, District Meerut, UP",
    submittedAt: "2026-10-05T08:45:00Z",
    status: "Resolved",
    priority: "CRITICAL",
    lastUpdated: "2026-10-15T11:00:00Z",
    department: "Water Resources & Jal Shakti",
    state: "Uttar Pradesh",
    assignedOfficer: "M. K. Deshmukh",
    assignedInspector: "Sunita Rao",
    resolvedNote: "Site inspection conducted on Oct 10. Contractor ordered to remove and replace entire batch of defective pipe fittings. Re-inspection completed and verified compliant.",
    photoName: "cracked_pipes_batch4.jpg",
  },
  {
    id: "rep-003",
    referenceNo: "RPT-2026-00689",
    projectId: "DR-0055",
    projectName: "Primary School Building Reconstruction",
    issueType: "Safety hazards at site",
    description: "Deep foundation trenches right next to the operating classroom wing without any barricades or caution tape. School children play within feet of the open excavation.",
    location: "Shastri Nagar, Jaipur, Rajasthan",
    submittedAt: "2026-09-28T16:10:00Z",
    status: "Closed",
    priority: "HIGH",
    lastUpdated: "2026-10-02T09:30:00Z",
    department: "Public Works Department (PWD)",
    state: "Rajasthan",
    assignedOfficer: "Pooja Sundaram",
    resolvedNote: "Reinforced safety barricading and security perimeter erected within 48 hours. Contractor issued formal warning notice for safety non-compliance.",
  },
  {
    id: "rep-004",
    referenceNo: "RPT-2026-00912",
    projectId: "DR-0008",
    projectName: "District Hospital Trauma Care Centre",
    issueType: "Progress slower than expected",
    description: "The concrete roof casting was supposed to be completed two months ago according to the public signboard. Work is moving at a snail's pace with only 4-5 laborers on site.",
    location: "Civil Lines, Kanpur, Uttar Pradesh",
    submittedAt: "2026-10-19T11:15:00Z",
    status: "Submitted",
    priority: "MEDIUM",
    lastUpdated: "2026-10-19T11:15:00Z",
    department: "Public Works Department (PWD)",
    state: "Uttar Pradesh",
    photoName: "trauma_center_slow_progress.jpg",
  },
  {
    id: "rep-005",
    referenceNo: "RPT-2026-00924",
    projectId: "DR-0019",
    projectName: "Rural Connectivity Bridge over Hindon Canal",
    issueType: "Suspected irregularities",
    description: "The bridge approach road was asphalted last week during heavy rain. The asphalt layer is already crumbling and peeling away under light tractor traffic.",
    location: "Muradnagar, Ghaziabad, UP",
    submittedAt: "2026-10-20T14:40:00Z",
    status: "Submitted",
    priority: "HIGH",
    lastUpdated: "2026-10-20T14:40:00Z",
    department: "Rural Development",
    state: "Uttar Pradesh",
    photoName: "eroded_asphalt_approach.jpg",
  },
  {
    id: "rep-006",
    referenceNo: "RPT-2026-00802",
    projectId: "DR-0042",
    projectName: "Urban Flyover & Grade Separator",
    issueType: "Contractor absent from site",
    description: "Contractor site office locked and abandoned for 2 weeks. Open construction material occupying active traffic lanes causing severe daily jams.",
    location: "Ring Road Jn, Bhopal, MP",
    submittedAt: "2026-10-12T09:20:00Z",
    status: "Verified",
    priority: "CRITICAL",
    lastUpdated: "2026-10-16T16:00:00Z",
    department: "Urban Development & PWD",
    state: "Madhya Pradesh",
    assignedOfficer: "Rajesh Sharma",
    assignedInspector: "K. Narayanaswamy",
    resolvedNote: "Field Inspector verified site abandonment. Notice to cure issued to contractor with 7-day cure period.",
  }
]

class CitizenReportService {
  private reports: CitizenReportItem[] = []

  constructor() {
    this.init()
  }

  private init() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.reports = JSON.parse(stored)
      } else {
        this.reports = [...SEED_REPORTS]
        this.save()
      }
    } catch (err) {
      console.warn("Could not load stored citizen reports:", err)
      this.reports = [...SEED_REPORTS]
    }
  }

  private save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.reports))
      window.dispatchEvent(new CustomEvent("drishti_reports_changed", { detail: this.reports }))
    } catch (err) {
      console.warn("Could not persist citizen reports:", err)
    }
  }

  public getAll(): CitizenReportItem[] {
    return [...this.reports]
  }

  public getById(id: string): CitizenReportItem | undefined {
    return this.reports.find(r => r.id === id || r.referenceNo === id)
  }

  public submitReport(data: {
    projectId?: string
    projectName?: string
    issueType: string
    description: string
    location: string
    photoName?: string
    citizenContact?: string
  }): CitizenReportItem {
    const nextNum = Math.floor(10000 + Math.random() * 90000)
    const referenceNo = `RPT-2026-${nextNum}`
    const id = `rep-${Date.now()}`

    const newReport: CitizenReportItem = {
      id,
      referenceNo,
      projectId: data.projectId?.trim() || "DR-UNSPECIFIED",
      projectName: data.projectName?.trim() || (data.projectId ? `Project ${data.projectId.toUpperCase()}` : "Community Civic Project"),
      issueType: data.issueType,
      description: data.description,
      location: data.location,
      photoName: data.photoName,
      submittedAt: new Date().toISOString(),
      status: "Submitted",
      priority: data.issueType.includes("Safety") || data.issueType.includes("Irregularities") ? "HIGH" : "MEDIUM",
      lastUpdated: new Date().toISOString(),
      citizenContact: data.citizenContact,
    }

    this.reports = [newReport, ...this.reports]
    this.save()
    return newReport
  }

  public updateStatus(
    id: string,
    update: {
      status: ReportStatus
      resolvedNote?: string
      priority?: ReportPriority
      assignedOfficer?: string
      assignedInspector?: string
    }
  ): CitizenReportItem | null {
    const idx = this.reports.findIndex(r => r.id === id || r.referenceNo === id)
    if (idx === -1) return null

    const existing = this.reports[idx]
    const updated: CitizenReportItem = {
      ...existing,
      status: update.status,
      lastUpdated: new Date().toISOString(),
      resolvedNote: update.resolvedNote !== undefined ? update.resolvedNote : existing.resolvedNote,
      priority: update.priority || existing.priority,
      assignedOfficer: update.assignedOfficer || existing.assignedOfficer,
      assignedInspector: update.assignedInspector || existing.assignedInspector,
    }

    this.reports[idx] = updated
    this.save()
    return updated
  }

  public resetToSeed() {
    this.reports = [...SEED_REPORTS]
    this.save()
    return this.reports
  }
}

export const citizenReportService = new CitizenReportService()
