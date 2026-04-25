// client/src/lib/api-client.ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

class ApiClient {
  private token: string | null = null;
  private refreshing: Promise<string | null> | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('zartsa_token', token);
      } else {
        localStorage.removeItem('zartsa_token');
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      return localStorage.getItem('zartsa_token');
    }
    return null;
  }

  private async refreshAuth(): Promise<string | null> {
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('zartsa_refresh_token') : null;
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error('Refresh failed');
      const { data } = await res.json();
      this.setToken(data.accessToken);
      localStorage.setItem('zartsa_refresh_token', data.refreshToken);
      return data.accessToken;
    } catch {
      this.setToken(null);
      localStorage.removeItem('zartsa_refresh_token');
      return null;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (res.status === 401 && token) {
      if (!this.refreshing) {
        this.refreshing = this.refreshAuth();
      }
      const newToken = await this.refreshing;
      this.refreshing = null;
      if (newToken) {
        headers['Authorization'] = `Bearer ${newToken}`;
        res = await fetch(`${API_BASE}${path}`, { ...options, headers });
      }
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(res.status, body.code || 'UNKNOWN', body.message || 'Request failed');
    }

    return res.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  }

  async upload<T>(path: string, formData: FormData): Promise<T> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(res.status, body.code || 'UNKNOWN', body.message || 'Request failed');
    }
    return res.json();
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    const options: RequestInit = { method: 'PATCH' };
    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }
    return this.request<T>(path, options);
  }

  async delete<T>(path: string, options?: RequestInit): Promise<T> {
    return this.request<T>(path, { method: 'DELETE', ...options });
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export const api = new ApiClient();