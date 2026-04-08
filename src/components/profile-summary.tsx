"use client";

import { useAuth } from "@/contexts/auth-context";

export function ProfileSummary() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <dl className="space-y-3 text-sm">
      <div>
        <dt className="font-medium text-slate-500">Email</dt>
        <dd className="text-slate-900">{user.email}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-500">Name</dt>
        <dd className="text-slate-900">{user.name ?? "—"}</dd>
      </div>
      <div>
        <dt className="font-medium text-slate-500">Role</dt>
        <dd className="text-slate-900">{user.role}</dd>
      </div>
    </dl>
  );
}
