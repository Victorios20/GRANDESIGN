// next.config.ts
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },

  // async redirects() {
  //   return [
  //     { source: "/Orcamento", destination: "/orcamento", permanent: true },
  //     { source: "/Orcamento/:path*", destination: "/orcamento/:path*", permanent: true },

  //     { source: "/gerar-orcamento", destination: "/orcamento", permanent: true },
  //     { source: "/gerar-orcamento/:path*", destination: "/orcamento/:path*", permanent: true },
  //   ]
  // },
}

export default nextConfig
