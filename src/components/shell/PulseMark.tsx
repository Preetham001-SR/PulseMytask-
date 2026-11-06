import { cn } from "@/lib/utils";

/** PULSE's own mark — a lime pulse line inside a deep forest tile, drawn
 *  for this product (not a generic letter box). */
export function PulseMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className={cn("shrink-0", className)}>
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <path
        d="M6 17.5h5.1l2.3-6.6 3.9 11.7 3-7.7 2 2.9H26"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
