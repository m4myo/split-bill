"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { fetchBill, formatMoney, type Bill } from "@/lib/bills";
import { isFirebaseConfigured } from "@/lib/firebase";
import { Button, Card } from "@/components/ui";

export function SuccessContent({ id }: { id: string }) {
  const configured = useMemo(() => isFirebaseConfigured(), []);
  const [bill, setBill] = useState<Bill | null | undefined>(() =>
    configured ? undefined : null
  );
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/b/${id}` : `/b/${id}`;

  useEffect(() => {
    if (!configured) return;
    fetchBill(id)
      .then((b) => setBill(b))
      .catch(() => setBill(null));
  }, [id, configured]);

  if (bill === undefined) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-6 py-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </main>
    );
  }

  if (bill === null) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-6 py-10 text-center">
        <Card className="p-6">
          <h1 className="text-lg font-bold">Bill not found</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            This bill request does not exist. Check the URL and try again.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link href="/create">
              <Button variant="secondary">Create another</Button>
            </Link>
            <Link href="/my-bills">
              <Button>View my bills</Button>
            </Link>
          </div>
        </Card>
      </main>
    );
  }

  const perPerson = bill.people.length > 0 ? bill.amountTotal / bill.people.length : 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[560px] px-6 py-[60px] text-center">
      <div className="mx-auto mb-6 flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#D1FAE5]">
        <Check className="h-8 w-8 text-[var(--success)]" strokeWidth={3} />
      </div>
      <h1 className="mb-2 text-[26px] font-extrabold tracking-[-0.5px]">Bill request created!</h1>
      <p className="mb-8 text-[15px] leading-relaxed text-[var(--text-muted)]">
        Share this link with everyone. They can view their share and payment details.
      </p>

      <Card className="mb-6 p-5 text-left">
        <div className="mb-3 flex justify-between">
          <span className="text-sm text-[var(--text-muted)]">Event</span>
          <span className="text-sm font-semibold">{bill.eventName}</span>
        </div>
        <div className="mb-3 flex justify-between">
          <span className="text-sm text-[var(--text-muted)]">Total amount</span>
          <span className="text-sm font-semibold">{formatMoney(bill.amountTotal, bill.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-[var(--text-muted)]">Per person</span>
          <span className="text-sm font-bold text-[var(--primary)]">
            {formatMoney(Math.round(perPerson), bill.currency)}
          </span>
        </div>
      </Card>

      <div className="no-print mb-6 flex items-center gap-2 rounded-[10px] border-[1.5px] border-[var(--border)] bg-white p-2.5 pl-3.5">
        <span className="flex-1 truncate text-left text-[13px] text-[var(--text-muted)]">{url}</span>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={
            copied
              ? "shrink-0 rounded-[7px] bg-[#D1FAE5] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--success)]"
              : "shrink-0 rounded-[7px] bg-[var(--primary-light)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--primary)]"
          }
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      <div className="no-print flex justify-center gap-3">
        <Link href="/create">
          <Button variant="secondary">Create another</Button>
        </Link>
        <Link href="/my-bills">
          <Button>View my bills →</Button>
        </Link>
      </div>
    </main>
  );
}
