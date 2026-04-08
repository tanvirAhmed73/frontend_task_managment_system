import { parseTaskComment, parseTaskCommentList } from "./comment-utils";
import { parseTaskList, parseTaskView } from "./task-utils";
import type {
  AuditLogActor,
  AuditLogListQuery,
  AuditLogListResponse,
  AuditLogView,
  AdminHealthResponse,
  AuthUserRole,
  AuthUserView,
  CreateTaskBody,
  CreateTaskCommentBody,
  CreateUserBody,
  ListedUserView,
  ListTasksQuery,
  ChangePasswordBody,
  LoginResponse,
  NotificationsListQuery,
  NotificationsListResponse,
  NotificationItemView,
  TaskCommentView,
  TaskView,
  UpdateTaskBody,
} from "./types";

/** Thrown when GET /tasks/:id/comments returns 403. */
export class ForbiddenCommentsError extends Error {
  readonly code = "FORBIDDEN_COMMENTS" as const;
  constructor() {
    super("FORBIDDEN_COMMENTS");
    this.name = "ForbiddenCommentsError";
  }
}

export function isForbiddenCommentsError(e: unknown): e is ForbiddenCommentsError {
  return e instanceof ForbiddenCommentsError;
}

function parseAuditActor(raw: unknown): AuditLogActor {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid audit actor");
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const email = typeof o.email === "string" ? o.email : "";
  const name = o.name === null || typeof o.name === "string" ? o.name : null;
  const role = o.role;
  if (!id || !email || (role !== "ADMIN" && role !== "USER")) {
    throw new Error("Invalid audit actor");
  }
  return { id, email, name, role: role as AuthUserRole };
}

function parseAuditLogView(raw: unknown): AuditLogView {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid audit log row");
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const createdAt =
    typeof o.created_at === "string"
      ? o.created_at
      : typeof o.createdAt === "string"
        ? o.createdAt
        : "";
  const action = typeof o.action === "string" ? o.action : "";
  const entityType =
    typeof o.entity_type === "string"
      ? o.entity_type
      : typeof o.entityType === "string"
        ? o.entityType
        : "";
  const entityId =
    typeof o.entity_id === "string"
      ? o.entity_id
      : typeof o.entityId === "string"
        ? o.entityId
        : "";
  const taskIdRaw = o.task_id ?? o.taskId;
  const taskId =
    taskIdRaw === null || typeof taskIdRaw === "string" ? taskIdRaw : null;
  const actor = parseAuditActor(o.actor);
  const payload =
    o.payload && typeof o.payload === "object"
      ? (o.payload as Record<string, unknown>)
      : {};

  if (!id || !createdAt || !action || !entityType || !entityId) {
    throw new Error("Invalid audit log row");
  }

  return {
    id,
    created_at: createdAt,
    action,
    entity_type: entityType,
    entity_id: entityId,
    task_id: taskId,
    actor,
    payload,
  };
}

function parseAuditLogListResponse(raw: unknown): AuditLogListResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Unexpected audit logs response");
  }
  const o = raw as Record<string, unknown>;
  const itemsRaw = o.items;
  const total = typeof o.total === "number" ? o.total : 0;
  const page = typeof o.page === "number" ? o.page : 1;
  const limit = typeof o.limit === "number" ? o.limit : 50;
  if (!Array.isArray(itemsRaw)) {
    throw new Error("Unexpected audit logs response");
  }
  return {
    items: itemsRaw.map((x) => parseAuditLogView(x)),
    total,
    page,
    limit,
  };
}

function parseNotificationType(raw: unknown): NotificationItemView["type"] {
  if (
    raw === "TASK_ASSIGNED" ||
    raw === "TASK_COMPLETED" ||
    raw === "TASK_COMMENT_ADDED"
  ) {
    return raw;
  }
  if (typeof raw === "string" && raw.length > 0) {
    return raw;
  }
  return "TASK_ASSIGNED";
}

function parseNotificationItem(raw: unknown): NotificationItemView | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const created_at =
    typeof o.created_at === "string"
      ? o.created_at
      : typeof o.createdAt === "string"
        ? o.createdAt
        : "";
  const readRaw = o.read_at ?? o.readAt;
  const read_at =
    readRaw === null || typeof readRaw === "string" ? readRaw : null;
  const type = parseNotificationType(o.type);
  const title = typeof o.title === "string" ? o.title : "";
  const message = typeof o.message === "string" ? o.message : "";
  const data =
    o.data && typeof o.data === "object" ? (o.data as Record<string, unknown>) : {};
  if (!id || !created_at) {
    return null;
  }
  return {
    id,
    created_at,
    read_at,
    type,
    title: title || "Notification",
    message: message || title || "—",
    data,
  };
}

function parseNotificationsList(raw: unknown): NotificationsListResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("Unexpected notifications response");
  }
  const root = raw as Record<string, unknown>;
  const o =
    root.items !== undefined
      ? root
      : root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : root;
  const itemsRaw = o.items;
  if (!Array.isArray(itemsRaw)) {
    throw new Error("Unexpected notifications response");
  }
  const items: NotificationItemView[] = [];
  for (const x of itemsRaw) {
    const row = parseNotificationItem(x);
    if (row) items.push(row);
  }
  return {
    items,
    total: typeof o.total === "number" ? o.total : items.length,
    page: typeof o.page === "number" ? o.page : 1,
    limit: typeof o.limit === "number" ? o.limit : 20,
  };
}

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

