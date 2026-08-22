export class APIError extends Error {
  constructor(public code: string, public serverMessage: string, public status: number) {
    super(`API request failed: ${code}`);
    this.name = "APIError";
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/v1";

export function resolveAPIURL(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith("/api/")) return path;
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!(init?.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { error?: { code?: string; message?: string } } | null;
    throw new APIError(
      payload?.error?.code ?? "request_failed",
      payload?.error?.message ?? "API request failed",
      response.status,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
