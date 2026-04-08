"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BellIcon } from "@/components/bell-icon";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";

function formatTime(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      month: "short",
      day: "numeric",
    }).format(new Date(ts));
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    markNotificationsSeen,
    clearNotifications,
    dismissNotification,
    socketConnected,
  } = useNotifications();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (open) markNotificationsSeen();
  }, [open, markNotificationsSeen]);

  const tasksHref = user?.role === "USER" ? "/user" : "/admin";
  const tasksLabel = user?.role === "USER" ? "My Tasks" : "Dashboard";

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-md p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-[#1e4d8c] px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-full z-50 mt-1.5 w-[min(calc(100vw-2rem),20rem)] origin-top-right rounded-lg border border-slate-200 bg-white shadow-lg"
          role="dialog"
          aria-label="Notification list"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">
                Notifications
              </p>
              <p className="truncate text-xs text-slate-500">
                {socketConnected ? "Live · connected" : "Offline · reconnecting…"}
              </p>
            </div>
            {notifications.length > 0 ? (
              <button
                type="button"
                onClick={() => clearNotifications()}
                className="shrink-0 text-xs font-medium text-[#1e4d8c] hover:underline"
              >
                Clear all
              </button>
            ) : null}
          </div>
          <ul className="max-h-[min(18rem,50vh)] overflow-y-auto overscroll-contain py-1">
            {notifications.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                No notifications yet.
                {user ? (
                  <>
                    {" "}
                    <Link
                      href={tasksHref}
                      className="font-medium text-[#1e4d8c] hover:underline"
                      onClick={() => setOpen(false)}
                    >
                      {tasksLabel}
                    </Link>
                  </>
                ) : null}
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-slate-50 px-3 py-2.5 last:border-b-0 ${
                    !n.seen ? "bg-sky-50/60" : ""
                  }`}
                >
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <span
                        className={`mb-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          n.kind === "completed"
                            ? "bg-emerald-100 text-emerald-900"
                            : n.kind === "comment"
                              ? "bg-violet-100 text-violet-900"
                              : "bg-sky-100 text-sky-900"
                        }`}
                      >
                        {n.kind === "completed"
                          ? "Completed"
                          : n.kind === "comment"
                            ? "Comment"
                            : "Assigned"}
                      </span>
                      <p className="text-sm text-slate-800">{n.message}</p>
                      {n.taskTitle ? (
                        <p className="mt-0.5 truncate text-xs font-medium text-slate-600">
                          {n.taskTitle}
                        </p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatTime(n.receivedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissNotification(n.id)}
                      className="shrink-0 self-start rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Remove notification"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
