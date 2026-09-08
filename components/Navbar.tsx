"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, Logo, cn } from "./ui";

const TABS = [
  { label: "New", href: "/create" },
  { label: "Bills", href: "/my-bills" },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, loading, signOutUser } = useAuth();

  return (
    <header className="no-print sticky top-0 z-50 border-b border-[var(--border)] bg-white">
      <div className="mx-auto flex h-[60px] max-w-[960px] items-center gap-4 px-6">
        <Link href="/" aria-label="SplitBill home">
          <Logo />
        </Link>
        <nav className="flex flex-1 items-center gap-1">
          {user &&
            TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-sm transition-all",
                    active
                      ? "bg-[var(--primary-light)] font-semibold text-[var(--primary)]"
                      : "font-medium text-[var(--text-muted)] hover:text-[var(--foreground)]"
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
        </nav>
        <div className="flex items-center gap-3">
          {loading ? (
            <span className="text-xs text-[var(--text-light)]">Loading…</span>
          ) : user ? (
            <>
              <span className="hidden max-w-44 truncate text-[13px] text-[var(--text-muted)] sm:inline">
                {user.email}
              </span>
              <Button variant="secondary" onClick={() => void signOutUser()}>
                Sign out
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
