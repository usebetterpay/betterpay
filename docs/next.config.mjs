import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'ts', 'tsx', 'md', 'mdx'],
  // Static export for Cloudflare Pages
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ['@betterpay/ui'],
};

export default withMDX(nextConfig);
