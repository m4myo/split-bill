import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: (string | undefined | false | null)[]) {
  return twMerge(clsx(...inputs));
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "dangerOutline" | "ghost";
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[10px] px-[22px] py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)]",
        variant === "secondary" && "border-[1.5px] border-[var(--border)] bg-white px-4 py-2 font-semibold text-[13px] text-[var(--foreground)] hover:bg-[#FAFAFA]",
        variant === "danger" && "bg-[var(--danger)] text-white hover:brightness-95",
        variant === "dangerOutline" && "border-[1.5px] border-[#FCA5A5] bg-white px-4 py-2 font-semibold text-[13px] text-[var(--danger)] hover:bg-[#FEF2F2]",
        variant === "ghost" && "text-[var(--text-muted)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)]",
        className
      )}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-white",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionCard({
  icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-baseline gap-2.5 border-b border-[var(--border)] px-6 py-4">
        <span className="text-[17px] leading-none">{icon}</span>
        <div>
          <h2 className="m-0 text-[15px] font-bold">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">{subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-col gap-4 px-6 py-5">{children}</div>
    </Card>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-[var(--text-light)]">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-[var(--danger)]">{error}</span>}
    </label>
  );
}

const inputClasses =
  "w-full rounded-lg border-[1.5px] border-[var(--border)] bg-[#FAFAFA] px-3 py-[9px] text-sm text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)] focus:bg-white";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClasses, className)} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        inputClasses,
        "cursor-pointer appearance-none bg-no-repeat pr-8",
        className
      )}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%236B6890' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' fill='none'/%3E%3C/svg%3E")`,
        backgroundPosition: "right 12px center",
      }}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClasses, "leading-relaxed", className)} />;
}

export function Badge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "red" | "muted" | "primary";
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]",
        tone === "green" && "bg-[#D1FAE5] text-[#059669]",
        tone === "amber" && "bg-[#FEF3C7] text-[#D97706]",
        tone === "red" && "bg-[#FEE2E2] text-[#DC2626]",
        tone === "muted" && "bg-[#F0EFFE] text-[var(--text-muted)]",
        tone === "primary" && "bg-[var(--primary-light)] text-[var(--primary)]"
      )}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ percent, complete }: { percent: number; complete: boolean }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-[#F0EFFE]">
      <div
        className={cn("h-full rounded-full transition-all", complete ? "bg-[var(--success)]" : "bg-[var(--primary)]")}
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export function PersonChip({
  name,
  paid,
  disabled,
  onClick,
}: {
  name: string;
  paid: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? undefined : paid ? "Mark as unpaid" : "Mark as paid"}
      className={cn(
        "flex items-center gap-1.5 rounded-full border-[1.5px] px-3 py-[5px] text-[13px] font-medium transition-all",
        paid
          ? "border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46]"
          : "border-[var(--border)] bg-[#FAFAFA] text-[var(--text-muted)]",
        !disabled && "cursor-pointer hover:brightness-[0.98]"
      )}
    >
      <span
        className={cn(
          "h-2 w-2 shrink-0 rounded-full",
          paid ? "bg-[var(--success)]" : "bg-[#D1D5DB]"
        )}
      />
      {name}
    </button>
  );
}

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2">
      <span
        className="flex items-center justify-center bg-[var(--primary)]"
        style={{ width: size, height: size, borderRadius: size / 4 }}
      >
        <svg width={size * 0.57} height={size * 0.57} viewBox="0 0 16 16" fill="none" aria-hidden>
          <rect x="2" y="2" width="5" height="5" rx="1" fill="white" opacity="0.9" />
          <rect x="9" y="2" width="5" height="5" rx="1" fill="white" opacity="0.6" />
          <rect x="2" y="9" width="5" height="5" rx="1" fill="white" opacity="0.6" />
          <rect x="9" y="9" width="5" height="5" rx="1" fill="white" opacity="0.9" />
        </svg>
      </span>
      <span className="text-base font-extrabold tracking-[-0.3px]">SplitBill</span>
    </span>
  );
}
