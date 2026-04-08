"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import { TaskExpandPanel } from "@/components/task-expand-panel";
import { listTasksRequest, updateTaskRequest } from "@/lib/api";
import { statusLabel, TASK_STATUSES } from "@/lib/task-utils";
import type { TaskStatus, TaskView } from "@/lib/types";

export function UserMyTasksPanel() {
  const { token, user } = useAuth();
  const { assignmentEpoch } = useNotifications();
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [draftStatus, setDraftStatus] = useState<Record<string, TaskStatus>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const loadTasks = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token || !user) return;
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const list = await listTasksRequest(token, {
          assignee_id: user.id,
        });
        setTasks(list);
        setDraftStatus(
          Object.fromEntries(list.map((t) => [t.id, t.status])) as Record<
            string,
            TaskStatus
          >
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tasks");
        setTasks([]);
        setDraftStatus({});
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [token, user]
  );

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (assignmentEpoch === 0) return;
    void loadTasks({ silent: true });
  }, [assignmentEpoch, loadTasks]);

  async function handleUpdate() {
    if (!token || !user) return;
    setUpdating(true);
    setError(null);
    try {
      for (const task of tasks) {
        const next = draftStatus[task.id];
        if (next !== undefined && next !== task.status) {
          await updateTaskRequest(token, task.id, { status: next });
        }
      }
      await loadTasks({ silent: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  }

  const hasChanges = tasks.some(
    (t) => draftStatus[t.id] !== undefined && draftStatus[t.id] !== t.status
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>
      </div>
      <div className="p-4 sm:p-6">
        {error ? (
          <p className="mb-4 break-words text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="hidden overflow-x-auto rounded-md border border-slate-200 sm:block">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-slate-500">
                    No tasks assigned to you.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <Fragment key={task.id}>
                    <tr>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                          <span className="min-w-0">{task.title}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTaskId((id) =>
                                id === task.id ? null : task.id
                              )
                            }
                            className="w-fit shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {expandedTaskId === task.id ? "Hide" : "View"}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={draftStatus[task.id] ?? task.status}
                          onChange={(e) =>
                            setDraftStatus((d) => ({
                              ...d,
                              [task.id]: e.target.value as TaskStatus,
                            }))
                          }
                          className="rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
                        >
                          {TASK_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {statusLabel(s)}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {expandedTaskId === task.id ? (
                      <tr className="bg-slate-50/50">
                        <td colSpan={2} className="p-0">
                          <TaskExpandPanel
                            taskId={task.id}
                            listTask={task}
                            variant="user"
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 sm:hidden">
          {loading ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              Loading…
            </li>
          ) : tasks.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              No tasks assigned to you.
            </li>
          ) : (
            tasks.map((task) => (
              <li key={task.id} className="divide-y divide-slate-100">
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 font-medium text-slate-900">
                      {task.title}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTaskId((id) =>
                          id === task.id ? null : task.id
                        )
                      }
                      className="shrink-0 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {expandedTaskId === task.id ? "Hide" : "View"}
                    </button>
                  </div>
                  <label className="block text-xs font-medium text-slate-500">
                    Status
                    <select
                      value={draftStatus[task.id] ?? task.status}
                      onChange={(e) =>
                        setDraftStatus((d) => ({
                          ...d,
                          [task.id]: e.target.value as TaskStatus,
                        }))
                      }
                      className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900"
                    >
                      {TASK_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {expandedTaskId === task.id ? (
                  <TaskExpandPanel
                    taskId={task.id}
                    listTask={task}
                    variant="user"
                  />
                ) : null}
              </li>
            ))
          )}
        </ul>

        <div className="mt-6 flex justify-stretch sm:justify-end">
          <button
            type="button"
            disabled={updating || !hasChanges || loading}
            onClick={() => void handleUpdate()}
            className="w-full rounded-md bg-[#1e4d8c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173d75] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
          >
            {updating ? "Updating…" : "Update"}
          </button>
        </div>
      </div>
    </div>
  );
}
