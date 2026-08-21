"use client";

import React from "react";

export function Button({
  children,
  onClick,
  variant = "default",
  size = "md",
  disabled,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  variant?: "default" | "primary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md";
  disabled?: boolean;
  title?: string;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-md font-medium transition-colors select-none whitespace-nowrap " +
    (size === "sm" ? "text-xs px-2 py-1 " : "text-sm px-3 py-1.5 ");
  const styles =
    variant === "primary"
      ? "bg-zinc-50 text-zinc-950 hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400"
      : variant === "danger"
      ? "text-red-400 hover:bg-red-950/40 border border-transparent"
      : variant === "outline"
      ? "border border-edge2 bg-transparent text-zinc-300 hover:border-zinc-500 hover:text-zinc-100"
      : variant === "ghost"
      ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60"
      : "bg-panel2 text-zinc-200 border border-edge2 hover:border-zinc-500";
  return (
    <button className={base + styles + " " + className} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  className = "",
  onKeyDown,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  autoFocus?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      onKeyDown={onKeyDown}
      autoFocus={autoFocus}
      className={
        "w-full rounded-md border border-edge2 bg-panel2 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 " +
        className
      }
    />
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={
        "w-full resize-y rounded-md border border-edge2 bg-panel2 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-zinc-500 " +
        className
      }
    />
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={"w-full rounded-xl border border-edge2 bg-panel p-5 shadow-2xl " + width}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toggle({ on, onChange, size = "md" }: { on: boolean; onChange: (v: boolean) => void; size?: "sm" | "md" }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      title={on ? "Disable" : "Enable"}
      className={
        "relative rounded-full transition-colors " +
        (size === "sm" ? "h-4 w-7 " : "h-5 w-9 ") +
        (on ? "bg-zinc-100" : "bg-zinc-700")
      }
    >
      <span
        className={
          "absolute top-0.5 rounded-full transition-all " +
          (size === "sm" ? "h-3 w-3 " : "h-4 w-4 ") +
          (on
            ? (size === "sm" ? "left-3.5 " : "left-4.5 ") + "bg-zinc-900"
            : "left-0.5 bg-zinc-400")
        }
      />
    </button>
  );
}

export function Badge({ children, tone = "zinc" }: { children: React.ReactNode; tone?: "zinc" | "green" | "amber" | "red" }) {
  const tones: Record<string, string> = {
    zinc: "border-edge2 bg-panel2 text-zinc-400",
    green: "border-emerald-900 bg-emerald-950/50 text-emerald-400",
    amber: "border-amber-900 bg-amber-950/50 text-amber-400",
    red: "border-red-900 bg-red-950/50 text-red-400",
  };
  return (
    <span className={"inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium " + tones[tone]}>
      {children}
    </span>
  );
}

export function Logo({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect x="1" y="1" width="30" height="30" rx="7" stroke="#fafafa" strokeWidth="2" />
      <circle cx="10" cy="11" r="3" fill="#fafafa" />
      <circle cx="22" cy="11" r="3" fill="#71717a" />
      <circle cx="16" cy="23" r="3" fill="#fafafa" />
      <path d="M10 14v3l6 3 6-3v-3" stroke="#71717a" strokeWidth="1.6" fill="none" />
    </svg>
  );
}
