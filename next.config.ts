import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      { source: "/gerar-orcamento/:path*", destination: "/orcamento/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
