import type { NextConfig } from "next";
// Private lab: keep every page and API out of search indexes.
const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() { return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]; },
};
export default nextConfig;
