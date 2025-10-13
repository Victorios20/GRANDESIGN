import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: { ignoreDuringBuilds: true },

  async redirects() {
    return [
      // legados com maiúscula -> minúscula
      { source: "/Orcamento", destination: "/orcamento", permanent: true },
      { source: "/Orcamento/:path*", destination: "/orcamento/:path*", permanent: true },

      // se existia rota antiga "gerar-orcamento" -> nova
      { source: "/gerar-orcamento", destination: "/orcamento", permanent: true },
      { source: "/gerar-orcamento/:path*", destination: "/orcamento/:path*", permanent: true },
    ];
  },

  async rewrites() {
    return {
      beforeFiles: [
        // API legada com maiúscula -> minúscula (mantém URL do cliente, atende na rota nova)
        { source: "/api/Orcamentos", destination: "/api/orcamentos" },
        { source: "/api/Orcamentos/:path*", destination: "/api/orcamentos/:path*" },
      ],
    };
  },
};

export default nextConfig;
