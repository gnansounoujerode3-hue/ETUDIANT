"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Button (style shadcn/ui)
// ---------------------------------------------------------------------------
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/60 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-violet to-cyan text-white shadow-[0_8px_30px_-6px_rgba(139,92,246,0.55)] hover:shadow-[0_10px_40px_-4px_rgba(139,92,246,0.7)] hover:brightness-110",
        outline:
          "border border-white/12 bg-white/[0.03] text-zinc-100 hover:bg-white/[0.07] hover:border-white/20",
        ghost: "text-zinc-300 hover:bg-white/[0.06] hover:text-white",
        destructive: "bg-rose/15 text-rose border border-rose/25 hover:bg-rose/25",
        soft: "bg-violet/15 text-violet-200 border border-violet/25 hover:bg-violet/25",
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-13 px-8 text-base",
        icon: "h-10 w-10",
        xl: "h-16 px-10 text-lg",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
  )
);
Button.displayName = "Button";

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "glass rounded-3xl text-zinc-100 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]",
        className
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-violet/30 bg-violet/12 text-violet-200",
        cyan: "border-cyan/30 bg-cyan/10 text-cyan-200",
        emerald: "border-emerald/30 bg-emerald/10 text-emerald-300",
        amber: "border-amber/30 bg-amber/10 text-amber-200",
        rose: "border-rose/30 bg-rose/10 text-rose-300",
        neutral: "border-white/12 bg-white/[0.05] text-zinc-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

// ---------------------------------------------------------------------------
// Input / Textarea / Label
// ---------------------------------------------------------------------------
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 focus-visible:border-violet/40 transition-colors",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-32 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 focus-visible:border-violet/40 transition-colors",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-xs font-semibold uppercase tracking-widest text-zinc-400", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Progress (barre de maîtrise)
// ---------------------------------------------------------------------------
export function Progress({
  value,
  className,
  barClassName,
}: {
  value: number; // 0..100
  className?: string;
  barClassName?: string;
}) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-white/[0.07]", className)}>
      <div
        className={cn(
          "h-full rounded-full bg-gradient-to-r from-violet to-cyan transition-all duration-700",
          barClassName
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Spinner
// ---------------------------------------------------------------------------
export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-white/15 border-t-violet",
        className
      )}
      role="status"
      aria-label="loading"
    />
  );
}

// ---------------------------------------------------------------------------
// Onde sonore (barres animées)
// ---------------------------------------------------------------------------
export function SoundWave({
  bars = 7,
  active = true,
  className,
  height = 44,
}: {
  bars?: number;
  active?: boolean;
  className?: string;
  height?: number;
}) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1.5", className)}
      style={{ height }}
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="wave-bar"
          style={{
            animationDelay: `${(i % bars) * 0.09}s`,
            animationDuration: `${0.9 + ((i * 7) % 5) * 0.12}s`,
            animationPlayState: active ? "running" : "paused",
            opacity: active ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}
