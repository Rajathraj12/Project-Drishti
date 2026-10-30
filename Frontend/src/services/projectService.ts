/**
 * Project Service (Preparation for Django REST Framework integration)
 */
import { fetchApi } from './api';
import { Project, RiskAssessment } from '../types';

// In-memory client-side cache for project listings
let _projectsCache: {
  key: string;
  token: string | null;
  data: { count: number; results: Project[] };
  timestamp: number;
} | null = null;
const CACHE_TTL_MS = 60000; // 60 seconds

export const projectService = {
  /**
   * GET /api/projects
   */
  async getProjects(params?: Record<string, string | number>, force = false): Promise<{count: number, results: Project[]}> {
    let query = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) query = `?${queryString}`;
    }

    const token = localStorage.getItem('token') || localStorage.getItem('dev_role') || 'public';
    const now = Date.now();
    if (!force && _projectsCache && _projectsCache.key === query && _projectsCache.token === token && (now - _projectsCache.timestamp < CACHE_TTL_MS)) {
      return _projectsCache.data;
    }

    const data = await fetchApi<{count: number, results: Project[]}>(`/projects/${query}`);
    _projectsCache = {
      key: query,
      token,
      data,
      timestamp: now,
    };
    return data;
  },

  clearCache() {
    _projectsCache = null;
  },

  /**
   * GET /api/projects/{id}
   */
  async getProjectDetails(id: string): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}/`);
  },

  /**
   * POST /api/projects/ - Create project in MongoDB Atlas
   */
  async createProject(projectData: Partial<Project>): Promise<Project> {
    projectService.clearCache();
    return fetchApi<Project>('/projects/', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },

  /**
   * PATCH /api/projects/{id} - Update project in MongoDB Atlas
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    projectService.clearCache();
    return fetchApi<Project>(`/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * DELETE /api/projects/{id} - Delete project from MongoDB Atlas
   */
  async deleteProject(id: string): Promise<{ message: string; project_id?: string }> {
    projectService.clearCache();
    return fetchApi<{ message: string; project_id?: string }>(`/projects/${id}/`, {
      method: 'DELETE',
    });
  },

  /**
   * GET /api/projects/{id}/risk
   */
  async getProjectRisk(id: string): Promise<RiskAssessment> {
    return fetchApi<RiskAssessment>(`/projects/${id}/risk/`, { method: 'GET' });
  },

  /**
   * GET /api/projects/{id}/why-flagged
   */
  async getWhyFlagged(id: string): Promise<any> {
    return fetchApi<any>(`/projects/${id}/why-flagged/`);
  },

  /**
   * POST /api/projects/{id}/analyze - Run Rule-based engine
   */
  async analyzeProject(id: string): Promise<RiskAssessment> {
    projectService.clearCache();
    return fetchApi<RiskAssessment>(`/projects/${id}/analyze/`, { method: 'POST' });
  },

  /**
   * POST /api/projects/bulk-analyze/ - Run Rule & ML engine for all projects
   */
  async bulkAnalyzeProjects(): Promise<{ total_projects: number; successful: number; failed: number }> {
    projectService.clearCache();
    return fetchApi<{ total_projects: number; successful: number; failed: number }>('/projects/bulk-analyze/', { method: 'POST' });
  },

  /**
   * POST /api/projects/{id}/ml-analyze - Run ML anomaly detection
   */
  async runMlAnalysis(id: string): Promise<any> {
    projectService.clearCache();
    return fetchApi<any>(`/projects/${id}/ml-analyze/`, { method: 'POST' });
  },

  /**
   * GET /api/projects/{id}/contractors
   */
  async getProjectContractors(id: string): Promise<any[]> {
    return fetchApi<any[]>(`/projects/${id}/contractors/`);
  },

  /**
   * GET /api/projects/{id}/evidence
   */
  async getProjectEvidence(id: string): Promise<any[]> {
    return fetchApi<any[]>(`/projects/${id}/evidence/`);
  },

  /**
   * GET /api/projects/{id}/timeline
   */
  async getProjectTimeline(id: string): Promise<any[]> {
    return fetchApi<any[]>(`/projects/${id}/timeline/`);
  },

  /**
   * GET /api/projects/{id}/checklist
   */
  async getProjectChecklist(id: string): Promise<Record<string, boolean>> {
    return fetchApi<Record<string, boolean>>(`/projects/${id}/checklist/`);
  },

  /**
   * POST /api/projects/{id}/checklist
   */
  async updateProjectChecklist(id: string, checked_items: Record<string, boolean>): Promise<{ status: string; project_id: string; checked_count: number }> {
    projectService.clearCache();
    return fetchApi<{ status: string; project_id: string; checked_count: number }>(`/projects/${id}/checklist/`, {
      method: 'POST',
      body: JSON.stringify({ checked_items }),
    });
  },
};
