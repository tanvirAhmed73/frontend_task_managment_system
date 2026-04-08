"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { changePasswordRequest } from "@/lib/api";

export function ChangePasswordForm() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await changePasswordRequest(token, {
        currentPassword,
        newPassword,
      });
      await logout();
      router.replace("/login?passwordUpdated=1");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update password"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <h3 className="mb-1 text-base font-semibold text-slate-900">
        Change password
      </h3>
      <p className="mb-4 text-sm text-slate-600">
        After a successful change you will be signed out and need to log in
        again with your new password.
      </p>
      <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
        <div>
          <label
            htmlFor="current-password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]"
          />
        </div>
        <div>
          <label
            htmlFor="new-password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]"
          />
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]"
          />
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-[#1e4d8c] py-2.5 text-sm font-semibold text-white hover:bg-[#173d75] disabled:opacity-60 sm:w-auto sm:px-6"
        >
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
