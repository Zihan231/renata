/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['exceljs'],
  distDir: process.env.NEXT_DIST || '.next',
  // Set by `npm run package:win`: a self-contained server bundle for the offline Windows build.
  ...(process.env.NEXT_STANDALONE ? { output: 'standalone' } : {}),
};
export default nextConfig;
