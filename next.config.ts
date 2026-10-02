import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Alias de la ruta que usa el diseño nuevo; la canónica sigue siendo
  // /recuperar-contrasena (los correos ya enviados apuntan a ella).
  async redirects() {
    return [{ source: '/recuperar-password', destination: '/recuperar-contrasena', permanent: true }]
  },
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias['pdfjs-dist$'] = 'pdfjs-dist/build/pdf.min.mjs';
    return config;
  },
};

export default nextConfig;
