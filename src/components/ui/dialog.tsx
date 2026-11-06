import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  title,
  description,
  wide,
  ...props
}: Omit<ComponentPropsWithoutRef<typeof DialogPrimitive.Content>, "title"> & { title: ReactNode; description?: ReactNode; wide?: boolean }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/25 data-[state=open]:animate-in" />
      <DialogPrimitive.Content
        className={cn(
          "elevated fixed left-1/2 top-[7vh] z-50 flex w-[calc(100vw-32px)] -translate-x-1/2 flex-col rounded-2xl border border-edge bg-surface outline-none",
          "max-h-[86vh]",
          wide ? "max-w-[720px]" : "max-w-[560px]",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-2">
          <div>
            <DialogPrimitive.Title className="text-[18px] font-semibold tracking-[-0.01em]">{title}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] text-muted">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close
            aria-label="Close"
            className="rounded-full p-1.5 text-muted transition-colors hover:bg-active hover:text-ink"
          >
            <X size={16} strokeWidth={1.75} />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex items-center justify-end gap-2 px-6 pb-5 pt-2", className)} {...props} />
);

export const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("thin-scroll flex flex-col gap-4 overflow-y-auto px-6 py-4", className)} {...props} />
);

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-xl border border-control bg-field px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-faint focus:border-accent-deep disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[72px] w-full resize-y rounded-xl border border-control bg-field px-3 py-2 text-[14px] leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent-deep",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("text-[13px] font-medium text-ink", className)} {...props} />;
}
