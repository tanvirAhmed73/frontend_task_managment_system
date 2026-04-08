"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/contexts/auth-context";
import {
  listNotificationsRequest,
  markAllNotificationsReadRequest,
  markNotificationReadRequest,
} from "@/lib/api";
import { getSocketOrigin } from "@/lib/socket-origin";
import type {
  NotificationItemView,
  TaskAssignedNotificationPayload,
  TaskCommentNotificationPayload,
  TaskCompletedNotificationPayload,
  TaskCommentView,
} from "@/lib/types";

const MAX_STORED = 40;
const MAX_COMMENT_EVENTS = 80;
const TOAST_MS = 10_000;

export type NotificationKind = "assigned" | "completed" | "comment";

export type StoredNotification = {
  id: string;
  kind: NotificationKind;
  message: string;
  title?: string;
  taskTitle?: string;
  taskId?: string;
  receivedAt: number;
  seen: boolean;
  persisted?: boolean;
};

type ToastItem = {
  id: string;
  heading: string;
  message: string;
  taskTitle?: string;
};

function isTaskAssignedPayload(
  raw: unknown
): raw is TaskAssignedNotificationPayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.type !== "TASK_ASSIGNED") return false;
  if (typeof o.message !== "string") return false;
  const task = o.task;
  if (!task || typeof task !== "object") return false;
  const t = task as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.title !== "string") return false;
  const by = o.assignedBy;
  if (!by || typeof by !== "object") return false;
  const b = by as Record<string, unknown>;
  if (typeof b.id !== "string" || typeof b.email !== "string") return false;
  return true;
}

function isTaskCompletedPayload(
  raw: unknown
): raw is TaskCompletedNotificationPayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.type !== "TASK_COMPLETED") return false;
  if (typeof o.message !== "string") return false;
  const task = o.task;
  if (!task || typeof task !== "object") return false;
  const t = task as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.title !== "string") return false;
  const by = o.completedBy;
  if (!by || typeof by !== "object") return false;
  const b = by as Record<string, unknown>;
  if (typeof b.id !== "string" || typeof b.email !== "string") return false;
  return true;
}

function isTaskCommentNotificationPayload(
  raw: unknown
): raw is TaskCommentNotificationPayload {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.type !== "TASK_COMMENT_ADDED") return false;
  const task = o.task;
  if (!task || typeof task !== "object") return false;
  const t = task as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.title !== "string") return false;
  const c = o.comment;
  if (!c || typeof c !== "object") return false;
  const cc = c as Record<string, unknown>;
  if (typeof cc.id !== "string" || typeof cc.body !== "string") return false;
  if (typeof cc.created_at !== "string") return false;
  const a = cc.author;
  if (!a || typeof a !== "object") return false;
  const au = a as Record<string, unknown>;
  if (typeof au.id !== "string" || typeof au.email !== "string") return false;
  if (au.role !== "ADMIN" && au.role !== "USER") return false;
  const name = au.name;
  if (name !== null && typeof name !== "string") return false;
  return true;
}

function commentFromNotificationPayload(
  payload: TaskCommentNotificationPayload
): TaskCommentView {
  const c = payload.comment;
  return {
    id: c.id,
    body: c.body,
    created_at: c.created_at,
    updated_at: c.created_at,
    author: c.author,
  };
}

function kindFromNotificationType(type: NotificationItemView["type"]): NotificationKind {
  if (type === "TASK_COMPLETED") return "completed";
  if (type === "TASK_COMMENT_ADDED") return "comment";
  if (type === "TASK_ASSIGNED") return "assigned";
  if (typeof type === "string" && type.includes("COMMENT")) return "comment";
  if (typeof type === "string" && type.includes("COMPLET")) return "completed";
  return "assigned";
}

function dateToMs(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Date.now();
}

