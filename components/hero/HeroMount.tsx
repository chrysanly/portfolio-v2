'use client';

import { useEffect, useRef } from 'react';
import { MastheadHero } from './MastheadHero';

/**
 * Wires the hero to the server-rendered header logo, which is its destination.
 *
 * The hero's markup is server-rendered, exactly as docs/hero-scroll-template.html
 * does it, and `data-motion` is set by a blocking script in the document head
 * before first paint. Both matter for CLS: if the static intro were swapped for
 * the hero after hydration, the whole page would shift by the height of a 200vh
 * pinned section. Measured at CLS 1.49 when the hero mounted client-side only.
 *
 * With JavaScript off, or reduced motion set, `data-motion` is never set: CSS
 * keeps `.hero` hidden and the resolved static intro is what the visitor gets.
 */
export function HeroMount() {
  const logoRef = useRef<HTMLElement | null>(null);

  // Resolved during render, not in an effect: a child's layout effect runs
  // before its parent's, so an effect here would leave the hero's first
  // measure() with a null destination. Reading the DOM is idempotent.
  if (typeof document !== 'undefined' && !logoRef.current) {
    logoRef.current = document.getElementById('logo');
  }

  useEffect(() => {
    const root = document.documentElement;
    return () => {
      delete root.dataset.heroHandoff;
    };
  }, []);

  return <MastheadHero logoRef={logoRef} />;
}
