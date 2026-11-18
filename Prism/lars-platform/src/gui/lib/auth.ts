export interface User {
  email: string;
  username: string;
  created_at?: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

function getApiBase(): string {
  // Tauri 데스크톱 앱에서는 명시적으로 localhost:8001 사용
  if (typeof window !== 'undefined') {
    // 환경 변수 우선 사용
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl) {
      return `${envUrl}/auth`;
    }

    // Tauri 앱인 경우 (윈도우 객체에서 __TAURI__ 확인)
    if ((window as any).__TAURI__) {
      return 'http://localhost:8001/api/auth';
    }
  }

  // 기본값: 상대 경로
  return '/api/auth';
}

const API_BASE = getApiBase();

export async function signup(email: string, username: string, password: string): Promise<AuthToken> {
  const url = `${API_BASE}/signup`;
  console.log('[AUTH] Signing up:', { email, username, url });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, username, password }),
    });

    console.log('[AUTH] Signup response status:', response.status);

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = { detail: response.statusText };
      }

      // Handle different error response formats
      let errorMessage = "Signup failed";
      if (typeof error.detail === "string") {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        // Handle array of errors
        errorMessage = error.detail
          .map((e: any) => typeof e === "string" ? e : e.msg || JSON.stringify(e))
          .join(", ");
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      console.error('[AUTH] Signup error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[AUTH] Signup successful:', { email, user: data.user });
    return data;
  } catch (err: any) {
    console.error('[AUTH] Signup exception:', err);
    throw err;
  }
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const url = `${API_BASE}/login`;
  console.log('[AUTH] Logging in:', { email, url });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    console.log('[AUTH] Login response status:', response.status);

    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch {
        error = { detail: response.statusText };
      }

      // Handle different error response formats
      let errorMessage = "Login failed";
      if (typeof error.detail === "string") {
        errorMessage = error.detail;
      } else if (Array.isArray(error.detail)) {
        // Handle array of errors
        errorMessage = error.detail
          .map((e: any) => typeof e === "string" ? e : e.msg || JSON.stringify(e))
          .join(", ");
      } else if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      console.error('[AUTH] Login error:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log('[AUTH] Login successful:', { email, user: data.user });
    return data;
  } catch (err: any) {
    console.error('[AUTH] Login exception:', err);
    throw err;
  }
}

export async function logout(token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Logout failed");
  }
}

export async function getCurrentUser(token: string): Promise<User> {
  const response = await fetch(`${API_BASE}/me`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info");
  }

  const data = await response.json();
  return data.user;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_token", token);
}

export function setUser(user: User): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth_user", JSON.stringify(user));
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const user = localStorage.getItem("auth_user");
    return user ? JSON.parse(user) : null;
  } catch {
    return null;
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ status: string; message: string }> {
  const token = getToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

  const response = await fetch(`${API_BASE}/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });

  if (!response.ok) {
    const error = await response.json();

    // Handle different error response formats
    let errorMessage = "Failed to change password";
    if (typeof error.detail === "string") {
      errorMessage = error.detail;
    } else if (Array.isArray(error.detail)) {
      errorMessage = error.detail
        .map((e: any) => typeof e === "string" ? e : e.msg || JSON.stringify(e))
        .join(", ");
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}
