import { useState } from "react";
import { Check } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  checked: boolean;
  onToggle: () => void;
  title: string;
  size?: number;
  className?: string;
}

const BURST = Array.from({ length: 8 }, (_, i) => i);

/** The completion checkbox. Completing fires a small, restrained burst of
 *  lime particles — disabled under prefers-reduced-motion. */
export function CompleteCheckbox({ checked, onToggle, title, size = 26, className }: Props) {
  const [justChecked, setJustChecked] = useState(false);
  const reduced = useReducedMotion();

  const toggle = () => {
    if (!checked) {
      setJustChecked(true);
      window.setTimeout(() => setJustChecked(false), 700);
    }
    onToggle();
  };

  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-label={checked ? `Mark "${title}" as not done` : `Complete "${title}"`}
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full border transition-[background-color,border-color] duration-150",
          checked ? "border-primary bg-primary text-primary-ink" : "border-control bg-transparent hover:border-ink/50",
        )}
      >
        <motion.span
          className="absolute"
          initial={false}
          animate={checked ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.18 }}
        >
          <Check size={size * 0.55} strokeWidth={2.5} />
        </motion.span>
      </button>
      {justChecked && !reduced ? (
        <span className="pointer-events-none absolute inset-0" aria-hidden>
          {BURST.map((i) => {
            const angle = (i / BURST.length) * Math.PI * 2;
            return (
              <motion.span
                key={i}
                className="absolute left-1/2 top-1/2 rounded-[2px]"
                style={{ width: 5, height: 5, background: i % 3 === 0 ? "var(--accent)" : "var(--text)" }}
                initial={{ x: -2.5, y: -2.5, scale: 0.4, opacity: 0.9 }}
                animate={{
                  x: Math.cos(angle) * (16 + (i % 2) * 6) - 2.5,
                  y: Math.sin(angle) * (16 + (i % 2) * 6) - 2.5,
                  scale: 0.2,
                  opacity: 0,
                }}
                transition={{ duration: 0.62, ease: [0.15, 0.6, 0.3, 1] }}
              />
            );
          })}
        </span>
      ) : null}
    </span>
  );
}

/** Gentle radial ping used for level-ups — one moment, honest, quiet. */
export function CelebrationRing({ show }: { show: boolean }) {
  const reduced = useReducedMotion();
  return (
    <AnimatePresence>
      {show && !reduced ? (
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ border: "2px solid var(--accent)" }}
          initial={{ scale: 0.7, opacity: 0.9 }}
          animate={{ scale: 1.9, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          aria-hidden
        />
      ) : null}
    </AnimatePresence>
  );
}
