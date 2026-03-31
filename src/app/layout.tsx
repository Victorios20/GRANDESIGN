// src/app/layout.tsx
import "./globals.css";
import "../styles/cores.css";
import "../styles/brand.css";

import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Grandesign",
  description: "Sistema de orçamentos para móveis planejados",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
