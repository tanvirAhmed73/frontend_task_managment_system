"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { MenuIcon } from "@/components/menu-icons";
import { NotificationBell } from "@/components/notification-bell";
import { useEffect, useState } from "react";

const nav = [
  { href: "/user", label: "My Tasks" },
  { href: "/user/profile", label: "Profile" },
];

export function UserShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [user, loading, router]);

  useEffect(() => {
    queueMicrotask(() => setNavOpen(false));
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [navOpen]);

  async function handleLogout() {
    setNavOpen(false);
    await logout();
    router.replace("/login");
  }

  if (loading || !user || user.role !== "USER") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-slate-100">
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100%,16rem)] flex-col bg-[#0f2744] text-white transition-transform duration-200 ease-out lg:static lg:z-0 lg:w-56 lg:translate-x-0 lg:flex-shrink-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5 sm:py-6">
          <p className="text-lg font-semibold tracking-tight">
            User Dashboard
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active =
              item.href === "/user"
                ? pathname === "/user"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setNavOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="w-full rounded-md px-3 py-2.5 text-left text-sm text-white/80 hover:bg-white/10 hover:text-white sm:py-2"
          >
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-[100dvh] min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:px-8 lg:py-5">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
            aria-expanded={navOpen}
            aria-label="Open navigation menu"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900 sm:text-xl">
            User Dashboard
          </h1>
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-x-hidden p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
