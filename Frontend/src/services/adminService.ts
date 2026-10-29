/**
 * Admin Service - Real-time User Management, System Telemetry, and Dynamic Department Analytics
 */
import { fetchApi } from './api';
import { User } from '../types';

export interface SystemHealth {
  status: 'OPERATIONAL' | 'DEGRADED' | 'DOWN';
  database: 'CONNECTED' | 'UNAVAILABLE';
  mongodb_atlas: 'CONNECTED' | 'UNAVAILABLE';
  total_users: number;
  active_users: number;
  monitored_projects: number;
  timestamp: string;
  services: Record<string, string>;
}

export interface AdminSettings {
  risk_delay_threshold_pct: number;
  notify_high_risk_email: boolean;
  notify_inspection_hours: number;
  weekly_digest_enabled: boolean;
  ai_confidence_threshold_pct: number;
}

export interface DepartmentMetric {
  name: string;
  projects: number;
  budget: string;
  rawBudgetCr: number;
  officers: number;
}

export const adminService = {
  /**
   * GET /api/users/ - Fetch official personnel from database
   */
  async getUsers(params?: { search?: string; role?: string }): Promise<{ count: number; results: User[] }> {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      if (params.search) searchParams.append('search', params.search);
      if (params.role && params.role !== 'ALL') searchParams.append('role', params.role);
      const str = searchParams.toString();
      if (str) query = `?${str}`;
    }
    const res = await fetchApi<{ count?: number; results?: User[] } | User[]>(`/users/${query}`);
    if (Array.isArray(res)) {
      return { count: res.length, results: res };
    }
    return {
      count: res.count ?? (res.results?.length || 0),
      results: res.results || [],
    };
  },

  /**
   * POST /api/users/ - Provision official account in backend database
   */
  async createUser(user: Partial<User> & { password?: string }): Promise<User> {
    return fetchApi<User>('/users/', {
      method: 'POST',
      body: JSON.stringify(user),
    });
  },

  /**
   * PATCH /api/users/{id}/ - Modify account status (Activate/Deactivate) or role
   */
  async updateUser(id: string | number, updates: Partial<User>): Promise<User> {
    return fetchApi<User>(`/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * DELETE /api/users/{id}/ - Remove personnel record from database
   */
  async deleteUser(id: string | number): Promise<void> {
    return fetchApi<void>(`/users/${id}/`, {
      method: 'DELETE',
    });
  },

  /**
   * GET /api/system/health/ - Real-time status of Django DB and MongoDB Atlas
   */
  async getSystemHealth(): Promise<SystemHealth> {
    return fetchApi<SystemHealth>('/system/health/');
  },

  /**
   * GET /api/system/settings/ - Current platform risk thresholds
   */
  async getSettings(): Promise<AdminSettings> {
    return fetchApi<AdminSettings>('/system/settings/');
  },

  /**
   * POST /api/system/settings/ - Save threshold & alert automation policies
   */
  async saveSettings(settings: Partial<AdminSettings>): Promise<{ message: string; settings: AdminSettings }> {
    return fetchApi<{ message: string; settings: AdminSettings }>('/system/settings/', {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  },

  /**
   * Dynamic aggregation of projects from MongoDB Atlas into departmental metrics
   */
  async getDepartmentMetrics(): Promise<DepartmentMetric[]> {
    const [projectsRes, usersRes] = await Promise.allSettled([
      fetchApi<{ results?: any[] } | any[]>('/projects/?scope=all'),
      fetchApi<{ results?: User[] } | User[]>('/users/'),
    ]);

    const projects: any[] = projectsRes.status === 'fulfilled'
      ? (Array.isArray(projectsRes.value) ? projectsRes.value : projectsRes.value.results || [])
      : [];

    const users: User[] = usersRes.status === 'fulfilled'
      ? (Array.isArray(usersRes.value) ? usersRes.value : usersRes.value.results || [])
      : [];

    const map = new Map<string, { projects: number; budgetCr: number; officers: number }>();

    projects.forEach((p) => {
      const dept = (p.sector || p.department || 'Infrastructure & Transport').trim();
      const cost = parseFloat(p.original_cost_cr || p.original_cost || 0) || 0;
      const current = map.get(dept) || { projects: 0, budgetCr: 0, officers: 0 };
      current.projects += 1;
      current.budgetCr += cost;
      map.set(dept, current);
    });

    users.forEach((u) => {
      const uDept = (u.department || '').trim();
      if (!uDept) return;
      for (const [dept, info] of map.entries()) {
        if (dept.toLowerCase().includes(uDept.toLowerCase()) || uDept.toLowerCase().includes(dept.toLowerCase())) {
          info.officers += 1;
          break;
        }
      }
    });

    const metrics: DepartmentMetric[] = [];
    map.forEach((data, name) => {
      metrics.push({
        name,
        projects: data.projects,
        rawBudgetCr: data.budgetCr,
        budget: data.budgetCr >= 1000
          ? `₹${(data.budgetCr / 1000).toFixed(1)}k Cr`
          : `₹${Math.round(data.budgetCr).toLocaleString('en-IN')} Cr`,
        officers: data.officers > 0 ? data.officers : Math.max(1, Math.round(data.projects / 3)),
      });
    });

    metrics.sort((a, b) => b.projects - a.projects);
    return metrics;
  },
};

