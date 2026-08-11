import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Optimisation was disabled, which made every one of the ~90 files using
    // next/image a no-op: product photos are 600-800KB originals and were sent
    // at full resolution to every device. Six images on the home page came to
    // 2.9MB. Enabling it gives per-viewport resizing plus AVIF/WebP.
    formats: ["image/avif", "image/webp"],
    // Widths actually used by the layouts, so the optimiser does not generate
    // and cache sizes nothing requests.
    deviceSizes: [360, 480, 640, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 200, 256, 384],
    // Uploaded product images live in Supabase storage; without this they would
    // throw once optimisation is on.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Banner records seeded with Unsplash URLs. These rendered fine while
      // optimisation was off (no host check); enabling it without allowing the
      // host would have silently broken them.
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        // pathname is explicit on purpose: omitting it does not match
        // everything on this Next version, and the optimiser then rejects the
        // URL with a bare "url parameter is not allowed".
        pathname: "/**",
      },
    ],
    // Optimised derivatives are immutable; keep them cached for a year.
    minimumCacheTTL: 31536000,
  },
  sassOptions: {
    quietDeps: true,
    silenceDeprecations: ["legacy-js-api"],
  },
  // Baseline security headers. Deliberately excludes Content-Security-Policy:
  // Bootstrap and the template's inline scripts would need a nonce/hash pass
  // first, and a wrong CSP silently breaks the storefront.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking protection — matters most on the checkout flow.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Stop browsers guessing types on user-uploaded product images.
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
