/** @type {import('next').NextConfig} */
const nextConfig = { serverExternalPackages: ['exceljs'], distDir: process.env.NEXT_DIST || '.next' };
export default nextConfig;
