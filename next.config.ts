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
  // Cabeceras de seguridad básicas (sin CSP completa). frame-ancestors 'none'
  // y X-Frame-Options DENY impiden que OTROS sitios embeban la web; los iframes
  // propios (srcdoc de plantillas/contratos, PDF firmado en Storage, Google
  // Maps) no se afectan: esas respuestas no salen de este servidor.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        ],
      },
    ]
  },
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
