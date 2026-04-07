"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { createUserRequest } from "@/lib/api";
import type { AuthUserRole, AuthUserView } from "@/lib/types";

export default function AdminCreateUserPage() {
  const { token } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<AuthUserRole>("USER");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<AuthUserView | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const body: {
        email: string;
        password: string;
        name?: string;
        role?: AuthUserRole;
      } = { email: email.trim(), password };
      const trimmedName = name.trim();
      if (trimmedName) body.name = trimmedName;
      if (role !== "USER") body.role = role;
      const created = await createUserRequest(token, body);
      setSuccess(created);
      setEmail("");
      setPassword("");
      setName("");
      setRole("USER");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create user");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">
        Create user
      </h2>
      <p className="mb-6 text-sm text-slate-600">
        Admins can invite accounts via{" "}
        <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
          POST /api/users
        </code>
        . Password must be at least 8 characters.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="u-email"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="u-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]"
          />
        </div>
        <div>
          <label
            htmlFor="u-password"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Password
          </label>
          <input
            id="u-password"
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]"
          />
        </div>
        <div>
          <label
            htmlFor="u-name"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Name <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="u-name"
            type="text"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]"
          />
        </div>
        <div>
          <label
            htmlFor="u-role"
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            Role
          </label>
          <select
            id="u-role"
            value={role}
            onChange={(e) => setRole(e.target.value as AuthUserRole)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-[#1e4d8c] focus:ring-2 focus:ring-[#1e4d8c]"
          >
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-emerald-700" role="status">
            Created{" "}
            <span className="font-medium">{success.email}</span> (
            {success.role}
            {success.name ? `, ${success.name}` : ""}).
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-[#1e4d8c] py-2.5 text-sm font-semibold text-white hover:bg-[#173d75] disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create user"}
        </button>
      </form>
    </div>
  );
}
