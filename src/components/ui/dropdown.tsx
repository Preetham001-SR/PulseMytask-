import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

export function DropdownMenuContent({ className, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={6}
        align="start"
        className={cn("elevated z-50 min-w-[190px] rounded-xl border border-edge bg-surface p-1", className)}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function DropdownMenuItem({ className, destructive, children, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "flex cursor-default items-center gap-2 rounded-lg px-3 py-2 text-[13.5px] outline-none data-[highlighted]:bg-active",
        destructive ? "text-negative" : "text-ink",
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}

export function DropdownMenuSeparator() {
  return <DropdownMenuPrimitive.Separator className="my-1 h-px bg-rule" />;
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <DropdownMenuPrimitive.Label className="px-3 py-1.5 text-[12px] text-muted">{children}</DropdownMenuPrimitive.Label>;
}
