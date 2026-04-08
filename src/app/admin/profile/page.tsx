"use client";

import { ChangePasswordForm } from "@/components/change-password-form";
import { ProfileSummary } from "@/components/profile-summary";

export default function AdminProfilePage() {
  return (
    <div className="mx-auto w-full max-w-lg rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-8">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">Profile</h2>
      <ProfileSummary />
      <ChangePasswordForm />
    </div>
  );
}
