import Link from 'next/link';

/**
 * Always home, deliberately not browser Back.
 *
 * This used to follow history when there was history to use, so a visitor
 * reading `/work` in a list wouldn't lose their place. In practice that made
 * its destination unpredictable — the same control landed you somewhere
 * different depending on how you arrived — so it is one fixed destination
 * everyone can predict instead. `RouteVeil`'s document-level click listener
 * already covers this link with no wiring needed here.
 */
export function BackLink() {
  return (
    <Link className="back" href="/">
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <path
          d="M10 3 5 8l5 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="square"
        />
      </svg>
      Home
    </Link>
  );
}
