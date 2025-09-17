"use client"

import React from "react"
import { cn } from "@/lib/utils"
import { motion, type MotionProps } from "motion/react"

interface BigShinyButtonProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps>,
    MotionProps {
  className?: string
}

export const BigShinyButton = React.forwardRef<HTMLButtonElement, BigShinyButtonProps>(
  ({ className, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        className={cn(
          "relative cursor-pointer w-full h-20 sm:h-24 rounded-2xl px-8 font-semibold flex items-center justify-center gap-4",
          "text-2xl sm:text-3xl",
          "bg-white text-marromEscuro border-2 border-marromClaro",
          "shadow-md hover:shadow-lg hover:bg-bege transition-colors",
          className
        )}
        initial={{ ["--x" as any]: "100%", scale: 0.9 }}
        animate={{ ["--x" as any]: "-100%", scale: 1 }}
        whileHover={{ scale: 0.96 }}
        whileTap={{ scale: 0.94 }}
        transition={{
          ["--x" as any]: {
            repeat: Infinity,
            repeatType: "loop",
            ease: "linear",
            duration: 2
          },
          scale: {
            type: "spring",
            bounce: 0.35,
            duration: 0.4
          }
        }}
        {...props}
      >
        <span
          className="relative block tracking-wide"
          style={{
            maskImage:
              "linear-gradient(-75deg,var(--primary) calc(var(--x) + 20%),transparent calc(var(--x) + 30%),var(--primary) calc(var(--x) + 100%))",
          }}
        >
          Gerar orçamento
        </span>

        <span
          className="absolute inset-0 z-10 block rounded-[inherit] p-px pointer-events-none"
          style={{
            mask:
              "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
            WebkitMask:
              "linear-gradient(rgb(0,0,0), rgb(0,0,0)) content-box exclude,linear-gradient(rgb(0,0,0), rgb(0,0,0))",
            backgroundImage:
              "linear-gradient(-75deg,var(--primary)/10% calc(var(--x)+20%),var(--primary)/50% calc(var(--x)+25%),var(--primary)/10% calc(var(--x)+100%))",
          }}
        />
      </motion.button>
    )
  }
)

BigShinyButton.displayName = "BigShinyButton"
