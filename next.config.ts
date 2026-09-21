import type { NextConfig } from 'next';

/*
 * Local development only: trust Herd's self-signed certificate.
 *
 * The site now reads content from the Laravel API at
 * https://portfolio-api.test, which Herd serves with a certificate Node will
 * not accept — so without this every content read falls back to the snapshot
 * and nothing saved in the admin ever appears.
 *
 * Guarded on NODE_ENV so it cannot follow the code into production, and set
 * here rather than asked of whoever runs `npm run dev`, because a step people
 * have to remember is a step that gets forgotten.
 *
 * Skipped when NODE_EXTRA_CA_CERTS is set, which is the better mechanism and
 * what `.env` uses: trusting Herd's own authority keeps verification ON for
 * every other connection, where this turns it off for all of them.
 *
 * That variable only works if it is set **before Node starts**, which is why
 * `npm run dev` goes through scripts/with-ca.mjs. Setting it in `.env` alone
 * puts it in `process.env` too late to matter — and, worse, makes the check
 * above skip this fallback, so TLS fails either way. That combination is
 * exactly what produced `API unreachable: fetch failed` on every request while
 * the same CA worked fine for the content pull.
 */
if (process.env.NODE_ENV !== 'production' && !process.env.NODE_EXTRA_CA_CERTS) {
  console.warn(
    '[tls] No NODE_EXTRA_CA_CERTS — disabling certificate verification for this dev process.',
  );
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
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
