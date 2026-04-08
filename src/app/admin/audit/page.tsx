"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listAuditLogsRequest } from "@/lib/api";
import type { AuditLogView } from "@/lib/types";

const DEFAULT_LIMIT = 50;

function formatTimestamp(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function actionLabel(action: string): string {
  switch (action) {
    case "TASK_CREATED":
      return "Task created";
    case "TASK_UPDATED":
      return "Task updated";
    case "TASK_DELETED":
      return "Task deleted";
    case "TASK_STATUS_CHANGED":
      return "Status changed";
    case "TASK_ASSIGNED":
      return "Assignee changed";
    default:
      return action;
  }
}

function actorLabel(log: AuditLogView): string {
  return log.actor.name?.trim() || log.actor.email;
}

function payloadSummary(log: AuditLogView): string {
  const summary = log.payload.summary;
  return typeof summary === "string" && summary.trim()
    ? summary
    : `${actionLabel(log.action)} (${log.entity_type})`;
}

function prettyPayload(log: AuditLogView): string {
  try {
    return JSON.stringify(log.payload, null, 2);
  } catch {
    return "{}";
  }
}

export default function AdminAuditLogPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<AuditLogView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    if (limit <= 0) return 1;
    return Math.max(1, Math.ceil(total / limit));
  }, [total, limit]);

  const loadAuditLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listAuditLogsRequest(token, { page, limit });
      setItems(res.items);
      setTotal(res.total);
      setPage(res.page);
      setLimit(res.limit);
      setExpandedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit logs");
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit]);

  useEffect(() => {
    void loadAuditLogs();
  }, [loadAuditLogs]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
      </div>

      <div className="p-4 sm:p-6">
        {error ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            Total {total} entries · Page {page} of {totalPages}
          </p>
          <button
            type="button"
            onClick={() => void loadAuditLogs()}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            Refresh
          </button>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Loading audit logs…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    No audit entries found.
                  </td>
                </tr>
              ) : (
                items.map((log) => (
                  <Fragment key={log.id}>
                    <tr className="bg-white">
                      <td className="px-4 py-3 text-slate-700">
                        {formatTimestamp(log.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {actorLabel(log)}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {log.actor.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {actionLabel(log.action)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="line-clamp-2">{payloadSummary(log)}</p>
                      </td>
                      
                    </tr>
                    
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={loading || page <= 1}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <p className="text-sm text-slate-600">
            Page {page} / {totalPages}
          </p>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={loading || page >= totalPages}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
