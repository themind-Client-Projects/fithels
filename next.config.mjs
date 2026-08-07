import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
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
