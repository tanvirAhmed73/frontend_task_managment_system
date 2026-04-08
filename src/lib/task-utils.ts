import type { TaskStatus, TaskUserSummary, TaskView } from "./types";

export const TASK_STATUSES: TaskStatus[] = [
  "PENDING",
  "PROCESSING",
  "DONE",
];

export function statusLabel(status: TaskStatus): string {
  switch (status) {
    case "PENDING":
      return "Todo";
    case "PROCESSING":
      return "In Progress";
    case "DONE":
      return "Done";
    default:
      return status;
  }
}

export function statusBadgeClass(status: TaskStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-900";
    case "PROCESSING":
      return "bg-sky-100 text-sky-900";
    case "DONE":
      return "bg-emerald-100 text-emerald-900";
    default:
      return "bg-slate-100 text-slate-800";
  }
}

function readStr(
  obj: Record<string, unknown>,
  camel: string,
  snake: string
): string | undefined {
  const v = obj[camel] ?? obj[snake];
  return typeof v === "string" ? v : undefined;
}

function readStrNull(
  obj: Record<string, unknown>,
  camel: string,
  snake: string
): string | null | undefined {
  const v = obj[camel] ?? obj[snake];
  if (v === null) return null;
  if (typeof v === "string") return v;
  return undefined;
}

function parseUserSummary(raw: unknown): TaskUserSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = readStr(o, "id", "id");
  const email = readStr(o, "email", "email");
  if (!id || !email) return null;
  const nameVal = o.name;
  const name =
    nameVal === null || typeof nameVal === "string" ? nameVal : null;
  return { id, email, name };
}

/** Normalize task JSON: API uses created_by, created_at, updated_at; accepts legacy aliases. */
export function parseTaskView(raw: unknown): TaskView {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid task payload");
  }
  const o = raw as Record<string, unknown>;
  const id = readStr(o, "id", "id");
  const title = readStr(o, "title", "title") ?? "";
  const description = readStr(o, "description", "description") ?? "";
  const statusRaw = readStr(o, "status", "status");
  if (
    statusRaw !== "PENDING" &&
    statusRaw !== "PROCESSING" &&
    statusRaw !== "DONE"
  ) {
    throw new Error("Invalid task status");
  }

  let assignee = parseUserSummary(o.assignee ?? o["assignee"]);
  const assigneeIdOnly = readStrNull(o, "assigneeId", "assignee_id");
  if (!assignee && assigneeIdOnly) {
    assignee = { id: assigneeIdOnly, email: "", name: null };
  }

  const createdByRaw =
    o.created_by ?? o.createdBy ?? o.creator ?? o["created_by"];
  const created_by = parseUserSummary(createdByRaw);
  if (!created_by) {
    throw new Error("Invalid task: missing created_by");
  }

  const created_at = readStr(o, "createdAt", "created_at") ?? "";
  const updated_at = readStr(o, "updatedAt", "updated_at") ?? "";

  if (!id) {
    throw new Error("Invalid task: missing id");
  }

  return {
    id,
    title,
    description,
    status: statusRaw,
    assignee,
    created_by,
    created_at,
    updated_at,
  };
}

/** Assignee id for forms (API exposes assignee object, not top-level assignee_id). */
export function taskAssigneeId(task: TaskView): string | null {
  return task.assignee?.id ?? null;
}

export function parseTaskList(raw: unknown): TaskView[] {
  if (Array.isArray(raw)) {
    return raw.map((item) => parseTaskView(item));
  }
  if (raw && typeof raw === "object") {
    const data = (raw as Record<string, unknown>).data;
    if (Array.isArray(data)) {
      return data.map((item) => parseTaskView(item));
    }
  }
  throw new Error("Unexpected task list response");
}

export function displayUser(u: TaskUserSummary | null): string {
  if (!u) return "—";
  if (u.name?.trim()) return u.name.trim();
  const local = u.email.split("@")[0] ?? u.email;
  return local || u.email;
}

/** Label for assignee dropdowns: name if set, else email (matches GET /users picker spec). */
export function assigneePickerLabel(u: {
  name: string | null;
  email: string;
}): string {
  const n = u.name?.trim();
  return n ? n : u.email;
}
