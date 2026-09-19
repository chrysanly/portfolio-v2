import { site } from '@/content/site';

const LETTERS = site.name.toUpperCase().split('');

/**
 * Opening hold — one second, every load.
 *
 * Server-rendered and dismissed by a pure CSS animation rather than by a timer
 * in JavaScript. That matters twice over: a client-rendered splash would appear
 * *after* hydration, so the visitor would glimpse the real page first and then
 * have it covered; and a JS-dismissed one would stay on screen forever with
 * scripting off. This way the hold is the first thing painted and it always
 * clears itself.
 *
 * `aria-hidden` and no focusable content, so it is a visual hold only — the
 * page behind it stays in the accessibility tree and a screen reader is never
 * held up by it.
 */
export function Splash() {
  return (
    <div className="splash" aria-hidden="true">
      <div className="splash__mark">
        {LETTERS.map((ch, i) => (
          <span key={i} style={{ animationDelay: `${i * 70}ms` }}>
            {ch}
          </span>
        ))}
      </div>
      <div className="splash__rule">
        <span />
      </div>
    </div>
  );
}
