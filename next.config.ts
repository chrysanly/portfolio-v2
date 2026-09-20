import type { NextConfig } from 'next';

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
