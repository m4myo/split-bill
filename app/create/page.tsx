"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { nanoid } from "nanoid";
import { ArrowRight, Landmark, Users, Wallet, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  CURRENCIES,
  MAX_ACCOUNT_NUMBER_LEN,
  MAX_BANK_NAME_LEN,
  MAX_BANK_NOTES_LEN,
  MAX_PEOPLE,
  createBill,
  formatMoney,
  isValidAccountNumber,
  splitAmount,
  toCents,
} from "@/lib/bills";
import { Button, Card, Field, Input, SectionCard, Select, Textarea } from "@/components/ui";

const formSchema = z.object({
  amount: z
    .string()
    .trim()
    .min(1, "Amount is required.")
    .refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Enter an amount greater than 0.")
    .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "Amount can have at most 2 decimal places.")
    .refine((v) => Number(v) <= 1_000_000, "Amount is too large for MVP."),
  currency: z.string().min(1),
  numPeople: z.coerce.number().int().min(1, "At least 1 person.").max(MAX_PEOPLE, `Max ${MAX_PEOPLE} people.`),
  names: z.array(z.string()),
  eventName: z.string().trim().min(1, "Event name is required.").max(100),
  eventDate: z.string().min(1, "Event date is required."),
  bankName: z.string(),
  bankAccount: z.string(),
  bankNotes: z.string().optional(),
}).superRefine((data, ctx) => {
  const trimmed = data.names.map((n) => n.trim());
  if (trimmed.length !== data.numPeople) {
    ctx.addIssue({ code: "custom", message: "Names must match number of people.", path: ["names"] });
  }
  trimmed.forEach((name, i) => {
    if (!name) {
      ctx.addIssue({ code: "custom", message: `Name ${i + 1} is required.`, path: ["names", i] });
    } else if (name.length > 50) {
      ctx.addIssue({ code: "custom", message: "Max 50 characters.", path: ["names", i] });
    }
  });
  // Payment is bank-only in this version: bank fields are always required.
  const bankName = data.bankName.trim();
  if (!bankName) {
    ctx.addIssue({ code: "custom", message: "Bank name is required.", path: ["bankName"] });
  } else if (bankName.length > MAX_BANK_NAME_LEN) {
    ctx.addIssue({ code: "custom", message: `Max ${MAX_BANK_NAME_LEN} characters.`, path: ["bankName"] });
  }
  const account = data.bankAccount.trim();
  if (!account) {
    ctx.addIssue({ code: "custom", message: "Account number is required.", path: ["bankAccount"] });
  } else if (!isValidAccountNumber(account)) {
    ctx.addIssue({
      code: "custom",
      message: `Account number must be digits only (max ${MAX_ACCOUNT_NUMBER_LEN}).`,
      path: ["bankAccount"],
    });
  }
  const notes = (data.bankNotes ?? "").trim();
  if (notes.length > MAX_BANK_NOTES_LEN) {
    ctx.addIssue({ code: "custom", message: `Max ${MAX_BANK_NOTES_LEN} characters.`, path: ["bankNotes"] });
  }
});

