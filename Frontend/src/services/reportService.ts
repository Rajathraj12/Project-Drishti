import { fetchApi } from './api';

export interface OversightDashboardData {
  user_scope: {
    username: string;
    role: string;
    state?: string | null;
    district?: string | null;
    department?: string | null;
    is_citizen: boolean;
    can_view_risk: boolean;
    can_view_ml: boolean;
    can_view_actions: boolean;
  };
  project_counts: {
    total_projects: number;
    official_projects: number;
    synthetic_projects?: number;
    total_original_cost_cr: number;
    total_revised_cost_cr: number;
    total_expenditure_cr: number;
    average_progress_pct: number;
  };
  risk_distribution: Record<string, number>;
  ml_anomaly_distribution: Record<string, number>;
  verification_distribution: Record<string, number>;
  corrective_actions_summary: Record<string, number>;
  filter_options: {
    states: string[];
    districts: string[];
    sectors: string[];
    statuses: string[];
    risk_levels: string[];
    data_source_types?: string[];
  };
  data_provenance: {
    official_source: string;
    synthetic_source?: string;
    reporting_dates_available: string[];
    server_as_of: string;
  };
}

export interface ReportResponse {
  report_type: string;
  count: number;
  generated_at: string;
  role: string;
  results: Record<string, any>[];
}

export const reportService = {
  /**
   * Fetch aggregated oversight dashboard summary metrics
   */
  async getDashboardSummary(params?: Record<string, string>): Promise<OversightDashboardData> {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== 'ALL' && v !== 'All States' && v !== 'All Districts' && v !== 'All Sectors') {
          searchParams.append(k, v);
        }
      });
    }
    const q = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return fetchApi<OversightDashboardData>(`/reports/dashboard/${q}`);
  },

  /**
   * Fetch tabular reports data (risk_assessments, overdue_actions, pending_reviews, unresolved_findings, public_oversight)
   */
  async getReportData(reportType: string, params?: Record<string, string>): Promise<ReportResponse> {
    const searchParams = new URLSearchParams();
    searchParams.append('report_type', reportType);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== 'ALL' && v !== 'All States' && v !== 'All Districts' && v !== 'All Sectors') {
          searchParams.append(k, v);
        }
      });
    }
    return fetchApi<ReportResponse>(`/reports/?${searchParams.toString()}`);
  },

  /**
   * Download CSV export for the specified report type and filters
   */
  async exportCsv(reportType: string, params?: Record<string, string>): Promise<void> {
    const searchParams = new URLSearchParams();
    searchParams.append('report_type', reportType);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v && v !== 'ALL' && v !== 'All States' && v !== 'All Districts' && v !== 'All Sectors') {
          searchParams.append(k, v);
        }
      });
    }

    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const token = localStorage.getItem('token');
    const bypassEnabled = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
    const devRole = bypassEnabled ? localStorage.getItem('dev_role') : null;

    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (bypassEnabled && devRole) headers['X-Dev-Role'] = devRole;

    const res = await fetch(`${API_BASE_URL}/reports/export/?${searchParams.toString()}`, {
      headers,
    });

    if (!res.ok) {
      throw new Error(`Export failed: ${res.status} ${res.statusText}`);
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drishti_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
