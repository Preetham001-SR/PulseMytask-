import * as SwitchPrimitive from "@radix-ui/react-switch";
import * as SliderPrimitive from "@radix-ui/react-slider";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-control bg-inset transition-colors data-[state=checked]:border-transparent data-[state=checked]:bg-primary",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block h-3.5 w-3.5 translate-x-[2px] rounded-full bg-ink shadow-sm transition-transform data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-primary-ink" />
    </SwitchPrimitive.Root>
  );
}

export function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root className={cn("relative flex w-full touch-none items-center select-none", className)} {...props}>
      <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-control">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-accent-deep" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-accent-deep bg-surface transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-accent-deep" />
    </SliderPrimitive.Root>
  );
}

/** A compact segmented control for small string enums. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex rounded-xl border border-control bg-inset p-0.5", className)} role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-7 rounded-[10px] px-3 text-[12.5px] transition-colors",
            value === o.value ? "bg-surface font-medium text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
          style={undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Tooltip({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            sideOffset={6}
            className="elevated z-60 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] text-ground"
          >
            {label}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
