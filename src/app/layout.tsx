import "./globals.css"
import "../styles/cores.css"
import "../styles/brand.css"

import type { Metadata } from "next"
import { getServerSession } from "next-auth"
import { Geist_Mono, Inter } from "next/font/google"

import Providers from "./providers"
import { authOptions } from "@/lib/auth"

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Grandesign",
  description: "Sistema de orcamentos para moveis planejados",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers session={session}>{children}</Providers>
      </body>
    </html>
  )
}
