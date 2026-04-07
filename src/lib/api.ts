import type {
  AdminHealthResponse,
  AuthUserView,
  CreateUserBody,
  LoginResponse,
} from "./types";

function getBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (raw) return raw.replace(/\/$/, "");
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:4000/api";
  }
  return "";
}

export function getApiBaseUrl(): string {
  const base = getBaseUrl();
  if (!base) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Add it to .env.local (see .env.example)."
    );
  }
  return base;
}

export async function parseApiErrorMessage(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json();
    if (
      data &&
      typeof data === "object" &&
      "message" in data &&
      data.message !== undefined
    ) {
      const msg = (data as { message: unknown }).message;
      if (typeof msg === "string") return msg;
      if (Array.isArray(msg) && msg.every((m) => typeof m === "string")) {
        return msg.join(", ");
      }
    }
  } catch {
    /* ignore */
  }
  return res.statusText || "Request failed";
}

async function apiFetch(
  path: string,
  init: RequestInit & { token?: string | null } = {}
): Promise<Response> {
  const base = getApiBaseUrl();
  const { token, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);
  const body = rest.body;
  if (
    body &&
    typeof body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  return fetch(url, { ...rest, headers });
}

export async function loginRequest(
  email: string,
  password: string
): Promise<LoginResponse> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return res.json() as Promise<LoginResponse>;
}

export async function logoutRequest(): Promise<void> {
  const res = await apiFetch("/auth/logout", { method: "POST" });
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseApiErrorMessage(res));
  }
}

export async function meRequest(token: string): Promise<AuthUserView> {
  const res = await apiFetch("/auth/me", { method: "GET", token });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return res.json() as Promise<AuthUserView>;
}

export async function adminHealthRequest(
  token: string
): Promise<AdminHealthResponse> {
  const res = await apiFetch("/auth/admin/health", { method: "GET", token });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return res.json() as Promise<AdminHealthResponse>;
}

export async function createUserRequest(
  token: string,
  body: CreateUserBody
): Promise<AuthUserView> {
  const res = await apiFetch("/users", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return res.json() as Promise<AuthUserView>;
}
