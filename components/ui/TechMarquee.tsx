import { techIcons } from '@/content/tech-icons';
import { MarqueeTrack } from './MarqueeTrack';

const slug = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * The stack as a row of marks.
 *
 * A server component: the path data stays out of the client bundle, and the
 * scrolling behaviour lives in <MarqueeTrack>. Each path is defined once in a
 * hidden sprite and referenced twice with <use>, so the seamless loop costs one
 * copy of the geometry rather than two.
 *
 * The second row is hidden from assistive technology; the names are announced
 * once, from the first.
 */
export function TechMarquee() {
  const row = (echo: boolean) => (
    <ul className="marquee__row" aria-hidden={echo || undefined}>
      {techIcons.map((icon) => (
        <li key={`${icon.label}${echo ? '-echo' : ''}`} className="marquee__item">
          <svg
            viewBox="0 0 24 24"
            role={echo ? undefined : 'img'}
            aria-label={echo ? undefined : icon.label}
            aria-hidden={echo || undefined}
            focusable="false"
          >
            <use href={`#ti-${slug(icon.label)}`} />
          </svg>
        </li>
      ))}
    </ul>
  );

  return (
    <section className="stack-band" aria-labelledby="stack-heading">
      <div className="wrap">
        <h2 id="stack-heading" className="section-label">
          Stack
        </h2>
      </div>

      <svg className="visually-hidden" aria-hidden="true" focusable="false">
        <defs>
          {techIcons.map((icon) => (
            <symbol key={icon.label} id={`ti-${slug(icon.label)}`} viewBox="0 0 24 24">
              <path d={icon.path} fillRule={icon.fillRule} />
            </symbol>
          ))}
        </defs>
      </svg>

      <MarqueeTrack>
        {row(false)}
        {row(true)}
      </MarqueeTrack>
    </section>
  );
}
