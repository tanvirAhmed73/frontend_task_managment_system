export default function UserMyTasksStubPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">My Tasks</h2>
      </div>
      <div className="p-6">
        <p className="mb-4 text-sm text-slate-600">
          Assigned tasks and status updates will use task APIs when they ship.
          The table is a stub for the dropdown + Update flow from the spec.
        </p>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-3 text-slate-400">—</td>
                <td className="px-4 py-3 text-slate-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            disabled
            title="Waiting for PATCH /api/tasks/:id"
            className="rounded-md bg-[#1e4d8c] px-4 py-2 text-sm font-semibold text-white opacity-50"
          >
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
