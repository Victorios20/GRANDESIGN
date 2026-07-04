// next.config.ts
import type { NextConfig } from "next"

process.env.TZ = process.env.TZ || "America/Sao_Paulo"

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },

  // Garante que os assets de public/images (capa e logo usados na geração
  // do PDF de proposta) sejam incluídos no bundle de deploy serverless,
  // já que são lidos diretamente do filesystem via fs.readFileSync em
  // src/lib/pdf/PropostaServicoPDF.tsx (não passam pelo next/image).
  outputFileTracingIncludes: {
    "/api/proposta-servico/[id]/pdf": ["./public/images/**"],
  },

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
