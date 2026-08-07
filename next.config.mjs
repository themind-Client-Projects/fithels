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
};

export default withNextIntl(nextConfig);
