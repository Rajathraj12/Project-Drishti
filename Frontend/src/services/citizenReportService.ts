/**
 * Citizen Report & Grievance Service
 *
 * All submissions are persisted in MongoDB Atlas via the Django REST API:
 *   POST  /api/citizen-reports/          — submit grievance
 *   GET   /api/citizen-reports/          — list (own for citizens, all for officers)
 *   GET   /api/citizen-reports/<id>/     — fetch single report
 *   PATCH /api/citizen-reports/<id>/     — update status / assign (officers only)
 *
 * A localStorage cache is kept as a read-through layer so the "My Reports" page
 * renders instantly while the async fetch runs in the background.
 */

import { fetchApi } from "./api"

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

export interface CitizenReportsResponse {
  count: number
  results: CitizenReportItem[]
}

// ---------------------------------------------------------------------------
// localStorage cache key (for instant rendering while API loads)
// ---------------------------------------------------------------------------
const CACHE_KEY = "drishti_citizen_reports_cache_v2"

function readCache(): CitizenReportItem[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeCache(reports: CitizenReportItem[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(reports))
    window.dispatchEvent(new CustomEvent("drishti_reports_changed", { detail: reports }))
  } catch {
    // quota exceeded — silent fail
  }
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

/** Fetch all reports the current user is allowed to see. */
async function fetchReports(params?: Record<string, string>): Promise<CitizenReportItem[]> {
  const qs = params ? "?" + new URLSearchParams(params).toString() : ""
  const resp = await fetchApi<CitizenReportsResponse>(`/citizen-reports/${qs}`)
  const results = resp.results ?? []
  writeCache(results)
  return results
}

/** Fetch a single report by MongoDB id or referenceNo. */
async function fetchReport(id: string): Promise<CitizenReportItem> {
  return fetchApi<CitizenReportItem>(`/citizen-reports/${encodeURIComponent(id)}/`)
}

/** Submit a new grievance report. */
async function submitReport(data: {
  projectId?: string
  projectName?: string
  issueType: string
  description: string
  location: string
  photoName?: string
  state?: string
  department?: string
  citizenContact?: string
}): Promise<CitizenReportItem> {
  const report = await fetchApi<CitizenReportItem>("/citizen-reports/", {
    method: "POST",
    body: JSON.stringify(data),
  })

  // Optimistic cache update
  const cached = readCache()
  writeCache([report, ...cached])

  return report
}

/** Update a report's status/assignment (officers only). */
async function updateStatus(
  id: string,
  update: {
    status: ReportStatus
    resolvedNote?: string
    priority?: ReportPriority
    assignedOfficer?: string
    assignedInspector?: string
  }
): Promise<CitizenReportItem | null> {
  try {
    const updated = await fetchApi<CitizenReportItem>(`/citizen-reports/${encodeURIComponent(id)}/`, {
      method: "PATCH",
      body: JSON.stringify(update),
    })

    // Sync cache
    const cached = readCache()
    const idx = cached.findIndex((r) => r.id === id || r.referenceNo === id)
    if (idx !== -1) {
      cached[idx] = updated
      writeCache(cached)
    }

    return updated
  } catch (err) {
    console.error("[citizenReportService] updateStatus error:", err)
    return null
  }
}

/** Return cached reports synchronously (for instant render). */
function getCached(): CitizenReportItem[] {
  return readCache()
}

// ---------------------------------------------------------------------------
// Export as a singleton-style object to match existing call sites
// ---------------------------------------------------------------------------
class CitizenReportService {
  /**
   * Fetch all reports from the API.
   * Pass optional filters for officers: { status, priority, state, project_id }
   */
  async getAll(params?: Record<string, string>): Promise<CitizenReportItem[]> {
    return fetchReports(params)
  }

  /** Instantly returns cached reports (may be stale). */
  getCached(): CitizenReportItem[] {
    return getCached()
  }

  /** Fetch a single report by id or referenceNo. */
  async getById(id: string): Promise<CitizenReportItem | undefined> {
    try {
      return await fetchReport(id)
    } catch {
      // Fallback to cache
      return getCached().find((r) => r.id === id || r.referenceNo === id)
    }
  }

  /** Submit a new grievance. Returns the created report with its referenceNo. */
  async submitReport(data: {
    projectId?: string
    projectName?: string
    issueType: string
    description: string
    location: string
    photoName?: string
    state?: string
    department?: string
    citizenContact?: string
  }): Promise<CitizenReportItem> {
    return submitReport(data)
  }

  /** Update report status/assignment. Officers only. */
  async updateStatus(
    id: string,
    update: {
      status: ReportStatus
      resolvedNote?: string
      priority?: ReportPriority
      assignedOfficer?: string
      assignedInspector?: string
    }
  ): Promise<CitizenReportItem | null> {
    return updateStatus(id, update)
  }
}

export const citizenReportService = new CitizenReportService()
