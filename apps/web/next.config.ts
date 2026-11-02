import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@agentgate/controller'],
  serverExternalPackages: ['better-sqlite3'],
  poweredByHeader: false,
};
export default config;
