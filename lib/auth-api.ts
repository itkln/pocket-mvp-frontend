export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: "customer" | "venue_owner";
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
  role: "customer" | "owner";
};

export class AuthAPIError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
    this.name = "AuthAPIError";
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
    throw new AuthAPIError(
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ?? "Не удалось связаться с сервером",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await request<{ user: AuthUser }>("/auth/me", { method: "GET" });
  return response.user;
}

export async function logout(): Promise<void> {
  await request<void>("/auth/logout", { method: "POST" });
}

