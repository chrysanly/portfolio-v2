'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { showVeil } from '@/components/ui/RouteVeil';
import { type JourneyChapter, mountJourney } from './journey-engine.mjs';

export type { JourneyChapter };

/**
 * "My journey": the career as a ladder, school at the bottom, one stop per
 * rung band. The scene sits in the left half and the stop's card in the
 * right half. Scroll, Previous/Next or the arrow keys move him: he walks in,
 * says hello, steps onto the ladder and climbs, pausing at each stop to wave
 * and say where he is. Past the last stop he keeps climbing into the dark.
 *
 * The scene is Bahaghari's design (side-on ladder), drawn in vector. It lives
 * in a shadow root (journey-engine.mjs), so its many generic class names
 * cannot meet the site's, and the site's hover cards cannot reach into it.
 *
 * Before the script runs — or with it off — the light-DOM list below is the
 * journey: every stop in order, with what was built there. The engine
 * replaces its rendering, not its content, and handles reduced motion itself:
 * no pin, no climbing, the figure on the latest stop and Previous/Next
 * swapping the cards.
 */
export function JourneyTimeline({ chapters }: { chapters: JourneyChapter[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const host = hostRef.current;
    if (!host || chapters.length === 0) return;

    const markers = [...host.querySelectorAll<HTMLElement>('[data-substep-title]')];

    return mountJourney(host, chapters, {
      markers,
      navigate: (href) => {
        showVeil();
        router.push(href);
      },
    });
  }, [chapters, router]);

  return (
    <div ref={hostRef} className="jw-host">
      <ol className="jw-fallback">
        {chapters.map((c) => (
          <li key={`${c.title}-${c.period}`} data-substep-title={c.title}>
            <p className="jw-fallback__chapter">{c.chapter}</p>
            <h3>{c.title}</h3>
            <p>
              {c.org} · {c.loc} · {c.period}
            </p>
            <p>{c.say}</p>
            {c.projects.length > 0 ? (
              <p>
                Built here:{' '}
                {c.projects.map((p, i) => (
                  <span key={p.href}>
                    {i > 0 ? ', ' : null}
                    <a href={p.href}>{p.title}</a>
                  </span>
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
