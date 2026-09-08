import {
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  deleteField,
  updateDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  query,
  where,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { customAlphabet } from "nanoid";
import { db } from "./firebase";

export type PersonStatus = "received" | "unreceived";
export type BillStatus = "active" | "closed";
/** "expired" is retired: expiry was removed, stored dates are migrated away. */
export type BillViewState = "active" | "closed";
/** Payment is bank-only in this version. "qr" is reserved for a future Storage-backed release. */
export type PaymentMethod = "bank";

export interface BankInfo {
  bankName: string;
  /** Digits only. */
  accountNumber: string;
  notes: string | null;
}

export interface PersonRow {
  id: string;
  name: string;
  /** Amount owed in minor units (cents). */
  amountOwed: number;
  status: PersonStatus;
}

export interface Bill {
  id: string;
  ownerUid: string;
  ownerEmail: string;
  /** Total in minor units (cents). */
  amountTotal: number;
  currency: string;
  eventName: string;
  /** ISO date yyyy-mm-dd */
  eventDate: string;
  /**
   * Retired. Expiry was removed from the product; new bills never set this.
   * Pre-existing values are stripped by migrateExpireOn (see below).
   */
  expireOn?: string | null;
  status: BillStatus;
  paymentMethod: PaymentMethod;
  bankInfo: BankInfo | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createdAt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  closedAt: any;
  people: PersonRow[];
}

export const MAX_PEOPLE = 20;

export const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar", locale: "en-US" },
  { code: "EUR", label: "EUR — Euro", locale: "de-DE" },
  { code: "GBP", label: "GBP — British Pound", locale: "en-GB" },
  { code: "INR", label: "INR — Indian Rupee", locale: "en-IN" },
  { code: "JPY", label: "JPY — Japanese Yen", locale: "ja-JP" },
  { code: "SGD", label: "SGD — Singapore Dollar", locale: "en-SG" },
  { code: "CAD", label: "CAD — Canadian Dollar", locale: "en-CA" },
  { code: "AUD", label: "AUD — Australian Dollar", locale: "en-AU" },
] as const;

const nanoid8 = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  8
);
const nanoid6 = customAlphabet(
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  6
);

