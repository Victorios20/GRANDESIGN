import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: "/gerar-orcamento/:path*", destination: "/Orcamento/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
