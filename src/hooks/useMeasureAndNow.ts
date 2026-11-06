import { useMemo, useRef, useState, useEffect } from "react";

/** Measures an element's rendered width (ResizeObserver). */
export function useMeasuredWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** A ticking clock: re-renders every `intervalMs`. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  const ref = useRef(intervalMs);
  ref.current = intervalMs;
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ref.current);
    return () => window.clearInterval(id);
  }, []);
  return useMemo(() => now, [now]);

}
