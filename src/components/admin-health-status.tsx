"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { adminHealthRequest } from "@/lib/api";

export function AdminHealthStatus() {
  const { token } = useAuth();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    adminHealthRequest(token)
      .then((res) => {
        if (!cancelled) {
          setMessage(
            res.ok && res.scope === "admin"
              ? "Admin API scope OK (GET /api/auth/admin/health)."
              : "Unexpected health response."
          );
        }
      })
      .catch((e: Error) => {
        if (!cancelled) setMessage(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!message) return null;

  return (
    <p
      className={`mb-4 rounded-md border px-3 py-2 text-xs ${
        message.includes("OK")
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      {message}
    </p>
  );
}
