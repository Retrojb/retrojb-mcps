/**
 * The docs site is fully static, so it is exported to `out/` and served from a
 * static host (Cloudflare Pages). Nothing in `app/` uses a server-only feature,
 * and `next build` fails if something starts to.
 *
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  output: "export",
  // The image optimiser needs a server. `next/image` is not used today; this
  // keeps it from breaking the export if it is added.
  images: { unoptimized: true },
};
export default nextConfig;