export function generateBillId(): string {
  return nanoid8();
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

export function formatMoney(cents: number, currency = "USD"): string {
  const entry = CURRENCIES.find((c) => c.code === currency);
  try {
    return new Intl.NumberFormat(entry?.locale ?? "en-US", {
      style: "currency",
      currency,
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

/**
 * Split a total (in cents) equally across names.
 * Remainder cents go to the first people so the sum always matches.
 * Per-person amounts are stored, so a future custom-amount editor needs no migration.
 */
export function splitAmount(totalCents: number, names: string[]): PersonRow[] {
  const n = names.length;
  if (n === 0) return [];
  const base = Math.floor(totalCents / n);
  const remainder = totalCents % n;
  return names.map((name, i) => ({
    id: nanoid6(),
    name: name.trim(),
    amountOwed: base + (i < remainder ? 1 : 0),
    status: "unreceived" as PersonStatus,
  }));
}

/** Closed bills stay closed; everything else is active (expiry is retired). */
export function getBillViewState(bill: Pick<Bill, "status">): BillViewState {
  return bill.status === "closed" ? "closed" : "active";
}

function requireDb() {
  if (!db) throw new Error("Firebase is not configured. See README for setup.");
  return db;
}

export const ACCOUNT_NUMBER_RE = /^[0-9]+$/;
export const MAX_ACCOUNT_NUMBER_LEN = 32;
export const MAX_BANK_NAME_LEN = 60;
export const MAX_BANK_NOTES_LEN = 300;

export function isValidAccountNumber(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= MAX_ACCOUNT_NUMBER_LEN &&
    ACCOUNT_NUMBER_RE.test(value)
  );
}

export interface CreateBillInput {
  ownerUid: string;
  ownerEmail: string;
  amountTotal: number;
  currency: string;
  eventName: string;
  eventDate: string;
  names: string[];
  paymentMethod: PaymentMethod;
  bankInfo: BankInfo | null;
}

export async function createBill(input: CreateBillInput): Promise<string> {
  const database = requireDb();
  const id = generateBillId();
  const people = splitAmount(toCents(input.amountTotal), input.names);
  const payload = {
    ownerUid: input.ownerUid,
    ownerEmail: input.ownerEmail,
    amountTotal: toCents(input.amountTotal),
    currency: input.currency,
    eventName: input.eventName.trim(),
    eventDate: input.eventDate,
    status: "active" as BillStatus,
    paymentMethod: input.paymentMethod,
    bankInfo: input.bankInfo,
    createdAt: serverTimestamp(),
    closedAt: null,
    people,
  };
  await setDoc(doc(database, "bills", id), payload);
  return id;
}

export async function fetchBill(id: string): Promise<Bill | null> {
  const database = requireDb();
  const snap = await getDoc(doc(database, "bills", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as DocumentData) } as Bill;
}

export function subscribeBill(
  id: string,
  onValue: (bill: Bill | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const database = requireDb();
  return onSnapshot(
    doc(database, "bills", id),
    (snap) => {
      if (!snap.exists()) {
        onValue(null);
        return;
      }
      onValue({ id: snap.id, ...(snap.data() as DocumentData) } as Bill);
    },
    (err) => onError?.(err)
  );
}

export async function setPersonStatus(
  billId: string,
  people: PersonRow[],
  personId: string,
  status: PersonStatus
): Promise<void> {
  const database = requireDb();
  const next = people.map((p) => (p.id === personId ? { ...p, status } : p));
  await updateDoc(doc(database, "bills", billId), { people: next });
}

export async function closeBill(billId: string): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, "bills", billId), {
    status: "closed" as BillStatus,
    closedAt: serverTimestamp(),
  });
}

function sortNewestFirst(bills: Bill[]): Bill[] {
  const millis = (t: unknown): number =>
    t !== null && typeof t === "object" && typeof (t as { toMillis?: unknown }).toMillis === "function"
      ? (t as { toMillis: () => number }).toMillis()
      : 0;
  return [...bills].sort((a, b) => millis(b.createdAt) - millis(a.createdAt));
}

function toBill(id: string, data: DocumentData): Bill {
  return { id, ...(data as DocumentData) } as Bill;
}

export async function fetchMyBills(ownerUid: string): Promise<Bill[]> {
  const database = requireDb();
  const { getDocs } = await import("firebase/firestore");
  // Single-field query on purpose: adding orderBy(createdAt) would require
  // a composite index in the console. Sorting newest-first here instead.
  const q = query(collection(database, "bills"), where("ownerUid", "==", ownerUid));
  const snap = await getDocs(q);
  return sortNewestFirst(snap.docs.map((d) => toBill(d.id, d.data())));
}

/** Realtime version of fetchMyBills for the dashboard (toggles/progress update live). */
export function subscribeMyBills(
  ownerUid: string,
  onValue: (bills: Bill[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const database = requireDb();
  const q = query(collection(database, "bills"), where("ownerUid", "==", ownerUid));
  return onSnapshot(
    q,
    (snap) => onValue(sortNewestFirst(snap.docs.map((d) => toBill(d.id, d.data())))),
    (err) => onError?.(err)
  );
}

/** Permanently delete a bill. Public links to it will show "not found". */
export async function deleteBill(billId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), "bills", billId));
}

/**
 * One-time data migration for expiry removal: strips the retired `expireOn`
 * field from the owner's bills that still carry it. Safe to run repeatedly;
 * only touches the caller's own documents.
 */
export async function migrateExpireOn(ownerUid: string): Promise<number> {
  const database = requireDb();
  const { getDocs } = await import("firebase/firestore");
  const snap = await getDocs(query(collection(database, "bills"), where("ownerUid", "==", ownerUid)));
  let stripped = 0;
  for (const d of snap.docs) {
    const data = d.data() as DocumentData;
    if (data.expireOn !== undefined && data.expireOn !== null) {
      await updateDoc(doc(database, "bills", d.id), { expireOn: deleteField() });
      stripped += 1;
    }
  }
  return stripped;
}

/** Average share, for summary displays ("$X / person"). */
export function averageShare(bill: Pick<Bill, "amountTotal" | "people">): number {
  if (bill.people.length === 0) return 0;
  return Math.round(bill.amountTotal / bill.people.length);
}

export function formatShortDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function formatLongDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}
