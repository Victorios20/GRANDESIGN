/* ─────────────────────────────────────────
   src/components/ui/card.tsx
───────────────────────────────────────────*/
import * as React from "react"
import { cn } from "@/lib/utils"

type CardProps = React.ComponentProps<"div"> & {
  elevation?: 1 | 2 | 3 | 4
  interactive?: boolean
  noShadow?: boolean
}

const ELEVATION_MAP: Record<NonNullable<CardProps["elevation"]>, string> = {
  1: "shadow-sm",
  2: "shadow-lg",
  3: "shadow-xl",
  4: "shadow-2xl",
}

function Card({
  className,
  elevation = 3,
  interactive = false,
  noShadow,
  ...props
}: CardProps) {
  const shadow = noShadow ? "" : ELEVATION_MAP[elevation]
  const hover = interactive && !noShadow ? "transition-shadow hover:shadow-2xl" : ""
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-2xl border py-6",
        shadow,
        hover,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold text-marromEscuro", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-marromClaro text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
