import { useMemo } from "react";
import { useMeasuredWidth } from "@/hooks/useMeasureAndNow";
import { cn } from "@/lib/utils";

/* Charts are drawn by hand in SVG from the app's own data — no chart
   library defaults. Rules held here: one hue per chart (the accent only
   on the main data element), 3-5 faint gridlines, no axis line, round
   integer ticks at or above the maximum, square bars, straight 2px
   lines, no markers, no legends for a single series. */

interface Point {
  label: string;
  value: number;
}

function niceMax(max: number): number {
  if (max <= 4) return 4;
  const steps = [5, 8, 10, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200, 250, 300, 400, 500];
  for (const s of steps) if (max <= s) return s;
  return Math.ceil(max / 100) * 100;
}

function useChart(points: Point[]): [React.RefObject<HTMLDivElement | null>, number, Point[]] {
  const [ref, width] = useMeasuredWidth<HTMLDivElement>();
  const data = useMemo(() => points, [points]);
  return [ref, width, data];
}

/* ---------------------------------------------------------------- */

export function BarsChart({
  points,
  height = 196,
  highlightIndex,
  className,
  valueSuffix = "",
  ariaLabel,
}: {
  points: Point[];
  height?: number;
  highlightIndex?: number;
  className?: string;
  valueSuffix?: string;
  ariaLabel?: string;
}) {
  const [ref, width, data] = useChart(points);
  const padL = 34;
  const padR = 8;
  const padT = 18;
  const padB = 22;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = 4;
  const w = Math.max(width, 240);
  const plotW = w - padL - padR;
  const plotH = height - padT - padB;
  const slot = plotW / Math.max(data.length, 1);
  const barW = Math.min(28, slot * 0.52);

  return (
    <div ref={ref} className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: "block" }}>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = Math.round((max / ticks) * i);
          const y = padT + plotH - (plotH * v) / max;
          return (
            <g key={i}>
              {i > 0 ? <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth="1" /> : null}
              <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize="11" fill="var(--chart-muted)">
                {v}
                {valueSuffix}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + slot * i + (slot - barW) / 2;
          const h = (plotH * d.value) / max;
          const isHi = highlightIndex === i;
          return (
            <g key={d.label + i}>
              <rect
                x={x}
                y={padT + plotH - h}
                width={barW}
                height={h}
                rx={3}
                fill={isHi ? "var(--accent)" : "var(--chart-ink)"}
                opacity={isHi ? 1 : d.value === 0 ? 0.14 : 0.82}
              />
              <text x={x + barW / 2} y={height - 6} textAnchor="middle" fontSize="11" fill="var(--chart-muted)">
                {d.label}
              </text>
              {d.value > 0 && data.length <= 8 ? (
                <text x={x + barW / 2} y={padT + plotH - h - 5} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--text)">
                  {d.value}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function LineChart({
  points,
  height = 170,
  className,
  ariaLabel,
}: {
  points: Point[];
  height?: number;
  className?: string;
  ariaLabel?: string;
}) {
  const [ref, width, data] = useChart(points);
  const padL = 34;
  const padR = 10;
  const padT = 14;
  const padB = 22;
  const max = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ticks = 3;
  const w = Math.max(width, 240);
  const plotW = w - padL - padR;
  const plotH = height - padT - padB;
  const xs = data.map((_, i) => padL + (plotW * i) / Math.max(data.length - 1, 1));
  const ys = data.map((d) => padT + plotH - (plotH * d.value) / max);
  const path = data.map((_, i) => `${i === 0 ? "M" : "L"} ${xs[i]} ${ys[i]}`).join(" ");

  return (
    <div ref={ref} className={cn("w-full", className)} role="img" aria-label={ariaLabel}>
      <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} style={{ display: "block" }}>
        {Array.from({ length: ticks + 1 }, (_, i) => {
          const v = Math.round((max / ticks) * i);
          const y = padT + plotH - (plotH * v) / max;
          return (
            <g key={i}>
              {i > 0 ? <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="var(--chart-grid)" strokeWidth="1" /> : null}
              <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize="11" fill="var(--chart-muted)">{v}</text>
            </g>
          );
        })}
        <path d={path} fill="none" stroke="var(--chart-ink)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.map((d, i) =>
          i === 0 || i === data.length - 1 ? (
            <text key={i} x={xs[i]} y={height - 6} textAnchor={i === 0 ? "start" : "end"} fontSize="11" fill="var(--chart-muted)">
              {d.label}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** A thin progress ring: 4px stroke, total in the middle, no slice labels. */
export function RingChart({
  pct,
  size = 108,
  stroke = 8,
  center,
  sub,
  className,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  center?: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={`Progress ${Math.round(p * 100)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--rule)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.2,0.7,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        {center}
        {sub ? <div className="text-[11.5px] text-muted">{sub}</div> : null}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Ranked horizontal bars — label over a thin ink bar with the value at its end. */
export function BarListChart({
  rows,
  className,
  formatValue = (v: number) => String(v),
}: {
  rows: { label: string; value: number }[];
  className?: string;
  formatValue?: (v: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={cn("flex flex-col gap-2.5", className)}>
      {rows.map((r, i) => {
        const top = i === 0 && r.value > 0;
        return (
          <div key={r.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[13px] text-ink">{r.label}</span>
              <span className={cn("num text-[13px]", top ? "font-medium text-ink" : "text-muted")}>{formatValue(r.value)}</span>
            </div>
            <div className="h-2 rounded-full bg-inset">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${Math.max(r.value === 0 ? 0 : 2, (r.value / max) * 100)}%`,
                  background: top ? "var(--accent)" : "var(--control)",
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- */

/** Progress track with both ends labelled and the fill at the true ratio. */
export function ProgressTrack({
  value,
  max,
  labelStart,
  labelEnd,
  className,
}: {
  value: number;
  max: number;
  labelStart: React.ReactNode;
  labelEnd: React.ReactNode;
  className?: string;
}) {
  const pct = max <= 0 ? (value > 0 ? 1 : 0) : Math.min(1, value / max);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between gap-2 text-[12px] text-muted">
        <span>{labelStart}</span>
        <span>{labelEnd}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-inset">
        <div className="h-2.5 rounded-full bg-accent" style={{ width: `${pct * 100}%`, transition: "width .5s cubic-bezier(.2,.7,.2,1)" }} />
      </div>
    </div>
  );
}
