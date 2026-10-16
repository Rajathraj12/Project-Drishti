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
    const error = new Error(`API Error: ${response.status} ${response.statusText}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}
