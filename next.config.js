/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export',
  experimental: {
    serverActions: {}
  }
  ,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Add .node files to externals
      config.externals.push((context, request, callback) => {
        if (request.match(/\.node$/)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      });
    }
    return config;
  },
};

module.exports = nextConfig;
