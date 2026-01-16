import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/app/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation active:scale-[0.97] hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-lg hover:shadow-primary/20 active:shadow-sm active:bg-primary/95 active:translate-y-0",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20 active:shadow-sm active:bg-destructive/95 active:translate-y-0",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/30 hover:shadow-md active:shadow-sm active:bg-accent/80 active:translate-y-0",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-lg hover:shadow-secondary/20 active:shadow-sm active:bg-secondary/90 active:translate-y-0",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:shadow-sm active:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80 active:text-primary/70 hover:translate-y-0",
      },
      size: {
        default: "min-h-11 px-5 py-2.5 md:min-h-10",
        sm: "min-h-9 rounded-md px-3.5 text-xs md:min-h-8",
        lg: "min-h-12 rounded-lg px-8 text-base md:min-h-11",
        icon: "h-11 w-11 md:h-10 md:w-10 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  // todo: fix
  variant: "default" | "secondary" | "destructive" | "outline";
  size: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2
              className="size-4 animate-spin"
              data-testid="button-loading-spinner"
            />
            <span className="opacity-80">{children}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
