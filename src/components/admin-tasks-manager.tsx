"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useNotifications } from "@/contexts/notifications-context";
import {
  createTaskRequest,
  deleteTaskRequest,
  listTasksRequest,
  listUsersRequest,
  updateTaskRequest,
} from "@/lib/api";
import { TaskExpandPanel } from "@/components/task-expand-panel";
import {
  assigneePickerLabel,
  displayUser,
  statusBadgeClass,
  statusLabel,
  taskAssigneeId,
  TASK_STATUSES,
} from "@/lib/task-utils";
import type {
  CreateTaskBody,
  ListedUserView,
  TaskStatus,
  TaskView,
  UpdateTaskBody,
} from "@/lib/types";

export function AdminTasksManager() {
  const { token } = useAuth();
  const { taskCompletedEpoch } = useNotifications();
  const [tasks, setTasks] = useState<TaskView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftFilterStatus, setDraftFilterStatus] = useState<TaskStatus | "">(
    ""
  );
  const [draftFilterAssigneeId, setDraftFilterAssigneeId] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<TaskStatus | "">("");
  const [appliedAssigneeId, setAppliedAssigneeId] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<TaskView | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<TaskStatus>("PENDING");
  const [formAssigneeId, setFormAssigneeId] = useState("");
  const [pickerUsers, setPickerUsers] = useState<ListedUserView[]>([]);
  const [pickerUsersLoading, setPickerUsersLoading] = useState(false);
  const [pickerUsersError, setPickerUsersError] = useState<string | null>(null);

  const loadPickerUsers = useCallback(async () => {
    if (!token) return;
    setPickerUsersLoading(true);
    setPickerUsersError(null);
    try {
      const list = await listUsersRequest(token);
      setPickerUsers(list);
    } catch (e) {
      setPickerUsersError(
        e instanceof Error ? e.message : "Failed to load users"
      );
      setPickerUsers([]);
    } finally {
      setPickerUsersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadPickerUsers();
  }, [loadPickerUsers]);

  const listQuery = useMemo(
    () => ({
      ...(appliedStatus ? { status: appliedStatus as TaskStatus } : {}),
      ...(appliedAssigneeId ? { assignee_id: appliedAssigneeId } : {}),
    }),
    [appliedStatus, appliedAssigneeId]
  );

  /** Include current task assignee if they are missing from GET /users (e.g. inactive). */
  const modalAssigneeOptions = useMemo((): ListedUserView[] => {
    if (modal !== "edit" || !editing) return pickerUsers;
    const aid = taskAssigneeId(editing);
    if (!aid || pickerUsers.some((u) => u.id === aid)) return pickerUsers;
    const a = editing.assignee;
    return [
      {
        id: aid,
        email: a?.email ?? "—",
        name: a?.name ?? null,
        role: "USER",
      },
      ...pickerUsers,
    ];
  }, [modal, editing, pickerUsers]);

  const refreshList = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) return;
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const list = await listTasksRequest(token, listQuery);
        setTasks(list);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load tasks");
        setTasks([]);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [token, listQuery]
  );

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (taskCompletedEpoch === 0) return;
    void refreshList({ silent: true });
  }, [taskCompletedEpoch, refreshList]);

  function openCreate() {
    setEditing(null);
    setFormTitle("");
    setFormDescription("");
    setFormStatus("PENDING");
    setFormAssigneeId("");
    void loadPickerUsers();
    setModal("create");
  }

  function openEdit(task: TaskView) {
    setEditing(task);
    setFormTitle(task.title);
    setFormDescription(task.description);
    setFormStatus(task.status);
    setFormAssigneeId(taskAssigneeId(task) ?? "");
    void loadPickerUsers();
    setModal("edit");
  }

  function closeModal() {
    if (saving) return;
    setModal(null);
    setEditing(null);
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const selectedAssigneeId = formAssigneeId.trim();
      if (modal === "create") {
        const body: CreateTaskBody = {
          title: formTitle.trim(),
          description: formDescription.trim(),
        };
        if (formStatus !== "PENDING") body.status = formStatus;
        if (selectedAssigneeId) body.assignee_id = selectedAssigneeId;
        await createTaskRequest(token, body);
      } else if (modal === "edit" && editing) {
        const body: UpdateTaskBody = {
          title: formTitle.trim(),
          description: formDescription.trim(),
          status: formStatus,
          assignee_id: selectedAssigneeId || null,
        };
        await updateTaskRequest(token, editing.id, body);
      }
      setModal(null);
      setEditing(null);
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteTaskRequest(token, id);
      setExpandedTaskId((open) => (open === id ? null : open));
      await refreshList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Task Management
        </h2>
        <button
          type="button"
          onClick={openCreate}
          className="w-full rounded-md bg-[#1e4d8c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173d75] sm:w-auto sm:py-2"
        >
          Create Task
        </button>
      </div>
      <div className="p-4 sm:p-6">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="w-full lg:w-auto">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Status
            </label>
            <select
              value={draftFilterStatus}
              onChange={(e) =>
                setDraftFilterStatus((e.target.value || "") as TaskStatus | "")
              }
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 lg:w-auto lg:py-1.5"
            >
              <option value="">All</option>
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 w-full lg:min-w-[12rem] lg:flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Assignee
            </label>
            <select
              value={draftFilterAssigneeId}
              onChange={(e) => setDraftFilterAssigneeId(e.target.value)}
              disabled={pickerUsersLoading}
              className="w-full rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-900 disabled:bg-slate-50 lg:py-1.5"
            >
              <option value="">All assignees</option>
              {pickerUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {assigneePickerLabel(u)}
                </option>
              ))}
            </select>
            {pickerUsersError ? (
              <p className="mt-1 text-xs text-amber-700">{pickerUsersError}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:w-auto">
            <button
              type="button"
              onClick={() => {
                setAppliedStatus(draftFilterStatus);
                setAppliedAssigneeId(draftFilterAssigneeId.trim());
              }}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto sm:py-1.5"
            >
              Apply filters
            </button>
            <button
              type="button"
              onClick={() => void refreshList()}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto sm:py-1.5"
            >
              Refresh
            </button>
          </div>
        </div>

        {error ? (
          <p className="mb-4 break-words text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="hidden overflow-x-auto rounded-md border border-slate-200 md:block">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    Loading tasks…
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No tasks match the current filters.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <Fragment key={task.id}>
                    <tr className="bg-white">
                      <td className="px-4 py-3 font-medium">{task.title}</td>
                      <td className="px-4 py-3">
                        {displayUser(task.assignee)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(task.status)}`}
                        >
                          {statusLabel(task.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedTaskId((id) =>
                                id === task.id ? null : task.id
                              )
                            }
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {expandedTaskId === task.id ? "Hide" : "View"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(task)}
                            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={deletingId === task.id}
                            onClick={() => {
                              if (
                                typeof window !== "undefined" &&
                                window.confirm(
                                  `Delete task “${task.title}”?`
                                )
                              ) {
                                void handleDelete(task.id);
                              }
                            }}
                            className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                          >
                            {deletingId === task.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedTaskId === task.id ? (
                      <tr className="bg-slate-50/50">
                        <td colSpan={4} className="p-0">
                          <TaskExpandPanel
                            taskId={task.id}
                            listTask={task}
                            variant="admin"
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

        <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 md:hidden">
          {loading ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              Loading tasks…
            </li>
          ) : tasks.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              No tasks match the current filters.
            </li>
          ) : (
            tasks.map((task) => (
              <li key={task.id} className="divide-y divide-slate-100">
                <div className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 flex-1 font-medium text-slate-900">
                      {task.title}
                    </p>
                    <span
                      className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(task.status)}`}
                    >
                      {statusLabel(task.status)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium text-slate-500">
                      Assignee:{" "}
                    </span>
                    {displayUser(task.assignee)}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedTaskId((id) =>
                          id === task.id ? null : task.id
                        )
                      }
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      {expandedTaskId === task.id ? "Hide" : "View"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="rounded border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={deletingId === task.id}
                      onClick={() => {
                        if (
                          typeof window !== "undefined" &&
                          window.confirm(`Delete task “${task.title}”?`)
                        ) {
                          void handleDelete(task.id);
                        }
                      }}
                      className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === task.id ? "Deleting…" : "Delete"}
                    </button>
                  </div>
                </div>
                {expandedTaskId === task.id ? (
                  <TaskExpandPanel
                    taskId={task.id}
                    listTask={task}
                    variant="admin"
                  />
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[min(92dvh,100vh)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200 border-b-0 bg-white p-5 shadow-lg sm:rounded-lg sm:border-b sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              {modal === "create" ? "Create task" : "Edit task"}
            </h3>
            <form onSubmit={handleSubmitForm} className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Title
                </label>
                <input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) =>
                    setFormStatus(e.target.value as TaskStatus)
                  }
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                >
                  {TASK_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Assignee{" "}
                  <span className="font-normal text-slate-500">
                    (optional; unassign on edit)
                  </span>
                </label>
                <select
                  value={formAssigneeId}
                  onChange={(e) => setFormAssigneeId(e.target.value)}
                  disabled={pickerUsersLoading}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
                >
                  <option value="">
                    {pickerUsersLoading ? "Loading users…" : "Unassigned"}
                  </option>
                  {modalAssigneeOptions.map((u) => (
                    <option key={u.id} value={u.id}>
                      {assigneePickerLabel(u)}
                    </option>
                  ))}
                </select>
                {pickerUsersError ? (
                  <p className="mt-1 text-xs text-amber-700">{pickerUsersError}</p>
                ) : null}
              </div>
              <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="w-full rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 sm:w-auto sm:py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-md bg-[#1e4d8c] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#173d75] disabled:opacity-50 sm:w-auto sm:py-2"
                >
                  {saving ? "Saving…" : modal === "create" ? "Create" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
