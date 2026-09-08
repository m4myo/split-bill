"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ClipboardList, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  averageShare,
  closeBill,
  deleteBill,
  formatMoney,
  formatShortDate,
  migrateExpireOn,
  setPersonStatus,
  subscribeMyBills,
  type Bill,
  type PersonRow,
} from "@/lib/bills";
import { Badge, Button, Card, PersonChip, ProgressBar, cn } from "@/components/ui";

function friendlyActionError(action: string, e: unknown): string {
  const code = typeof e === "object" && e !== null ? (e as { code?: unknown }).code : undefined;
  const msg = e instanceof Error ? e.message : "Unknown error.";
  if (code === "permission-denied" || msg.toLowerCase().includes("permission")) {
    return `${action}: rejected by Firestore security rules. Republish the latest firestore.rules from this repo in the Firebase console, then retry.`;
  }
  return `${action}: ${msg}`;
}

function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div
      className="no-print fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1830]/45 p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl bg-white p-7 shadow-[0_20px_60px_rgba(0,0,0,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function MyBillsPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [bills, setBills] = useState<Bill[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [closeId, setCloseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    // One-time data migration: strip the retired expireOn field.
    void migrateExpireOn(user.uid).catch(() => {});
    const unsub = subscribeMyBills(
      user.uid,
      (b) => {
        setBills(b);
        setError(null);
      },
      (e) => setError(e.message)
    );
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[960px] px-6 py-10">
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[960px] px-6 py-10">
        <Card className="p-6">
          <h1 className="text-lg font-bold">Sign in required</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Sign in to see your bill requests.
          </p>
          <div className="mt-4">
            <Button onClick={() => void signInWithGoogle()} disabled={!isFirebaseConfigured()}>
              Sign in with Google
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const handleToggle = async (bill: Bill, person: PersonRow) => {
    if (bill.status === "closed") return;
    try {
      await setPersonStatus(
        bill.id,
        bill.people,
        person.id,
        person.status === "received" ? "unreceived" : "received"
      );
    } catch (e) {
      setError(friendlyActionError("Update failed", e));
    }
  };

  const handleClose = async () => {
    if (!closeId) return;
    setBusy(true);
    try {
      await closeBill(closeId);
      setCloseId(null);
    } catch (e) {
      setError(friendlyActionError("Close failed", e));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setBusy(true);
    try {
      await deleteBill(deleteId);
      setDeleteId(null);
    } catch (e) {
      setError(friendlyActionError("Delete failed", e));
    } finally {
      setBusy(false);
    }
  };

  const billToDelete = bills?.find((b) => b.id === deleteId) ?? null;
  const billToClose = bills?.find((b) => b.id === closeId) ?? null;

  return (
    <main className="mx-auto w-full max-w-[960px] px-6 pb-20 pt-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-[26px] font-extrabold tracking-[-0.5px]">My Bills</h1>
          <p className="text-sm text-[var(--text-muted)]">
            {bills === null
              ? "Loading…"
              : `${bills.length} bill ${bills.length === 1 ? "request" : "requests"}`}
          </p>
        </div>
        <Link href="/create">
          <Button>+ New bill</Button>
        </Link>
      </div>

      {error && <p className="mb-4 text-sm text-[var(--danger)]">{error}</p>}

      {bills !== null && bills.length === 0 && (
        <div className="mx-auto max-w-[600px] px-6 py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-light)]">
            <ClipboardList className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <h2 className="mb-2 text-[22px] font-bold">No bill requests yet</h2>
          <p className="mb-6 text-[var(--text-muted)]">Create your first bill request to get started.</p>
          <Link href="/create">
            <Button>Create bill request →</Button>
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {bills?.map((bill) => {
          const paidCount = bill.people.filter((p) => p.status === "received").length;
          const total = bill.people.length;
          const pct = total > 0 ? Math.round((paidCount / total) * 100) : 0;
          const complete = total > 0 && paidCount === total;
          const closed = bill.status === "closed";
          return (
            <Card
              key={bill.id}
              className={cn(
                "overflow-hidden",
                closed ? "border-[#D1FAE5] opacity-80" : undefined
              )}
            >
              <div className="flex flex-col gap-4 border-b border-[var(--border)] px-6 py-[18px] lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-2.5">
                    <h3 className="m-0 truncate text-base font-bold">{bill.eventName}</h3>
                    {closed && <Badge tone="green">Closed</Badge>}
                  </div>
                  <p className="m-0 text-[13px] text-[var(--text-muted)]">
                    {formatShortDate(bill.eventDate)} · {total} {total === 1 ? "person" : "people"}
                  </p>
                </div>
                <div className="shrink-0 lg:text-right">
                  <div className="text-xl font-extrabold tracking-[-0.5px]">
                    {formatMoney(bill.amountTotal, bill.currency)}
                  </div>
                  <div className="text-[13px] text-[var(--text-muted)]">
                    {formatMoney(averageShare(bill), bill.currency)} / person
                  </div>
                </div>
                <div className="no-print flex shrink-0 flex-wrap gap-2">
                  <Link href={`/b/${bill.id}`}>
                    <Button variant="secondary">View link</Button>
                  </Link>
                  {!closed && (
                    <Button variant="secondary" onClick={() => setCloseId(bill.id)}>
                      Close
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => window.open(`/b/${bill.id}?print=1`, "_blank", "noopener")}
                  >
                    PDF
                  </Button>
                  <Button variant="dangerOutline" onClick={() => setDeleteId(bill.id)}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="px-6 pt-3.5">
                <div className="mb-1.5 flex justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Payment progress</span>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      complete ? "text-[var(--success)]" : "text-[var(--text-muted)]"
                    )}
                  >
                    {paidCount}/{total} received
                  </span>
                </div>
                <div className="mb-4">
                  <ProgressBar percent={pct} complete={complete} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2 px-6 pb-[18px]">
                {bill.people.map((person) => (
                  <PersonChip
                    key={person.id}
                    name={person.name}
                    paid={person.status === "received"}
                    disabled={closed}
                    onClick={closed ? undefined : () => void handleToggle(bill, person)}
                  />
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      {deleteId && billToDelete && (
        <Modal onClose={() => !busy && setDeleteId(null)}>
          <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-[#FEE2E2]">
            <Trash2 className="h-5 w-5 text-[var(--danger)]" />
          </div>
          <h3 className="mb-2 text-lg font-extrabold tracking-[-0.3px]">Delete bill request?</h3>
          <p className="mb-6 text-sm leading-relaxed text-[var(--text-muted)]">
            <strong className="text-[var(--foreground)]">{billToDelete.eventName}</strong> will be
            permanently deleted. Anyone with the link will no longer find it. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </Modal>
      )}

      {closeId && billToClose && (
        <Modal onClose={() => !busy && setCloseId(null)}>
          <h3 className="mb-2 text-lg font-extrabold tracking-[-0.3px]">Close bill request?</h3>
          <p className="mb-6 text-sm leading-relaxed text-[var(--text-muted)]">
            <strong className="text-[var(--foreground)]">{billToClose.eventName}</strong> will show
            “The page has been closed by the requestor” to all visitors. This cannot be undone in
            MVP.
          </p>
          <div className="flex justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setCloseId(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void handleClose()} disabled={busy}>
              {busy ? "Closing…" : "Confirm close"}
            </Button>
          </div>
        </Modal>
      )}
    </main>
  );
}
