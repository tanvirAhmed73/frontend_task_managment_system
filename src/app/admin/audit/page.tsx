export default function AdminAuditLogStubPage() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Audit Log</h2>
      </div>
      <div className="p-6">
        <p className="mb-4 text-sm text-slate-600">
          Audit entries will load from{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
            GET /api/audit-logs
          </code>{" "}
          when that route is implemented. Placeholder columns match the planned
          design.
        </p>
        <div className="overflow-x-auto rounded-md border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
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
