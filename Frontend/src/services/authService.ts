/**
 * Auth Service (Preparation for Django REST Framework token auth)
 */
import { fetchApi } from './api';
import { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export const authService = {
  /**
   * Future implementation: POST /api/auth/login
   */
  async login(credentials: any): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  /**
   * Future implementation: POST /api/auth/logout
   */
  async logout(): Promise<void> {
    return fetchApi<void>('/auth/logout/', { method: 'POST' });
  },
  
  /**
   * Future implementation: GET /api/auth/me
   */
  async getCurrentUser(): Promise<User> {
    return fetchApi<User>('/auth/me/');
  }
};
