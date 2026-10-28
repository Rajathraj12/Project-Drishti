/**
 * Auth Service for Django REST Framework token auth & MongoDB seed credentials
 */
import { fetchApi } from './api';
import { User } from '../types';

export interface LoginResponse {
  token: string;
  user: User;
}

export interface DemoUser {
  username: string;
  email: string;
  password_plain: string;
  role: string;
  first_name: string;
  last_name: string;
  full_name?: string;
  department: string;
  state: string;
  district?: string;
  assigned_projects?: string[];
  description?: string;
  icon?: string;
  badge_color?: string;
}

export interface DemoUsersResponse {
  count: number;
  users: DemoUser[];
}

export const authService = {
  /**
   * POST /api/auth/login/
   */
  async login(credentials: { username?: string; email?: string; password: string }): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/auth/login/', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  },

  /**
   * POST /api/auth/logout/
   */
  async logout(): Promise<void> {
    return fetchApi<void>('/auth/logout/', { method: 'POST' });
  },
  
  /**
   * GET /api/auth/me/
   */
  async getCurrentUser(): Promise<User> {
    return fetchApi<User>('/auth/me/');
  },

  /**
   * GET /api/auth/demo-users/
   * Fetches the seeded credentials for all user types directly from MongoDB
   */
  async getDemoUsers(): Promise<DemoUsersResponse> {
    return fetchApi<DemoUsersResponse>('/auth/demo-users/');
  }
};
