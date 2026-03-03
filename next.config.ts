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
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    // pdfjs-dist's default build/pdf.mjs is a pre-bundled webpack file whose internal
    // __webpack_require__ runtime conflicts with Next.js webpack (eval-* devtools).
    // The .min.mjs build is a native ES module without an internal webpack runtime.
    // Use $ for exact match so 'pdfjs-dist/build/pdf.worker.min.mjs' is unaffected.
    config.resolve.alias['pdfjs-dist$'] = 'pdfjs-dist/build/pdf.min.mjs';
    return config;
  },
};

export default nextConfig;
