import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiUrl = process.env.API_URL ?? 'http://localhost:4000';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../'),
  },
  // The browser only ever talks to this origin. Keeps the session cookie
  // first-party and means no CORS config on the API.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${apiUrl}/:path*` }];
  },
};

export default nextConfig;
