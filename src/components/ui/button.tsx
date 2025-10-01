import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const pressMotion =
  "relative overflow-hidden select-none transform-gpu will-change-transform transition-[transform,box-shadow,background,filter] duration-250 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.985] active:shadow-sm focus-visible:-translate-y-0.5";

const inkRipple =
  "after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:bg-black/10 after:opacity-0 after:scale-95 after:transition-all after:duration-200 active:after:opacity-100 active:after:scale-100";

const baseA11y =
  "outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 " +
    baseA11y +
    " " +
    pressMotion +
    " " +
    inkRipple,
  {
    variants: {
      variant: {
        default: "bg-marromEscuro text-white shadow-xs hover:bg-marromEscuro/90",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "bg-bege border text-marromEscuro shadow-xs hover:bg-bege/80",
        secondary: "border text-marromEscuro shadow-xs bg-white hover:bg-bege/40",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-lg px-6 has-[>svg]:px-4",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  glow?: boolean;
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  glow = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        glow && "hover:brightness-105 hover:saturate-110",
        className
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };
