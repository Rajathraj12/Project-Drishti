import { fetchApi } from './api';
import { CorrectiveAction, ActionAuditEvent } from '../types';

export const correctiveActionService = {
  /**
   * List corrective actions with optional query filters (project_id, status, priority, is_overdue, etc.)
   */
  async getActions(params?: Record<string, string | number | boolean>): Promise<{ count: number; results: CorrectiveAction[] }> {
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
    return fetchApi<{ count: number; results: CorrectiveAction[] }>(`/corrective-actions/${query}`);
  },

  /**
   * List corrective actions for a specific project
   */
  async getProjectActions(projectId: string): Promise<{ count: number; results: CorrectiveAction[] }> {
    return fetchApi<{ count: number; results: CorrectiveAction[] }>(`/projects/${projectId}/corrective-actions/`);
  },

  /**
   * Get single action detail by ID
   */
  async getAction(actionId: string): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/`);
  },

  /**
   * Create a new corrective action
   */
  async createAction(data: {
    project_id: string;
    title: string;
    description: string;
    reason: string;
    priority?: string;
    due_date: string;
    assigned_to?: string;
    assigned_agency?: string;
    risk_assessment_id?: string;
    ml_assessment_id?: string;
    verification_id?: string;
    observation?: string;
    evidence_ids?: string[];
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>('/corrective-actions/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update permitted fields on an open action
   */
  async updateAction(actionId: string, updates: Partial<CorrectiveAction>): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  /**
   * Assign or reassign action responsibility
   */
  async assignAction(actionId: string, data: {
    assigned_to?: string;
    assigned_agency?: string;
    due_date?: string;
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/assign/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Post a progress update with supporting evidence references
   */
  async recordProgress(actionId: string, data: {
    message: string;
    progress_pct?: number;
    supporting_evidence?: string[];
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/progress/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Submit resolution for authorized review
   */
  async submitResolution(actionId: string, data: {
    resolution_summary: string;
    supporting_evidence?: string[];
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/submit-resolution/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Review submitted resolution (approved: true moves to CLOSED, false returns to IN_PROGRESS)
   */
  async reviewResolution(actionId: string, data: {
    approved: boolean;
    review_notes?: string;
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/review-resolution/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Close action directly
   */
  async closeAction(actionId: string, data: {
    closure_notes?: string;
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/close/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Reopen a closed or resolved action
   */
  async reopenAction(actionId: string, data: {
    reopen_reason: string;
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/reopen/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Cancel an action
   */
  async cancelAction(actionId: string, data: {
    cancellation_reason: string;
  }): Promise<CorrectiveAction> {
    return fetchApi<CorrectiveAction>(`/corrective-actions/${actionId}/cancel/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Retrieve append-only audit trail
   */
  async getActionHistory(actionId: string): Promise<{ action_id: string; count: number; events: ActionAuditEvent[] }> {
    return fetchApi<{ action_id: string; count: number; events: ActionAuditEvent[] }>(`/corrective-actions/${actionId}/history/`);
  },
};
