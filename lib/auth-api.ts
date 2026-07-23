import { APIError, apiRequest, resolveAPIURL } from "./api-client";

export { APIError as AuthAPIError };

export type AuthUser = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
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
  return normalizeUser(response.user);
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return normalizeUser(response.user);
}

export async function getCurrentUser(): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/me", { method: "GET" });
  return normalizeUser(response.user);
}

export async function updateProfile(payload: Pick<AuthUser, "first_name" | "last_name"> & { phone?: string }): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeUser(response.user);
}

export async function logout(): Promise<void> {
  await apiRequest<void>("/auth/logout", { method: "POST" });
}

export async function requestPasswordReset(email: string, locale: string): Promise<void> {
  await apiRequest<{ status: string }>("/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email, locale }),
  });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await apiRequest<void>("/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiRequest<void>("/auth/password/change", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
}

export async function changeEmail(currentPassword: string, newEmail: string): Promise<AuthUser> {
  const response = await apiRequest<{ user: AuthUser }>("/auth/email/change", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_email: newEmail }),
  });
  return normalizeUser(response.user);
}

export async function updateAvatar(file: File): Promise<AuthUser> {
  const body = new FormData();
  body.append("avatar", file);
  const response = await apiRequest<{ user: AuthUser }>("/auth/me/avatar", {
    method: "POST",
    body,
  });
  return normalizeUser(response.user);
}

function normalizeUser(user: AuthUser): AuthUser {
  return user.avatar_url ? { ...user, avatar_url: resolveAPIURL(user.avatar_url) } : user;
}
