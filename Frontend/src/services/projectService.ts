/**
 * Project Service (Preparation for Django REST Framework integration)
 */
import { fetchApi } from './api';
import { Project, RiskAssessment } from '../types';

export const projectService = {
  /**
   * Future implementation: GET /api/projects
   */
  async getProjects(params?: Record<string, string | number>): Promise<{count: number, results: Project[]}> {
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
    return fetchApi<{count: number, results: Project[]}>(`/projects/${query}`);
  },

  /**
   * Future implementation: GET /api/projects/{id}
   */
  async getProjectDetails(id: string): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}/`);
  },

  /**
   * Future implementation: PATCH /api/projects/{id}
   */
  async updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return fetchApi<Project>(`/projects/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
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
   * POST /api/projects/{id}/analyze
   */
  async triggerAnalysis(id: string): Promise<RiskAssessment> {
    return fetchApi<RiskAssessment>(`/projects/${id}/analyze/`, { method: 'POST' });
  },

  /**
   * POST /api/projects/bulk-analyze/
   */
  async bulkAnalyzeProjects(): Promise<{total_projects: number, successful: number, unavailable: number, failures: number}> {
    return fetchApi<any>(`/projects/bulk-analyze/`, { method: 'POST' });
  },

  async getProjectMlRisk(id: string): Promise<any> {
    return fetchApi<any>(`/projects/${id}/ml-risk/`, { method: 'GET' });
  },

  async triggerMlAnalysis(id: string): Promise<any> {
    return fetchApi<any>(`/projects/${id}/ml-analyze/`, { method: 'POST' });
  },

  async submitVerification(id: string, data: any): Promise<any> {
    return fetchApi<any>(`/projects/${id}/verify/`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getVerifications(id: string): Promise<any[]> {
    return fetchApi<any[]>(`/projects/${id}/verifications/`, { method: 'GET' });
  }
};
