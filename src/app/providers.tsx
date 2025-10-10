"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"

export default function Providers({
  children,
  session,
}: {
  children: ReactNode
  session?: any // se quiser hidratar a sessão via getServerSession depois
}) {
  return <SessionProvider session={session}>{children}</SessionProvider>
}