export async function changePasswordRequest(
  token: string,
  body: ChangePasswordBody
): Promise<void> {
  const res = await apiFetch("/auth/password", {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  /* 204 No Content */
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

function parseListedUser(raw: unknown): ListedUserView {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid user in list");
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const email = typeof o.email === "string" ? o.email : "";
  const name =
    o.name === null || typeof o.name === "string" ? o.name : null;
  const role = o.role;
  if (role !== "ADMIN" && role !== "USER") {
    throw new Error("Invalid user role in list");
  }
  if (!id || !email) {
    throw new Error("Invalid user in list");
  }
  return { id, email, name, role: role as AuthUserRole };
}

function parseListedUsersJson(raw: unknown): ListedUserView[] {
  const arr = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : null;
  if (!arr) {
    throw new Error("Unexpected users list response");
  }
  return arr.map((item) => parseListedUser(item));
}

/** GET /api/users — admin only; active users, server-ordered. */
export async function listUsersRequest(
  token: string
): Promise<ListedUserView[]> {
  const res = await apiFetch("/users", { method: "GET", token });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  const json: unknown = await res.json();
  return parseListedUsersJson(json);
}

export async function listTasksRequest(
  token: string,
  query?: ListTasksQuery
): Promise<TaskView[]> {
  const params = new URLSearchParams();
  if (query?.status) params.set("status", query.status);
  if (query?.assignee_id) params.set("assignee_id", query.assignee_id);
  const qs = params.toString();
  const path = qs ? `/tasks?${qs}` : "/tasks";
  const res = await apiFetch(path, { method: "GET", token });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  const json: unknown = await res.json();
  return parseTaskList(json);
}

export async function getTaskRequest(
  token: string,
  id: string
): Promise<TaskView> {
  const res = await apiFetch(`/tasks/${encodeURIComponent(id)}`, {
    method: "GET",
    token,
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return parseTaskView(await res.json());
}

export async function createTaskRequest(
  token: string,
  body: CreateTaskBody
): Promise<TaskView> {
  const res = await apiFetch("/tasks", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
  /* 201 Created + Task body */
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return parseTaskView(await res.json());
}

export async function updateTaskRequest(
  token: string,
  id: string,
  body: UpdateTaskBody
): Promise<TaskView> {
  const res = await apiFetch(`/tasks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return parseTaskView(await res.json());
}

export async function deleteTaskRequest(
  token: string,
  id: string
): Promise<void> {
  const res = await apiFetch(`/tasks/${encodeURIComponent(id)}`, {
    method: "DELETE",
    token,
  });
  /* 204 No Content — no JSON body */
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
}

export async function listTaskCommentsRequest(
  token: string,
  taskId: string
): Promise<TaskCommentView[]> {
  const res = await apiFetch(
    `/tasks/${encodeURIComponent(taskId)}/comments`,
    { method: "GET", token }
  );
  if (res.status === 403) {
    throw new ForbiddenCommentsError();
  }
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return parseTaskCommentList(await res.json());
}

export async function createTaskCommentRequest(
  token: string,
  taskId: string,
  body: CreateTaskCommentBody
): Promise<TaskCommentView> {
  const res = await apiFetch(
    `/tasks/${encodeURIComponent(taskId)}/comments`,
    {
      method: "POST",
      token,
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return parseTaskComment(await res.json());
}

export async function listAuditLogsRequest(
  token: string,
  query?: AuditLogListQuery
): Promise<AuditLogListResponse> {
  const params = new URLSearchParams();
  if (query?.page && Number.isFinite(query.page)) {
    params.set("page", String(Math.max(1, Math.floor(query.page))));
  }
  if (query?.limit && Number.isFinite(query.limit)) {
    const normalized = Math.max(1, Math.min(100, Math.floor(query.limit)));
    params.set("limit", String(normalized));
  }
  const qs = params.toString();
  const path = qs ? `/audit-logs?${qs}` : "/audit-logs";
  const res = await apiFetch(path, { method: "GET", token });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return parseAuditLogListResponse(await res.json());
}

export async function listNotificationsRequest(
  token: string,
  query?: NotificationsListQuery
): Promise<NotificationsListResponse> {
  const params = new URLSearchParams();
  if (query?.page && Number.isFinite(query.page)) {
    params.set("page", String(Math.max(1, Math.floor(query.page))));
  }
  if (query?.limit && Number.isFinite(query.limit)) {
    const normalized = Math.max(1, Math.min(100, Math.floor(query.limit)));
    params.set("limit", String(normalized));
  }
  if (typeof query?.unreadOnly === "boolean") {
    params.set("unreadOnly", String(query.unreadOnly));
  }
  const qs = params.toString();
  const path = qs ? `/notifications?${qs}` : "/notifications";
  const res = await apiFetch(path, { method: "GET", token });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  return parseNotificationsList(await res.json());
}

export async function markNotificationReadRequest(
  token: string,
  id: string
): Promise<void> {
  const res = await apiFetch(`/notifications/${encodeURIComponent(id)}/read`, {
    method: "PATCH",
    token,
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(await parseApiErrorMessage(res));
  }
}

export async function markAllNotificationsReadRequest(
  token: string
): Promise<{ updated: number }> {
  const res = await apiFetch("/notifications/read-all", {
    method: "PATCH",
    token,
  });
  if (!res.ok) {
    throw new Error(await parseApiErrorMessage(res));
  }
  const raw: unknown = await res.json();
  if (
    !raw ||
    typeof raw !== "object" ||
    typeof (raw as { updated?: unknown }).updated !== "number"
  ) {
    return { updated: 0 };
  }
  return { updated: (raw as { updated: number }).updated };
}
