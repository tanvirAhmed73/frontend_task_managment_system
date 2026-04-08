import { AdminHealthStatus } from "@/components/admin-health-status";
import { AdminTasksManager } from "@/components/admin-tasks-manager";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <AdminHealthStatus />
      <AdminTasksManager />
    </div>
  );
}
