import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignora erros do ESLint no build de produção
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
