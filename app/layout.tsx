import type { Metadata } from 'next';
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google';
import { site } from '@/content/site';
import { AccentPicker } from '@/components/ui/AccentPicker';
import { CursorDot } from '@/components/ui/CursorDot';
import { RouteVeil } from '@/components/ui/RouteVeil';
import { ScrollMemory } from '@/components/ui/ScrollMemory';
import { Splash } from '@/components/ui/Splash';
import { SplashDismiss } from '@/components/ui/SplashDismiss';
import './globals.css';

/*
 * Three families, all self-hosted by next/font — no <link> to Google, no
 * render-blocking request, and a size-adjusted local fallback per family so
 * the swap does not shift layout.
 *
 * Only the variable names are declared here. Which element gets which family
 * is decided once in globals.css, where `--font-display`, `--font-body` and
 * `--font-mono` point at these — see the `@theme` block there.
 */
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

// `||`, not `??`: `.env.example` ships this key present but blank, and a
// blank string is not nullish, so `??` let it through and `new URL('')`
// crashed every single page with a 500 — in dev, and it would have in
// production too, for anyone who copied the example file without filling
// this in.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chrys.dev';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — ${site.role}`,
    template: `${site.name} — %s`,
  },
  description: `${site.role} in ${site.location}, building ERP and automation systems.`,
  openGraph: {
    type: 'website',
    siteName: site.name,
    locale: 'en_AE',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}
      // The blocking script below sets data-motion, data-hero-handoff and
      // data-theme on this element before React hydrates — deliberately, so
      // the first paint is already correct instead of flashing the wrong
      // state and then correcting it (see the script's own comment). React
      // has no way to know that mismatch is intentional, so without this it
      // logs a hydration-mismatch error on every single load.
      suppressHydrationWarning
    >
      <head>
        {/*
          Decides motion mode and theme before first paint. The hero and the
          resolved static intro are both in the server HTML; CSS shows one or
          the other off this attribute. Doing it in an effect instead would swap
          them after paint and shift the page by a pinned section — measured at
          CLS 1.49. Absent (no JS, or reduced motion) is the resolved state.

          The theme is read from localStorage, falling back to the operating
          system preference, so the first paint is already correct and there is
          no flash of the wrong palette.

          Scroll restoration is switched off here rather than on load. The
          browser restores the old offset before anything of ours runs, and a
          reload half way down a pinned hero drops you into the middle of a
          scroll sequence with no context. Setting it to 'manual' in the head
          means the restore never happens in the first place, so there is
          nothing to undo and nothing to see being undone.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if('scrollRestoration' in history)history.scrollRestoration='manual';var r=document.documentElement,d=r.dataset;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.motion='on';d.heroHandoff='off'}var t=null,a=null,x=null;try{t=localStorage.getItem('theme');a=localStorage.getItem('accent');x=localStorage.getItem('texture')}catch(e){}if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.theme=t;if(a)r.style.setProperty('--color-accent',a);if(x==='off')d.texture='off'}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Splash />
        <SplashDismiss />
        <a className="skip" href="#content">
          Skip to content
        </a>
        {children}
        <RouteVeil />
        <ScrollMemory />
        <AccentPicker />
        <CursorDot />
      </body>
    </html>
  );
}
