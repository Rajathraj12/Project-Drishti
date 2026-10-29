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
  },

  /**
   * POST /api/auth/citizen/register/
   * Creates a citizen account in MongoDB and Django
   */
  async citizenRegister(data: {
    email: string;
    password: string;
    full_name: string;
    state?: string;
    district?: string;
    phone?: string;
  }): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/auth/citizen/register/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * POST /api/auth/citizen/login/
   * Authenticates a citizen account against MongoDB
   */
  async citizenLogin(credentials: {
    email?: string;
    username?: string;
    password: string;
  }): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/auth/citizen/login/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  /**
   * POST /api/auth/google/
   * Authenticates a citizen via Google OAuth ID token or profile
   */
  async googleLogin(data: {
    credential?: string;
    email?: string;
    name?: string;
    google_id?: string;
    sub?: string;
    photo_url?: string;
  }): Promise<LoginResponse> {
    return fetchApi<LoginResponse>('/auth/google/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
