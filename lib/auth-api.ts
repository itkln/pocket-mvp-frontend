import { APIError, apiRequest } from "./api-client";

export { APIError as AuthAPIError };

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: "customer" | "venue_owner";
  capabilities: Array<"customer" | "owner" | "staff">;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  password: string;
};

export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return response.user;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return response.user;
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/me", { method: "GET" });
  return response.user;
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}
