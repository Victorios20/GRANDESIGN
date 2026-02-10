// src/app/home/_components/QuickActions.tsx
"use client"

import Link from "next/link"
import type { ElementType } from "react"
import { ArrowRight } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

export type QuickActionItem = {
  label: string
  href: string
  icon: ElementType
  description: string
}

type Props = {
  title?: string
  actions: QuickActionItem[]
}

export default function QuickActions({ title = "Ações Rápidas", actions }: Props) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-marromEscuro mb-4">{title}</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action) => (
          <Link key={action.label} href={action.href} className="block">
            <Card className="bg-white border border-cinza shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group hover:-translate-y-1">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bege flex items-center justify-center group-hover:scale-105 transition-transform">
                  <action.icon className="w-6 h-6 text-marromEscuro" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-marromEscuro truncate">{action.label}</p>
                  <p className="text-sm text-[#8A8A8A] truncate">{action.description}</p>
                </div>

                <ArrowRight className="w-5 h-5 text-[#8A8A8A] group-hover:translate-x-1 transition-all" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
