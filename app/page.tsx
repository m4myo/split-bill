"use client";

import Link from "next/link";
import { ArrowRight, Link2, ListChecks, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Logo } from "@/components/ui";

const STEPS = [
  {
    icon: <Wallet className="h-5 w-5 text-[var(--primary)]" />,
    title: "Create a request",
    text: "Amount, up to 20 people, event details and bank info. Shares split equally.",
  },
  {
    icon: <Link2 className="h-5 w-5 text-[var(--primary)]" />,
    title: "Share the link",
    text: "Anyone with the URL sees their share and where to transfer. No login needed.",
  },
  {
    icon: <ListChecks className="h-5 w-5 text-[var(--primary)]" />,
    title: "Track & close",
    text: "Tap chips to mark Received, watch progress, then close or delete the request.",
  },
];

export default function Home() {
  const { user, loading, configured, signInWithGoogle, error } = useAuth();

  return (
    <main className="mx-auto w-full max-w-[960px] flex-1 px-6 pb-20 pt-10">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <Logo size={40} />
        </div>
        <h1 className="mb-2 text-[32px] font-extrabold tracking-[-0.5px]">
          Split a bill with a link
        </h1>
        <p className="mx-auto max-w-xl text-[15px] leading-relaxed text-[var(--text-muted)]">
          Enter the amount, who owes, and the event details. Share the bill URL with anyone —
          no login needed to view. You track Received / Unreceived as the owner.
        </p>
      </div>

      {!configured && (
        <Card className="mx-auto mb-6 max-w-xl p-6">
          <h2 className="text-sm font-bold">Firebase is not configured yet</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Add your Firebase web-app keys to <code>.env.local</code> (see README), enable
            Google sign-in and Firestore, then restart <code>npm run dev</code>.
          </p>
        </Card>
      )}

      <Card className="mx-auto mb-8 max-w-xl p-6 text-center">
        {loading ? (
          <p className="text-sm text-[var(--text-muted)]">Checking sign-in…</p>
        ) : user ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              Signed in as <span className="font-semibold text-[var(--foreground)]">{user.email}</span>
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/create">
                <Button>
                  Generate Bill Request
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/my-bills">
                <Button variant="secondary">My bills</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-[var(--text-muted)]">
              Step 1: sign in with Google to create a bill request.
            </p>
            <Button onClick={() => void signInWithGoogle()} disabled={!configured}>
              Sign in with Google
            </Button>
            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
          </div>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {STEPS.map((step, i) => (
          <Card key={step.title} className="p-5">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary-light)]">
              {step.icon}
            </div>
            <p className="mb-1 text-[13px] font-bold uppercase tracking-[0.06em] text-[var(--text-light)]">
              Step {i + 1}
            </p>
            <h2 className="mb-1 text-[15px] font-bold">{step.title}</h2>
            <p className="text-sm leading-relaxed text-[var(--text-muted)]">{step.text}</p>
          </Card>
        ))}
      </div>
    </main>
  );
}
