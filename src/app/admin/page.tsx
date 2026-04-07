import { AdminHealthStatus } from "@/components/admin-health-status";

export default function AdminTaskManagementStubPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Task Management
        </h2>
        <button
          type="button"
          disabled
          title="Backend task APIs are not available yet"
          className="rounded-md bg-[#1e4d8c] px-4 py-2 text-sm font-semibold text-white opacity-50"
        >
          Create Task
        </button>
      </div>
      <div className="p-6">
        <AdminHealthStatus />
        <p className="mb-4 text-sm text-slate-600">
          Task list, create, edit, and delete will connect here once{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            GET/POST/PATCH/DELETE /api/tasks
          </code>{" "}
          exist on the backend. The table below is a visual stub matching the
          planned UI.
        </p>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              <tr className="bg-white">
                <td className="px-4 py-3 text-slate-400">—</td>
                <td className="px-4 py-3 text-slate-400">—</td>
                <td className="px-4 py-3 text-slate-400">—</td>
                <td className="px-4 py-3 text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
