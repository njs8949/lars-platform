export interface User {
  email: string;
  username: string;
  created_at?: string;
}

export interface AuthToken {
  token: string;
  user: User;
}

const API_BASE = "http://localhost:8000/api/auth";

export async function signup(email: string, username: string, password: string): Promise<AuthToken> {
  const response = await fetch(`${API_BASE}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, username, password }),
  });

  if (!response.ok) {
    const error = await response.json();

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

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const response = await fetch(`${API_BASE}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();

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

    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
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

export function clearToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("auth_token");
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
