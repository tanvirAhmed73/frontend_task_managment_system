import type { AuthUserRole, TaskCommentView } from "./types";

function readStr(
  obj: Record<string, unknown>,
  camel: string,
  snake: string
): string | undefined {
  const v = obj[camel] ?? obj[snake];
  return typeof v === "string" ? v : undefined;
}

function parseCommentAuthor(raw: unknown): TaskCommentView["author"] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = readStr(o, "id", "id");
  const email = readStr(o, "email", "email");
  const name =
    o.name === null || typeof o.name === "string" ? o.name : null;
  const role = o.role;
  if (role !== "ADMIN" && role !== "USER") return null;
  if (!id || !email) return null;
  return { id, email, name, role: role as AuthUserRole };
}

export function parseTaskComment(raw: unknown): TaskCommentView {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid comment payload");
  }
  const o = raw as Record<string, unknown>;
  const id = readStr(o, "id", "id");
  const body = readStr(o, "body", "body") ?? "";
  const created_at =
    readStr(o, "createdAt", "created_at") ??
    readStr(o, "created_at", "created_at") ??
    "";
  const updated_at =
    readStr(o, "updatedAt", "updated_at") ??
    readStr(o, "updated_at", "updated_at") ??
    created_at;
  const author = parseCommentAuthor(o.author ?? o["author"]);
  if (!id || !author) {
    throw new Error("Invalid comment: missing id or author");
  }
  return {
    id,
    body,
    created_at,
    updated_at,
    author,
  };
}

export function parseTaskCommentList(raw: unknown): TaskCommentView[] {
  const arr = Array.isArray(raw)
    ? raw
    : raw &&
        typeof raw === "object" &&
        Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : null;
  if (!arr) {
    throw new Error("Unexpected comments list");
  }
  return arr.map((item) => parseTaskComment(item));
}

export function commentAuthorLabel(author: TaskCommentView["author"]): string {
  const n = author.name?.trim();
  return n ? n : author.email;
}
