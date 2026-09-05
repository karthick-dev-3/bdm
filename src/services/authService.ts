/**
 * Authentication Service for BDM Copilot Admin Dashboard
 * Communicates with SQLite backend auth endpoints (/api/auth/*)
 */

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  name: string;
  role: string;
  createdAt: string;
  lastLoginAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  expiresAt?: number;
  user?: AuthUser;
  error?: string;
}

const TOKEN_STORAGE_KEY = 'bdm_admin_auth_token_v1';
const USER_STORAGE_KEY = 'bdm_admin_auth_user_v1';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: AuthUser): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } catch (e) {
    console.warn('Failed to store session locally', e);
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear stored session', e);
  }
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loginUser(identifier: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data: AuthResponse = await res.json();
    if (!res.ok) {
      return {
        success: false,
        error: data.error || 'Authentication failed. Please check credentials.'
      };
    }

    if (data.token && data.user) {
      setStoredSession(data.token, data.user);
    }
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error connecting to auth server.'
    };
  }
}

export async function verifyCurrentSession(): Promise<AuthUser | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.status === 401 || res.status === 403) {
      clearStoredSession();
      return null;
    }

    if (!res.ok) {
      console.warn(`[Auth] Session check returned server status ${res.status}. Preserving cached session.`);
      return getStoredUser();
    }

    const data = await res.json();
    if (data.success && data.user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));
      return data.user;
    }
    return getStoredUser();
  } catch (err) {
    console.warn('[Auth] Error verifying session over network, preserving cached user', err);
    return getStoredUser();
  }
}

export async function logoutUser(): Promise<void> {
  const token = getStoredToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.warn('Logout notification error', e);
    }
  }
  clearStoredSession();
}

