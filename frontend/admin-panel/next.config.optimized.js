/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Experimental features for optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@heroicons/react', 'lodash-es'],
  },

  // Webpack optimization
  webpack: (config, { dev, isServer }) => {
    // Production optimizations
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              test: /[\\/]node_modules[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
            
            // Common chunk for shared components
            common: {
              name: 'common',
              minChunks: 2,
              priority: 10,
              reuseExistingChunk: true,
            },
            
            // React chunk
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            
            // UI libraries chunk
            ui: {
              name: 'ui',
              test: /[\\/]node_modules[\\/](@heroicons|@headlessui)[\\/]/,
              priority: 25,
            },
          },
        },
        minimize: true,
      };

      // Tree shaking optimization
      config.optimization.usedExports = true;
      config.optimization.providedExports = true;
    }

    // Reduce bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      // Replace heavy lodash with lodash-es
      'lodash': 'lodash-es',
    };

    return config;
  },

  // Compression
  compress: true,

  // Production source maps (smaller)
  productionBrowserSourceMaps: false,

  // Output optimization
  output: 'standalone',

  // Headers for caching
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [];
  },

  // Rewrites
  async rewrites() {
    return [];
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },

  // Disable powered by header
  poweredByHeader: false,

  // Enable GZIP compression
  compress: true,

  // Optimize fonts
  optimizeFonts: true,

  // Modularize imports
  modularizeImports: {
    '@heroicons/react/24/outline': {
      transform: '@heroicons/react/24/outline/{{member}}',
    },
    '@heroicons/react/24/solid': {
      transform: '@heroicons/react/24/solid/{{member}}',
    },
    'lodash': {
      transform: 'lodash/{{member}}',
    },
  },
};

module.exports = nextConfig;
