'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { drawnLogos, logoBrand } from '@/content/site';
import {
  ALL,
  dragOpacity,
  hiddenCount,
  isArmed,
  lockAxis,
  neighbour,
  resist,
  type Tab,
  type Tool,
} from '@/lib/stack';

/** Tools shown before "View more", by screen: phone, tablet, desktop. */
const LIMITS = { narrow: 10, mid: 18, wide: 28 } as const;
const PHONE = '(max-width: 640px)';
const REDUCED = '(prefers-reduced-motion: reduce)';

/** Ink on the badge for a logo whose brand colour cannot hold 3:1 there. */
const BADGE_INK = '#1a1a18';

/** A practice has no logo: it shows its group's icon instead. */
const GROUP_ICONS: Record<string, string> = {
  arch: 'M12 3l9 4.5-9 4.5-9-4.5zM3 12l9 4.5 9-4.5M3 16.5L12 21l9-4.5',
  ai: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z',
  auth: 'M5 10h14v11H5zM8 10V7a4 4 0 0 1 8 0v3',
  pay: 'M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16',
  test: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 12.5l2.7 2.7L16 9.5',
};

const matches = (query: string) =>
  typeof window !== 'undefined' && window.matchMedia(query).matches;

/**
 * The filterable pill cloud under "What I build with".
 *
 * Desktop and tablet: wrapped filter chips over the cloud. Phone: the chips
 * become an endless, draggable strip, and the cloud itself can be dragged
 * sideways to the next tab, with a placeholder card saying where it goes.
 * Which tools are hidden behind "View more" is CSS (nth-child per
 * breakpoint), so the server markup is already right on every screen.
 */
