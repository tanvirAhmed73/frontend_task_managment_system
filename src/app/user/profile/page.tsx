"use client";

import { useAuth } from "@/contexts/auth-context";

export default function UserProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Profile</h2>
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
    </div>
  );
}
