import type { NextConfig } from "next";

// Baseline security headers (Vercel already sends HSTS). No CSP yet: a strict one
// needs nonces for Next's inline scripts and the analytics script.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // The old address keeps working, but sends visitors and search engines to the new one.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "getagentbar.vercel.app" }],
        destination: "https://goatbar.melbora.com/:path*",
        permanent: true,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
