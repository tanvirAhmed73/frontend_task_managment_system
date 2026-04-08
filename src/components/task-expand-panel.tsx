"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import {
  createTaskCommentRequest,
  getTaskRequest,
  isForbiddenCommentsError,
  listTaskCommentsRequest,
} from "@/lib/api";
import { commentAuthorLabel } from "@/lib/comment-utils";
import {
  displayUser,
  statusBadgeClass,
  statusLabel,
} from "@/lib/task-utils";
import type { TaskCommentView, TaskView } from "@/lib/types";

const COMMENT_MIN = 1;
const COMMENT_MAX = 10_000;

function formatWhen(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function mergeComments(
  prev: TaskCommentView[],
  incoming: TaskCommentView[]
): TaskCommentView[] {
  const byId = new Map<string, TaskCommentView>();
  for (const c of prev) byId.set(c.id, c);
  for (const c of incoming) byId.set(c.id, c);
  return Array.from(byId.values()).sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );
}

type TaskExpandPanelProps = {
  taskId: string;
  /** Row snapshot while detail loads (list row does not show description). */
  listTask?: TaskView | null;
  variant: "admin" | "user";
};

export function TaskExpandPanel({
  taskId,
  listTask,
  variant,
}: TaskExpandPanelProps) {
  const { token, user } = useAuth();
  const { taskCommentEpoch, consumeTaskCommentEvents } = useNotifications();
  const [detail, setDetail] = useState<TaskView | null>(listTask ?? null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [comments, setComments] = useState<TaskCommentView[]>([]);
  const [commentsForbidden, setCommentsForbidden] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [loadingComments, setLoadingComments] = useState(true);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !taskId) return;
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      setDetailError(null);
      try {
        const t = await getTaskRequest(token, taskId);
        if (!cancelled) setDetail(t);
      } catch (e) {
        if (!cancelled) {
          setDetailError(
            e instanceof Error ? e.message : "Failed to load task"
          );
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, taskId]);

  const loadComments = useCallback(async () => {
    if (!token || !taskId) return;
    setLoadingComments(true);
    setCommentsError(null);
    setCommentsForbidden(false);
    try {
      const list = await listTaskCommentsRequest(token, taskId);
      setComments(list);
    } catch (e) {
      if (isForbiddenCommentsError(e)) {
        setComments([]);
        setCommentsForbidden(true);
      } else {
        setComments([]);
        setCommentsError(
          e instanceof Error ? e.message : "Failed to load comments"
        );
      }
    } finally {
      setLoadingComments(false);
    }
  }, [token, taskId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  useEffect(() => {
    const batch = consumeTaskCommentEvents(taskId);
    if (batch.length === 0) return;
    setComments((prev) => mergeComments(prev, batch));
  }, [taskId, taskCommentEpoch, consumeTaskCommentEvents]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || commentsForbidden) return;
    const trimmed = body.trim();
    if (trimmed.length < COMMENT_MIN || trimmed.length > COMMENT_MAX) {
      setPostError(
        `Comment must be between ${COMMENT_MIN} and ${COMMENT_MAX} characters.`
      );
      return;
    }
    setPosting(true);
    setPostError(null);
    try {
      const created = await createTaskCommentRequest(token, taskId, {
        body: trimmed,
      });
      setComments((prev) => mergeComments(prev, [created]));
      setBody("");
    } catch (err) {
      setPostError(
        err instanceof Error ? err.message : "Failed to post comment"
      );
    } finally {
      setPosting(false);
    }
  }

  const task = detail;
  const title =
    task?.title ?? listTask?.title ?? (loadingDetail ? "Loading…" : "Task");

  return (
    <div className="space-y-4 border-t border-slate-100 bg-slate-50/80 px-4 py-4 sm:px-6">
      {loadingDetail && !task ? (
        <p className="text-sm text-slate-500">Loading task…</p>
      ) : null}
      {detailError ? (
        <p className="text-sm text-red-600" role="alert">
          {detailError}
        </p>
      ) : null}

      {task ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(task.status)}`}
            >
              {statusLabel(task.status)}
            </span>
          </div>
          <dl className="grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-slate-500">Assignee</dt>
              <dd className="mt-0.5">{displayUser(task.assignee)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Created by</dt>
              <dd className="mt-0.5">{displayUser(task.created_by)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Created</dt>
              <dd className="mt-0.5">{formatWhen(task.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Updated</dt>
              <dd className="mt-0.5">{formatWhen(task.updated_at)}</dd>
            </div>
          </dl>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Description
            </h4>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {task.description?.trim()
                ? task.description
                : "No description provided."}
            </p>
          </div>
        </>
      ) : null}

      <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
        <h4 className="text-sm font-semibold text-slate-900">Comments</h4>

        {commentsForbidden ? (
          <p className="mt-2 text-sm text-slate-600">
            You can&apos;t comment on this task.
          </p>
        ) : (
          <>
            {loadingComments ? (
              <p className="mt-2 text-sm text-slate-500">Loading comments…</p>
            ) : commentsError ? (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {commentsError}
              </p>
            ) : comments.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No comments yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {comments.map((c) => {
                  const adminReply =
                    variant === "user" && c.author.role === "ADMIN";
                  return (
                    <li
                      key={c.id}
                      className={
                        adminReply
                          ? "border-l-2 border-violet-400 pl-3"
                          : undefined
                      }
                    >
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-sm font-medium text-slate-900">
                          {commentAuthorLabel(c.author)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatWhen(c.created_at)}
                        </span>
                        {adminReply ? (
                          <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-900">
                            Admin
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
                        {c.body}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}

            {!loadingComments && !commentsError ? (
              <form
                onSubmit={(e) => void handleSubmitComment(e)}
                className="mt-4 space-y-2 border-t border-slate-100 pt-3"
              >
                <label className="block text-xs font-medium text-slate-600">
                  Add a comment
                  {user ? (
                    <span className="ml-1 font-normal text-slate-400">
                      as {user.email}
                    </span>
                  ) : null}
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  maxLength={COMMENT_MAX}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
                  placeholder="Write a comment…"
                  disabled={posting}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    {COMMENT_MIN}–{COMMENT_MAX} characters (trimmed on server)
                  </span>
                  <button
                    type="submit"
                    disabled={
                      posting || body.trim().length < COMMENT_MIN
                    }
                    className="rounded-md bg-[#1e4d8c] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#173d75] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {posting ? "Posting…" : "Post"}
                  </button>
                </div>
                {postError ? (
                  <p className="text-sm text-red-600" role="alert">
                    {postError}
                  </p>
                ) : null}
              </form>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
