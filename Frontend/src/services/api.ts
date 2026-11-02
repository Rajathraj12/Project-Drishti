/**
 * API Service Setup for Django REST Framework
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token');
  const bypassEnabled = import.meta.env.VITE_DEV_AUTH_BYPASS === 'true';
  const devRole = bypassEnabled ? localStorage.getItem('dev_role') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (bypassEnabled && devRole) {
    headers['X-Dev-Role'] = devRole;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errData = await response.json();
      if (errData) {
        if (typeof errData === 'string') {
          errorMessage = errData;
        } else if (errData.detail) {
          errorMessage = errData.detail;
        } else if (errData.error) {
          errorMessage = errData.error;
        } else if (errData.message) {
          errorMessage = errData.message;
        } else if (typeof errData === 'object') {
          // Format serializer field errors e.g. { username: ["A user with that username already exists."] }
          const fieldMsgs = Object.entries(errData)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          if (fieldMsgs) {
            errorMessage = fieldMsgs;
          }
        }
      }
    } catch {
      // Non-JSON response
    }
    const error = new Error(errorMessage) as Error & { status?: number; data?: any };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