type FormInput = z.input<typeof formSchema>;
type FormValues = z.output<typeof formSchema>;

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function CreateBillPage() {
  const router = useRouter();
  const { user, loading, configured, signInWithGoogle } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: "",
      currency: "USD",
      numPeople: 2,
      names: ["", ""],
      eventName: "",
      eventDate: todayISO(),
      bankName: "",
      bankAccount: "",
      bankNotes: "",
    },
  });

  // Stable keys for name rows (rowIds[i] always matches names[i]).
  const [rowIds, setRowIds] = useState<string[]>(() => [nanoid(), nanoid()]);

  const names = form.watch("names") as string[];
  const amount = form.watch("amount") as string;
  const currency = form.watch("currency") as string;

  // Event-driven sync: keeps names/rowIds the same length as a newly chosen
  // count. Out-of-range or in-between values leave names untouched; schema
  // validation flags them on submit instead of clobbering typed names.
  const syncNamesToCount = (count: number) => {
    const current = form.getValues("names");
    if (count > current.length) {
      const add = count - current.length;
      form.setValue("names", [...current, ...Array<string>(add).fill("")], {
        shouldDirty: true,
        shouldTouch: true,
      });
      setRowIds((prev) => [...prev, ...Array.from({ length: add }, () => nanoid())]);
    } else if (count < current.length) {
      form.setValue("names", current.slice(0, count), { shouldDirty: true });
      setRowIds((prev) => prev.slice(0, count));
    }
  };

  const handleCountChange = (raw: string | number) => {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return;
    const count = Math.floor(n);
    if (count < 1 || count > MAX_PEOPLE) return;
    syncNamesToCount(count);
  };

  const handleRemovePerson = (index: number) => {
    const current = form.getValues("names");
    if (current.length <= 1) return;
    const next = current.filter((_, i) => i !== index);
    form.setValue("names", next, {
      shouldValidate: form.formState.isSubmitted,
      shouldDirty: true,
    });
    form.setValue("numPeople", next.length, { shouldDirty: true });
    setRowIds((prev) => prev.filter((_, i) => i !== index));
  };

  const preview = useMemo(() => {
    const total = Number(amount);
    if (!total || isNaN(total) || total <= 0) return [];
    const clean = names.map((n) => n.trim() || "—");
    return splitAmount(toCents(total), clean);
  }, [amount, names]);

  const parsedAmount = Number(amount) || 0;
  const perPersonPreview =
    parsedAmount > 0 && names.length > 0
      ? formatMoney(Math.round(toCents(parsedAmount) / names.length), currency)
      : null;

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[800px] px-6 py-10">
        <p className="text-sm text-[var(--text-muted)]">Loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-[800px] px-6 py-10">
        <Card className="p-6">
          <h1 className="text-lg font-bold">Sign in required</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            You need a Google account to generate a bill request.
          </p>
          <div className="mt-4">
            <Button onClick={() => void signInWithGoogle()} disabled={!configured}>
              Sign in with Google
            </Button>
          </div>
        </Card>
      </main>
    );
  }

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    try {
      const notes = (values.bankNotes ?? "").trim();
      const id = await createBill({
        ownerUid: user.uid,
        ownerEmail: user.email ?? "",
        amountTotal: Number(values.amount),
        currency: values.currency,
        eventName: values.eventName,
        eventDate: values.eventDate,
        names: values.names.map((n) => n.trim()),
        paymentMethod: "bank",
        bankInfo: {
          bankName: values.bankName.trim(),
          accountNumber: values.bankAccount.trim(),
          notes: notes ? notes : null,
        },
      });
      router.push(`/success/${id}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to create bill.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-[800px] px-6 pb-20 pt-10">
      <div className="mb-8">
        <h1 className="mb-1.5 text-[28px] font-extrabold tracking-[-0.5px]">
          Generate Bill Request
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-muted)]">
          Split the bill and notify those who owe you.
        </p>
        {perPersonPreview && (
          <div className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-[#C7D2FE] bg-[var(--primary-light)] px-4 py-1.5">
            <span className="text-[13px] font-semibold text-[var(--primary)]">
              {perPersonPreview} per person
            </span>
            <span className="text-[13px] text-[#818CF8]">·</span>
            <span className="text-[13px] text-[#818CF8]">
              {names.length} {names.length === 1 ? "person" : "people"}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <SectionCard
          icon={<Wallet className="h-[17px] w-[17px] text-[var(--primary)]" />}
          title="Bill Details"
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-5">
            <Field label="Amount paid *" error={form.formState.errors.amount?.message}>
              <Input inputMode="decimal" placeholder="e.g. 120.50" {...form.register("amount")} />
            </Field>
            <Field label="Currency *">
              <Select {...form.register("currency")}>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-5">
            <Field
              label={`Total number of people (max ${MAX_PEOPLE}) *`}
              error={form.formState.errors.numPeople?.message}
            >
              <Input
                type="number"
                min={1}
                max={MAX_PEOPLE}
                {...form.register("numPeople", {
                  valueAsNumber: true,
                  onChange: (e) => handleCountChange(e.target.value),
                })}
              />
            </Field>
            <Field label="Name of the Event *" error={form.formState.errors.eventName?.message}>
              <Input placeholder="e.g. Team dinner" {...form.register("eventName")} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-5">
            <Field label="Date of the Event *" error={form.formState.errors.eventDate?.message}>
              <Input type="date" {...form.register("eventDate")} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard
          icon={<Users className="h-[17px] w-[17px] text-[var(--primary)]" />}
          title="People"
          subtitle="Names are mandatory — they appear on the public bill page."
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-4">
            {names.map((_, i) => (
              <div key={rowIds[i] ?? i} className="relative">
                <Field
                  label={`Person ${i + 1} *`}
                  error={
                    (form.formState.errors.names?.[i]?.message as string | undefined) ??
                    (form.formState.errors.names?.message as string | undefined)
                  }
                >
                  <Input
                    placeholder={`Name of person ${i + 1}`}
                    {...form.register(`names.${i}`)}
                    className={names.length > 1 ? "pr-9" : undefined}
                  />
                </Field>
                {names.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemovePerson(i)}
                    aria-label={`Remove person ${i + 1}`}
                    title={`Remove person ${i + 1}`}
                    className="absolute bottom-2.5 right-2.5 rounded p-0.5 text-[var(--text-light)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {preview.length > 0 && (
            <p className="text-xs text-[var(--text-muted)]">
              Preview: {preview.map((p) => formatMoney(p.amountOwed, currency)).join(" · ")}
            </p>
          )}
        </SectionCard>

        <SectionCard
          icon={<Landmark className="h-[17px] w-[17px] text-[var(--primary)]" />}
          title="Payment Information"
          subtitle="Payers will see this on the bill page so they know where to transfer."
        >
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-x-5">
            <Field label="Bank Name *" error={form.formState.errors.bankName?.message}>
              <Input placeholder="e.g. DBS Bank" {...form.register("bankName")} />
            </Field>
            <Field
              label="Account Number *"
              hint="Digits only."
              error={form.formState.errors.bankAccount?.message}
            >
              <Input
                inputMode="numeric"
                placeholder="e.g. 1234567890"
                {...form.register("bankAccount")}
              />
            </Field>
          </div>
          <Field label="Notes (optional)" error={form.formState.errors.bankNotes?.message}>
            <Textarea
              rows={3}
              placeholder="e.g. PayNow to mobile, reference your name"
              {...form.register("bankNotes")}
            />
          </Field>
        </SectionCard>

        {submitError && <p className="text-sm text-[var(--danger)]">{submitError}</p>}

        <div className="no-print flex justify-end pt-1">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Generate Bill Request
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </main>
  );
}