type NotificationsContextValue = {
  assignmentEpoch: number;
  /** Bumps when an assignee marks a task DONE (admin listeners only). */
  taskCompletedEpoch: number;
  /** Bumps on each `task:comment` event (dedupe in UI by `comment.id`). */
  taskCommentEpoch: number;
  /**
   * Removes and returns pending comment events for `taskId` (FIFO).
   * Call when `taskCommentEpoch` changes while a task detail panel is open.
   */
  consumeTaskCommentEvents: (taskId: string) => TaskCommentView[];
  socketConnected: boolean;
  notifications: StoredNotification[];
  unreadCount: number;
  markNotificationsSeen: () => void;
  clearNotifications: () => void;
  dismissNotification: (id: string) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null
);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { token, loading, user } = useAuth();
  const [assignmentEpoch, setAssignmentEpoch] = useState(0);
  const [taskCompletedEpoch, setTaskCompletedEpoch] = useState(0);
  const [taskCommentEpoch, setTaskCommentEpoch] = useState(0);
  const [socketConnected, setSocketConnected] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [stored, setStored] = useState<StoredNotification[]>([]);
  const commentEventsRef = useRef<{ taskId: string; comment: TaskCommentView }[]>(
    []
  );
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );

  const consumeTaskCommentEvents = useCallback((taskId: string) => {
    const q = commentEventsRef.current;
    const taken: TaskCommentView[] = [];
    const rest: { taskId: string; comment: TaskCommentView }[] = [];
    for (const e of q) {
      if (e.taskId === taskId) taken.push(e.comment);
      else rest.push(e);
    }
    commentEventsRef.current = rest;
    return taken;
  }, []);

  const clearToastTimers = useCallback(() => {
    dismissTimers.current.forEach((t) => clearTimeout(t));
    dismissTimers.current.clear();
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      const t = dismissTimers.current.get(id);
      if (t) clearTimeout(t);
      dismissTimers.current.delete(id);
      setToasts((prev) => prev.filter((x) => x.id !== id));
    },
    []
  );

  const pushToast = useCallback(
    (message: string, heading: string, taskTitle?: string) => {
      const id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, heading, message, taskTitle }]);
      const timer = setTimeout(() => removeToast(id), TOAST_MS);
      dismissTimers.current.set(id, timer);
    },
    [removeToast]
  );

  const recordIncoming = useCallback(
    (
      message: string,
      bumpEpoch: boolean,
      taskTitle?: string,
      taskId?: string
    ) => {
      const nid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      setStored((prev) =>
        [
          {
            id: nid,
            kind: "assigned" as const,
            message,
            title: "Task assignment",
            taskTitle,
            taskId,
            receivedAt: Date.now(),
            seen: false,
            persisted: false,
          },
          ...prev,
        ].slice(0, MAX_STORED)
      );
      pushToast(message, "Task assignment", taskTitle);
      if (bumpEpoch) setAssignmentEpoch((n) => n + 1);
    },
    [pushToast]
  );

  const recordTaskCompleted = useCallback(
    (message: string, taskTitle?: string, taskId?: string) => {
      const nid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      setStored((prev) =>
        [
          {
            id: nid,
            kind: "completed" as const,
            message,
            title: "Task completed",
            taskTitle,
            taskId,
            receivedAt: Date.now(),
            seen: false,
            persisted: false,
          },
          ...prev,
        ].slice(0, MAX_STORED)
      );
      pushToast(message, "Task completed", taskTitle);
      setTaskCompletedEpoch((n) => n + 1);
    },
    [pushToast]
  );

  const recordTaskComment = useCallback(
    (taskTitle: string, taskId: string, preview?: string) => {
      const nid =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      const message =
        preview && preview.trim()
          ? preview.trim().slice(0, 120) +
            (preview.trim().length > 120 ? "…" : "")
          : "New comment on this task.";
      setStored((prev) =>
        [
          {
            id: nid,
            kind: "comment" as const,
            message,
            title: "Task comment",
            taskTitle,
            taskId,
            receivedAt: Date.now(),
            seen: false,
            persisted: false,
          },
          ...prev,
        ].slice(0, MAX_STORED)
      );
      pushToast(
        `New comment on “${taskTitle}”.`,
        "Task comment",
        taskTitle
      );
      setTaskCommentEpoch((n) => n + 1);
    },
    [pushToast]
  );

  const markNotificationsSeen = useCallback(() => {
    setStored((prev) => prev.map((n) => ({ ...n, seen: true })));
    if (!token) return;
    void markAllNotificationsReadRequest(token).catch(() => {
      /* keep optimistic state */
    });
  }, [token]);

  const clearNotifications = useCallback(() => {
    setStored([]);
    if (!token) return;
    void markAllNotificationsReadRequest(token).catch(() => {
      /* keep local clear even if request fails */
    });
  }, [token]);

  const dismissNotification = useCallback((id: string) => {
    let shouldMarkRead = false;
    setStored((prev) =>
      prev.filter((n) => {
        if (n.id !== id) return true;
        shouldMarkRead = Boolean(n.persisted);
        return false;
      })
    );
    if (!token || !shouldMarkRead) return;
    void markNotificationReadRequest(token, id).catch(() => {
      /* keep local dismiss even if request fails */
    });
  }, [token]);

  const unreadCount = useMemo(
    () => stored.filter((n) => !n.seen).length,
    [stored]
  );

  useEffect(() => {
    const timersRef = dismissTimers;
    return () => {
      const m = timersRef.current;
      m.forEach((t) => clearTimeout(t));
      m.clear();
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      queueMicrotask(() => {
        setSocketConnected(false);
        setStored([]);
        setToasts([]);
        clearToastTimers();
        setAssignmentEpoch(0);
        setTaskCompletedEpoch(0);
        setTaskCommentEpoch(0);
        commentEventsRef.current = [];
      });
    }
  }, [loading, token, clearToastTimers]);

  useEffect(() => {
    if (loading || !token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await listNotificationsRequest(token, {
          page: 1,
          limit: MAX_STORED,
          unreadOnly: false,
        });
        if (cancelled) return;
        const persisted: StoredNotification[] = res.items.map((item) => {
          const data = item.data;
          const taskObj =
            data.task && typeof data.task === "object"
              ? (data.task as Record<string, unknown>)
              : null;
          const taskTitle =
            typeof data.taskTitle === "string"
              ? data.taskTitle
              : typeof data.task_title === "string"
                ? data.task_title
                : taskObj && typeof taskObj.title === "string"
                  ? taskObj.title
                  : undefined;
          const taskId =
            typeof data.taskId === "string"
              ? data.taskId
              : typeof data.task_id === "string"
                ? data.task_id
                : taskObj && typeof taskObj.id === "string"
                  ? taskObj.id
                  : undefined;
          return {
            id: item.id,
            kind: kindFromNotificationType(item.type),
            message: item.message,
            title: item.title,
            taskTitle,
            taskId,
            receivedAt: dateToMs(item.created_at),
            seen: item.read_at !== null,
            persisted: true,
          };
        });
        setStored((prev) => {
          const incomingIds = new Set(persisted.map((n) => n.id));
          const realtimeOnly = prev.filter((n) => !incomingIds.has(n.id));
          return [...realtimeOnly, ...persisted]
            .sort((a, b) => b.receivedAt - a.receivedAt)
            .slice(0, MAX_STORED);
        });
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[notifications] GET /notifications failed; list stays empty until this succeeds:",
            e instanceof Error ? e.message : e
          );
        }
        /* keep realtime notifications only on failure */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, token]);

  useEffect(() => {
    if (loading || !token) {
      queueMicrotask(() => setSocketConnected(false));
      return;
    }

    const origin = getSocketOrigin();
    if (!origin) {
      return;
    }

    const socket: Socket = io(`${origin}/notifications`, {
      auth: { token },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => setSocketConnected(true));
    socket.on("disconnect", () => setSocketConnected(false));

    socket.on("task:assigned", (payload: unknown) => {
      if (isTaskAssignedPayload(payload)) {
        recordIncoming(
          payload.message,
          true,
          payload.task.title,
          payload.task.id
        );
      } else {
        recordIncoming("You were assigned a new task.", true);
      }
    });

    if (user?.role === "ADMIN") {
      socket.on("task:completed", (payload: unknown) => {
        if (isTaskCompletedPayload(payload)) {
          recordTaskCompleted(
            payload.message,
            payload.task.title,
            payload.task.id
          );
        } else {
          recordTaskCompleted("A task was marked as done.");
        }
      });
    }

    socket.on("task:comment", (payload: unknown) => {
      if (!isTaskCommentNotificationPayload(payload)) return;
      const view = commentFromNotificationPayload(payload);
      commentEventsRef.current = [
        ...commentEventsRef.current,
        { taskId: payload.task.id, comment: view },
      ].slice(-MAX_COMMENT_EVENTS);
      recordTaskComment(payload.task.title, payload.task.id, view.body);
    });

    socket.on("connect_error", () => {
      setSocketConnected(false);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      setSocketConnected(false);
    };
  }, [
    loading,
    token,
    user?.role,
    recordIncoming,
    recordTaskCompleted,
    recordTaskComment,
  ]);

  const value = useMemo(
    () => ({
      assignmentEpoch,
      taskCompletedEpoch,
      taskCommentEpoch,
      consumeTaskCommentEvents,
      socketConnected,
      notifications: stored,
      unreadCount,
      markNotificationsSeen,
      clearNotifications,
      dismissNotification,
    }),
    [
      assignmentEpoch,
      taskCompletedEpoch,
      taskCommentEpoch,
      consumeTaskCommentEvents,
      socketConnected,
      stored,
      unreadCount,
      markNotificationsSeen,
      clearNotifications,
      dismissNotification,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-stretch gap-2 p-4 pt-[max(1rem,env(safe-area-inset-top))] sm:items-end sm:pl-0"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto max-w-full rounded-lg border border-slate-200 bg-white p-4 shadow-lg sm:max-w-sm"
          >
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">
                  {t.heading}
                </p>
                <p className="mt-1 text-sm text-slate-600">{t.message}</p>
                {t.taskTitle ? (
                  <p
                    className="mt-1 truncate text-xs text-slate-500"
                    title={t.taskTitle}
                  >
                    {t.taskTitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Dismiss notification"
              >
                <span aria-hidden className="text-lg leading-none">
                  ×
                </span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
