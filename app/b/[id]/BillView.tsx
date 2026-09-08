"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";
import {
  averageShare,
  formatLongDate,
  formatMoney,
  getBillViewState,
  subscribeBill,
  type Bill,
} from "@/lib/bills";
import { Card } from "@/components/ui";

export function BillView({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const autoPrint = searchParams.get("print") === "1";
  const configured = useMemo(() => isFirebaseConfigured(), []);
  const [bill, setBill] = useState<Bill | null | undefined>(() =>
    configured ? undefined : null
  );
  const [error, setError] = useState<string | null>(() =>
    configured ? null : "Firebase is not configured. Add keys to .env.local (see README)."
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const printedRef = useRef(false);

  useEffect(() => {
    if (!configured) return;
    const unsub = subscribeBill(
      id,
      (b) => {
        setBill(b);
        setError(null);
      },
      (e) => {
        setError(e.message);
        setBill(null);
      }
    );
    return () => unsub();
  }, [id, configured]);

  const viewState = useMemo(() => (bill ? getBillViewState(bill) : null), [bill]);

  useEffect(() => {
    if (autoPrint && bill && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [autoPrint, bill]);

  if (bill === undefined && !error) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-6 py-12">
        <p className="text-sm text-[var(--text-muted)]">Loading bill…</p>
      </main>
    );
  }

  if (error || bill === null || bill === undefined) {
    return (
      <main className="mx-auto w-full max-w-[520px] px-6 py-12">
        <Card className="p-6 text-center">
          <h1 className="text-lg font-bold">Bill not found</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {error ?? "This bill request does not exist. Check the URL and try again."}
          </p>
        </Card>
      </main>
    );
  }

  if (viewState === "closed") {
    return (
      <main className="mx-auto w-full max-w-[520px] px-6 py-12">
        <Card className="p-6 text-center">
          <h1 className="text-lg font-bold">The page has been closed by the requestor</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            {bill.eventName} · {formatMoney(bill.amountTotal, bill.currency)}
          </p>
        </Card>
      </main>
    );
  }

  const bankInfo = bill.bankInfo ?? null;
  const selectedPerson = selected !== null ? bill.people[selected] ?? null : null;

  const handleCopyAccount = async () => {
    if (!bankInfo) return;
    try {
      await navigator.clipboard.writeText(bankInfo.accountNumber);
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    } catch {
      setCopiedAccount(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-[520px] px-6 pb-20 pt-12">
      <div className="mb-4 rounded-xl bg-[var(--primary)] px-7 pb-6 pt-7 text-white">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] opacity-75">
          Bill Request
        </p>
        <h1 className="mb-1.5 text-2xl font-extrabold tracking-[-0.5px]">{bill.eventName}</h1>
        <p className="text-sm opacity-80">{formatLongDate(bill.eventDate)}</p>
        <div className="mt-5 flex justify-between border-t border-white/20 pt-5">
          <div>
            <p className="mb-0.5 text-xs opacity-70">Total</p>
            <p className="text-lg font-bold">{formatMoney(bill.amountTotal, bill.currency)}</p>
          </div>
          <div className="text-right">
            <p className="mb-0.5 text-xs opacity-70">Per person</p>
            <p className="text-[28px] font-extrabold leading-none tracking-[-0.5px]">
              {formatMoney(averageShare(bill), bill.currency)}
            </p>
          </div>
        </div>
      </div>

      <Card className="mb-4 px-6 py-5">
        <p className="mb-3.5 text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
          Select your name
        </p>
        <div className="flex flex-wrap gap-2">
          {bill.people.map((person, idx) => {
            const active = selected === idx;
            return (
              <button
                key={person.id}
                type="button"
                onClick={() => setSelected(active ? null : idx)}
                className={
                  active
                    ? "rounded-full border-2 border-[var(--primary)] bg-[var(--primary-light)] px-4 py-2 text-sm font-semibold text-[var(--primary)] transition-all"
                    : "rounded-full border-2 border-[var(--border)] bg-[#FAFAFA] px-4 py-2 text-sm font-medium transition-all hover:border-[#C7D2FE]"
                }
              >
                {person.name}
              </button>
            );
          })}
        </div>
      </Card>

      <Card className="mb-4 px-6 py-5">
        <div className="mb-3.5 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-[0.06em] text-[var(--text-muted)]">
            Transfer to
          </p>
          {bankInfo && (
            <button
              type="button"
              onClick={() => void handleCopyAccount()}
              className="no-print rounded-[7px] bg-[var(--primary-light)] px-3 py-1 text-xs font-semibold text-[var(--primary)]"
            >
              {copiedAccount ? "Copied!" : "Copy account"}
            </button>
          )}
        </div>
        {bankInfo ? (
          <>
            <div className="mb-2.5 flex justify-between">
              <span className="text-sm text-[var(--text-muted)]">Bank</span>
              <span className="text-sm font-semibold">{bankInfo.bankName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-[var(--text-muted)]">Account</span>
              <span className="font-mono text-sm font-bold tracking-[0.05em]">
                {bankInfo.accountNumber}
              </span>
            </div>
            {bankInfo.notes && (
              <div className="mt-3 rounded-lg border-l-[3px] border-[#C7D2FE] bg-[var(--background)] px-3.5 py-2.5 text-[13px] text-[var(--text-muted)]">
                {bankInfo.notes}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            The requestor did not provide payment information.
          </p>
        )}
      </Card>

      {selectedPerson && bankInfo && (
        <div className="flex items-center gap-3 rounded-xl border border-[#A7F3D0] bg-[#ECFDF5] px-5 py-4">
          <Check className="h-5 w-5 shrink-0 text-[var(--success)]" strokeWidth={3} />
          <div>
            <p className="mb-0.5 text-[15px] font-bold text-[#065F46]">
              {selectedPerson.name}, your share is{" "}
              {formatMoney(selectedPerson.amountOwed, bill.currency)}
            </p>
            <p className="text-[13px] text-[#059669]">
              Please transfer to {bankInfo.bankName} · {bankInfo.accountNumber}
            </p>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-[var(--danger)]">{error}</p>}
    </main>
  );
}
