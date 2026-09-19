import type { Metadata } from 'next';
import { Bodoni_Moda, Public_Sans } from 'next/font/google';
import { site } from '@/content/site';
import { CursorDot } from '@/components/ui/CursorDot';
import { Splash } from '@/components/ui/Splash';
import { SplashDismiss } from '@/components/ui/SplashDismiss';
import './globals.css';

const bodoni = Bodoni_Moda({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-bodoni',
  display: 'swap',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-public-sans',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://chrys.dev';

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
    <html lang="en" className={`${bodoni.variable} ${publicSans.variable}`}>
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
            __html: `try{if('scrollRestoration' in history)history.scrollRestoration='manual';var d=document.documentElement.dataset;if(!matchMedia('(prefers-reduced-motion: reduce)').matches){d.motion='on';d.heroHandoff='off'}var t=null;try{t=localStorage.getItem('theme')}catch(e){}if(!t)t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.theme=t}catch(e){}`,
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
        <CursorDot />
      </body>
    </html>
  );
}
