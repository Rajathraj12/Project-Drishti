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
    return fetchApi<RiskAssessment>(`/projects/${id}/analyze`, { method: 'POST' });
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
  }
};
