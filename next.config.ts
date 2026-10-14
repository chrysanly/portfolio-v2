import type { NextConfig } from 'next';

/*
 * Herd serves portfolio-api.test with its own certificate authority. Node
 * trusts it only through NODE_EXTRA_CA_CERTS, set before Node starts — which
 * is why `dev`, `build` and `start` go through scripts/with-ca.mjs. TLS
 * verification is never turned off: without the CA, the content fetch fails
 * and says so.
 */
if (
  /\.test(\/|:|$)/.test(process.env.PORTFOLIO_API_URL ?? '') &&
  !process.env.NODE_EXTRA_CA_CERTS
) {
  console.warn(
    '[tls] PORTFOLIO_API_URL is a .test host but NODE_EXTRA_CA_CERTS is not set, so content fetches will fail certificate verification. Point it at the Herd CA in .env.local.',
  );
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  /*
   * next-mdx-remote ships pre-bundled against its own copy of the JSX
   * runtime. In a production build that copy and the app's agree, so every
   * project page renders; in dev they do not, and React throws "element
   * created with a production version of React but rendered in development"
   * followed by a 500 on /work/[slug] — every case study, unreachable, but
   * only on the machine of whoever is building the site.
   *
   * Transpiling the package makes it resolve React through the app's own
   * module graph, so there is one React again.
   */
  transpilePackages: ['next-mdx-remote'],
};

export default nextConfig;