export function StackTools({ tabs, groupCount }: { tabs: readonly Tab[]; groupCount: number }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [dragged, setDragged] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const cloudRef = useRef<HTMLUListElement>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);

  const tab = tabs[active];
  const before = tabs[neighbour(tabs.length, active, -1)];
  const after = tabs[neighbour(tabs.length, active, 1)];

  // ---- the chip strip on phone: three copies, kept in the middle one

  const realChips = () =>
    Array.from(
      chipsRef.current?.querySelectorAll<HTMLButtonElement>('.stack-chip:not([data-clone])') ??
        [],
    );

  const centreChip = useCallback((index: number, smooth: boolean) => {
    const strip = chipsRef.current;
    const chip = strip?.querySelectorAll<HTMLButtonElement>('.stack-chip:not([data-clone])')[
      index
    ];
    if (!strip || !chip || !matches(PHONE)) return;

    strip.scrollTo({
      left: chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2,
      behavior: smooth && !matches(REDUCED) ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => centreChip(0, false), [centreChip]);

  const onStripScroll = () => {
    const strip = chipsRef.current;
    const first = strip?.firstElementChild as HTMLElement | null;
    const real = realChips()[0];
    if (!strip || !first || !real || !matches(PHONE)) return;

    const setWidth = real.offsetLeft - first.offsetLeft;
    if (strip.scrollLeft < setWidth * 0.5) strip.scrollLeft += setWidth;
    else if (strip.scrollLeft > setWidth * 1.5) strip.scrollLeft -= setWidth;
  };

  // ---- switching tabs

  const select = (index: number, direction: -1 | 0 | 1 = 0) => {
    setAnimate(true);
    setOpen(false);
    centreChip(index, true);

    const cloud = cloudRef.current;
    if (!direction || !cloud || !matches(PHONE) || matches(REDUCED)) {
      setActive(index);
      return;
    }

    // Out the way it was pulled, in from the other side.
    cloud.dataset.moving = '';
    cloud.style.transform = `translateX(${direction * -60}px)`;
    cloud.style.opacity = '0';
    window.setTimeout(() => {
      delete cloud.dataset.moving;
      cloud.style.transform = `translateX(${direction * 40}px)`;
      setActive(index);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          cloud.dataset.moving = '';
          cloud.style.transform = '';
          cloud.style.opacity = '';
        }),
      );
    }, 180);
  };

  // ---- dragging the chip strip with a mouse (touch scrolls natively)

  const strip = useRef<{ x: number; scroll: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  const onStripDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch' || e.button > 0 || !matches(PHONE)) return;
    strip.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft, moved: false };
  };

  const onStripMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = strip.current;
    if (!drag) return;

    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.dataset.dragging = '';
    }
    if (drag.moved) e.currentTarget.scrollLeft = drag.scroll - dx;
  };

  const onStripUp = (e: PointerEvent<HTMLDivElement>) => {
    const drag = strip.current;
    strip.current = null;
    if (!drag?.moved) return;

    // Eats the click this release fires, and only that one: if it lands off
    // a chip there is no click, and the next real tap must still work.
    suppressClick.current = true;
    window.setTimeout(() => (suppressClick.current = false), 0);
    const el = e.currentTarget;
    delete el.dataset.dragging;

    // Settle on whichever chip ended up nearest the middle.
    const middle = el.scrollLeft + el.clientWidth / 2;
    const chips = Array.from(el.querySelectorAll<HTMLElement>('.stack-chip'));
    const nearest = chips.reduce((best, chip) =>
      Math.abs(chip.offsetLeft + chip.offsetWidth / 2 - middle) <
      Math.abs(best.offsetLeft + best.offsetWidth / 2 - middle)
        ? chip
        : best,
    );
    el.scrollTo({
      left: nearest.offsetLeft - el.clientWidth / 2 + nearest.offsetWidth / 2,
      behavior: matches(REDUCED) ? 'auto' : 'smooth',
    });
  };

  const onStripKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();

    const chips = realChips();
    const at = chips.indexOf(document.activeElement as HTMLButtonElement);
    chips[neighbour(chips.length, Math.max(at, 0), e.key === 'ArrowRight' ? 1 : -1)]?.focus();
  };

  // ---- dragging the cloud on phone

  const cloudDrag = useRef<{ x: number; y: number; dx: number; axis: 'x' | 'y' | null } | null>(
    null,
  );

  const showPlaceholder = (dx: number) => {
    const [pulling, other] =
      dx < 0 ? [nextRef.current, prevRef.current] : [prevRef.current, nextRef.current];
    if (other) other.style.opacity = '0';
    if (!pulling) return;

    pulling.style.opacity = String(Math.min(Math.abs(dx) / 72, 1));
    if (isArmed(dx)) pulling.dataset.armed = '';
    else delete pulling.dataset.armed;
  };

  const hidePlaceholders = () => {
    for (const card of [prevRef.current, nextRef.current]) {
      if (!card) continue;
      card.style.opacity = '0';
      delete card.dataset.armed;
    }
  };

  const onCloudDown = (e: PointerEvent<HTMLUListElement>) => {
    if (e.button > 0 || !matches(PHONE)) return;
    cloudDrag.current = { x: e.clientX, y: e.clientY, dx: 0, axis: null };
  };

  const onCloudMove = (e: PointerEvent<HTMLUListElement>) => {
    const drag = cloudDrag.current;
    if (!drag) return;

    const dx = e.clientX - drag.x;
    if (drag.axis === null) {
      drag.axis = lockAxis(dx, e.clientY - drag.y);
      if (drag.axis === 'x') {
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.dataset.dragging = '';
        setDragged(true);
      }
    }
    if (drag.axis !== 'x') return;

    drag.dx = dx;
    const width = e.currentTarget.clientWidth;
    const offset = resist(dx, width);
    e.currentTarget.style.transform = `translateX(${offset}px)`;
    e.currentTarget.style.opacity = String(dragOpacity(offset, width));
    showPlaceholder(dx);
  };

  const onCloudUp = (e: PointerEvent<HTMLUListElement>) => {
    const drag = cloudDrag.current;
    cloudDrag.current = null;
    if (drag?.axis !== 'x') return;

    const cloud = e.currentTarget;
    delete cloud.dataset.dragging;
    hidePlaceholders();

    if (isArmed(drag.dx)) {
      const direction = drag.dx < 0 ? 1 : -1;
      select(neighbour(tabs.length, active, direction), direction);
      return;
    }

    // Short of the mark: spring back.
    cloud.dataset.moving = '';
    cloud.style.transform = '';
    cloud.style.opacity = '';
  };

  // ---- view more

  const toggleMore = () => {
    setAnimate(true);
    setOpen((was) => {
      if (was) {
        const top = rootRef.current?.getBoundingClientRect().top ?? 0;
        if (top < 0)
          rootRef.current?.scrollIntoView({
            behavior: matches(REDUCED) ? 'auto' : 'smooth',
            block: 'start',
          });
      }
      return !was;
    });
  };

  const total = tab.tools.length;
  const moreClass = (Object.keys(LIMITS) as (keyof typeof LIMITS)[])
    .filter((size) => hiddenCount(total, LIMITS[size]) > 0)
    .map((size) => `has-more-${size}`)
    .join(' ');

  /** `set` is which copy: the real chips sit between two clones on phone. */
  const chip = (t: Tab, index: number, set: 'before' | 'real' | 'after') => {
    const clone = set !== 'real';
    return (
      <button
        key={`${set}-${t.key}`}
        type="button"
        className="stack-chip"
        aria-pressed={index === active}
        {...(clone ? { 'data-clone': '', tabIndex: -1, 'aria-hidden': true } : {})}
        onClick={() => select(index)}
      >
        {t.label}
        <span className="stack-chip__count">{t.tools.length}</span>
      </button>
    );
  };

  return (
    <div className="stack-tools" ref={rootRef}>
      <p className="stack-tools__count" aria-live="polite">
        {total} {total === 1 ? 'item' : 'items'}
        {tab.key === ALL ? ` · ${groupCount} groups` : ` in ${tab.label}`}
      </p>

      <div
        ref={chipsRef}
        className="stack-chips"
        role="toolbar"
        aria-label="Filter tools"
        onScroll={onStripScroll}
        onPointerDown={onStripDown}
        onPointerMove={onStripMove}
        onPointerUp={onStripUp}
        onPointerCancel={onStripUp}
        onKeyDown={onStripKey}
        onClickCapture={(e) => {
          if (!suppressClick.current) return;
          suppressClick.current = false;
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        {tabs.map((t, i) => chip(t, i, 'before'))}
        {tabs.map((t, i) => chip(t, i, 'real'))}
        {tabs.map((t, i) => chip(t, i, 'after'))}
      </div>

      <div className={`stack-grab${dragged ? '' : ' is-nudging'}`} aria-hidden="true">
        <span className="stack-grab__grip">
          {Array.from({ length: 6 }, (_, i) => (
            <i key={i} />
          ))}
        </span>
        ⟷ Drag to switch
      </div>

      <div className="stack-stage">
        <div ref={prevRef} className="stack-ghost stack-ghost--prev" aria-hidden="true">
          <i>‹</i>
          <b>{before.label}</b>
          <small className="stack-ghost__count">{before.tools.length} items</small>
          <small className="stack-ghost__release">Release to open</small>
        </div>
        <div ref={nextRef} className="stack-ghost stack-ghost--next" aria-hidden="true">
          <i>›</i>
          <b>{after.label}</b>
          <small className="stack-ghost__count">{after.tools.length} items</small>
          <small className="stack-ghost__release">Release to open</small>
        </div>

        <ul
          id="stack-cloud"
          ref={cloudRef}
          className="stack-cloud"
          data-open={open ? '' : undefined}
          data-animate={animate ? '' : undefined}
          onPointerDown={onCloudDown}
          onPointerMove={onCloudMove}
          onPointerUp={onCloudUp}
          onPointerCancel={onCloudUp}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === 'transform')
              delete e.currentTarget.dataset.moving;
          }}
        >
          {total === 0 ? (
            <li className="stack-cloud__empty">Nothing in this group yet.</li>
          ) : (
            tab.tools.map((tool, i) => (
              <Pill key={`${tab.key}-${tool.name}`} tool={tool} index={i} />
            ))
          )}
        </ul>
      </div>

      <div className="stack-dots" aria-hidden="true">
        {tabs.map((t, i) => (
          <i key={t.key} data-on={i === active ? '' : undefined} />
        ))}
      </div>

      <div className="stack-tools__foot">
        <button
          type="button"
          className={`stack-more ${moreClass}`}
          aria-expanded={open}
          aria-controls="stack-cloud"
          onClick={toggleMore}
        >
          {open ? (
            'Show less'
          ) : (
            <>
              View{' '}
              <span className="stack-more__n--narrow">{hiddenCount(total, LIMITS.narrow)}</span>
              <span className="stack-more__n--mid">{hiddenCount(total, LIMITS.mid)}</span>
              <span className="stack-more__n--wide">
                {hiddenCount(total, LIMITS.wide)}
              </span>{' '}
              more
            </>
          )}
          <svg className="stack-more__arrow" viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M8 3v10M3.5 8.5 8 13l4.5-4.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Pill({ tool, index }: { tool: Tool; index: number }) {
  return (
    <li className="stack-pill" style={{ '--i': index } as CSSProperties}>
      <Badge tool={tool} />
      {tool.name}
    </li>
  );
}

function Badge({ tool }: { tool: Tool }) {
  if (!tool.logo) {
    return (
      <span className="stack-pill__badge stack-pill__badge--practice" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path
            d={GROUP_ICONS[tool.group] ?? GROUP_ICONS.arch}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  const url = `url(/logos/${tool.logo}.svg)`;
  if (drawnLogos.has(tool.logo)) {
    return (
      <span className="stack-pill__badge" aria-hidden="true">
        <span className="stack-pill__art" style={{ backgroundImage: url }} />
      </span>
    );
  }

  const ink = logoBrand[tool.logo]?.[0] ?? BADGE_INK;
  return (
    <span className="stack-pill__badge" aria-hidden="true">
      <span
        className="stack-pill__logo"
        style={{ '--logo': url, '--logo-ink': ink } as CSSProperties}
      />
    </span>
  );
}
