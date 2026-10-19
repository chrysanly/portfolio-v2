import type { CSSProperties } from 'react';
import { logoBrand, skillGroups, type StackItem } from '@/content/site';
import '@/app/stack.css';

/**
 * "What I build with": every language, framework, database, tool and AI from
 * Chrys's resume, with its logo (asked for on 2026-10-19). The list is
 * docs/07-SOURCE-CONTENT.md §3, the same one About shows as words.
 *
 * Logos are Simple Icons files in public/logos/, drawn through a CSS mask so
 * they take the theme's ink and never need a light and a dark copy. On hover
 * a logo takes its brand colour, but only where that colour keeps 3:1 on the
 * current ground (`logoBrand`). A tool with no published logo gets a lettered
 * tile rather than an invented mark; practices are listed as words.
 *
 * Server-rendered, no JavaScript: it is a list, not a widget.
 */
export function StackSection() {
  return (
    <section className="stack" aria-labelledby="stack-title">
      <div className="wrap">
        <p className="section-label">Stack &amp; tools</p>
        <h2 id="stack-title" className="stack__title">
          What I build with.
        </h2>
        <p className="stack__lede">
          The languages, frameworks, databases, tools and AI I work with, as listed on my CV.
        </p>

        <dl className="stack__groups">
          {skillGroups.map((group) => {
            const tools = group.items.filter((item) => !item.concept);
            const concepts = group.items.filter((item) => item.concept);
            return (
              <div key={group.label} className="stack__group">
                <dt className="stack__label">
                  {group.label}
                  <span className="stack__count" aria-hidden="true">
                    {String(group.items.length).padStart(2, '0')}
                  </span>
                </dt>
                <dd className="stack__body">
                  {tools.length > 0 ? (
                    <ul className="stack__tiles">
                      {tools.map((item) => (
                        <Tile key={item.name} item={item} />
                      ))}
                    </ul>
                  ) : null}
                  {concepts.length > 0 ? (
                    <p className="stack__concepts">
                      {concepts.map((item) => item.name).join(' · ')}
                    </p>
                  ) : null}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

function Tile({ item }: { item: StackItem }) {
  if (!item.logo) {
    return (
      <li className="stack__tile">
        <span className="stack__mono" aria-hidden="true">
          {initials(item.name)}
        </span>
        {item.name}
      </li>
    );
  }
  const [light, dark] = logoBrand[item.logo] ?? [null, null];
  const style = {
    '--logo': `url(/logos/${item.logo}.svg)`,
    ...(light ? { '--brand-light': light } : {}),
    ...(dark ? { '--brand-dark': dark } : {}),
  } as CSSProperties;
  return (
    <li className="stack__tile" style={style}>
      <span className="stack__logo" aria-hidden="true" />
      {item.name}
    </li>
  );
}

/** Two letters for a tool with no logo: "Visual Studio Code" → "VS", "Tabby" → "Ta". */
export function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
  if (/^[A-Z]{2,4}$/.test(name)) return name;
  return name[0].toUpperCase() + name.slice(1, 2);
}
