import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-7", className)} aria-hidden>
      <defs>
        <linearGradient id="voxa-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect x="13" y="5" width="6" height="13" rx="3" fill="url(#voxa-g)" />
      <path
        d="M8.5 15.5v-1H11v1a5 5 0 0 0 10 0v-1h2.5v1a7.5 7.5 0 0 1-15 0z"
        fill="url(#voxa-g)"
      />
      <rect x="14.6" y="23.5" width="2.8" height="4" rx="1.4" fill="url(#voxa-g)" opacity="0.85" />
    </svg>
  );
}

export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {withWordmark && (
        <span className="text-lg font-extrabold tracking-tight text-white">
          Voxa<span className="text-gradient">.</span>
        </span>
      )}
    </span>
  );
}
