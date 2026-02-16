import { cn } from "@/lib/cn";
import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center font-display font-semibold tracking-tight transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        gold: "bg-gold-500 text-navy-950 hover:bg-gold-400 btn-gold-glow rounded-full",
        outline:
          "border-2 border-white/20 text-white hover:border-white/40 hover:bg-white/5 rounded-full",
        "outline-dark":
          "border-2 border-navy-800 text-navy-900 hover:border-navy-900 hover:bg-navy-900 hover:text-white rounded-full",
        ghost: "text-slate-600 hover:text-navy-900 hover:bg-cream-100 rounded-lg",
        link: "text-gold-500 hover:text-gold-600 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-9 px-5 text-sm",
        md: "h-11 px-7 text-base",
        lg: "h-13 px-9 text-lg",
        xl: "h-15 px-11 text-lg",
      },
    },
    defaultVariants: {
      variant: "gold",
      size: "md",
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  href?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, href, children, ...props }, ref) => {
    if (href) {
      return (
        <a
          href={href}
          className={cn(buttonVariants({ variant, size, className }))}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
