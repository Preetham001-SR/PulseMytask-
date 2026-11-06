import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[14px] font-medium transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-ink hover:opacity-90",
        secondary: "border border-control bg-surface text-ink hover:bg-raised",
        ghost: "text-muted hover:bg-active hover:text-ink",
        danger: "text-negative hover:bg-pill-negative-bg",
        accent: "bg-accent text-accent-ink hover:brightness-95",
      },
      size: {
        sm: "h-7 px-3 text-[13px]",
        md: "h-9 px-4",
        lg: "h-10 px-5 text-[15px]",
        icon: "h-9 w-9 p-0",
        iconSm: "h-7 w-7 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant, size, type = "button", ...props }, ref) => (
  <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = "Button";
