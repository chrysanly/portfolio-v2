'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { showVeil } from '@/components/ui/RouteVeil';
import { type JourneyChapter, mountJourney } from './journey-engine.mjs';
import { JourneyStopModal } from './JourneyStopModal';
import '@/app/journey.css';

export type { JourneyChapter };

/**
 * "My journey": the career as a ladder, school at the bottom, one stop per
 * rung band. The scene sits in the left half and the stop's card in the
 * right half. Scroll, Previous/Next or the arrow keys move him: he walks in,
 * says hello, steps onto the ladder and climbs, pausing at each stop to wave
 * and say where he is. Past the last stop he keeps climbing into the dark.
 *
 * Below 1024 wide, and in landscape no taller than 540, the engine draws
 * Sinag's one-stop-at-a-time stage instead: the ladder rail on the left and a
 * single card on the right, swapped as he climbs. Every card shows the
 * headline facts and the first three things done; View more opens
 * JourneyStopModal with the rest. Only the page scrolls, at every size.
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
  const [details, setDetails] = useState<{ index: number; opener: HTMLElement } | null>(null);

  const navigate = useCallback(
    (href: string) => {
      showVeil();
      router.push(href);
    },
    [router],
  );
  const closeDetails = useCallback(() => setDetails(null), []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || chapters.length === 0) return;

    const markers = [...host.querySelectorAll<HTMLElement>('[data-substep-title]')];

    return mountJourney(host, chapters, {
      markers,
      navigate,
      onMore: (index, opener) => setDetails({ index, opener }),
    });
  }, [chapters, navigate]);

  const open = details ? chapters[details.index] : undefined;

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
      {open && details ? (
        <JourneyStopModal
          chapter={open}
          opener={details.opener}
          onClose={closeDetails}
          onNavigate={navigate}
        />
      ) : null}
    </div>
  );
}
