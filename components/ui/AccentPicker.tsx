'use client';

import { useEffect, useRef, useState } from 'react';
import { isTextureOn, onTextureChange, setTexture as applyTexture } from '@/lib/texture';
import { ACCENT_PICK_EVENT, TOUR_MENU_EVENT } from '@/lib/tour';

/**
 * Floating control for the accent colour — the one hue the palette lets
 * vary (docs/04-UIUX-BRIEF.md §2 fixes the ink and ground; the accent is
 * the only thing that carries any colour at all).
 *
 * The choice is written as an inline `--color-accent` on the root element,
 * which outranks both theme blocks, so one pick holds across a light/dark
 * swap rather than being reset by it. "Default" removes the override and
 * hands each theme its own accent back.
 *
 * Applied pre-paint by the blocking script in the layout head, same as the
 * theme, so a saved accent is already on screen at first paint instead of
 * flashing the default and correcting.
 */

/*
 * The colours themselves live in globals.css as `--accent-*` tokens, and
 * what is stored here (and in localStorage) is the reference rather than
 * the hex. One list, in one file: the CTA's status dot cycles through the
 * same tokens, so it cannot drift out of step with what this menu offers.
 */
const OPTIONS = [
  { name: 'Default', value: null },
  { name: 'Rust', value: 'var(--accent-rust)' },
  { name: 'Brass', value: 'var(--accent-brass)' },
  { name: 'Moss', value: 'var(--accent-moss)' },
  { name: 'Teal', value: 'var(--accent-teal)' },
  { name: 'Indigo', value: 'var(--accent-indigo)' },
] as const;

export function AccentPicker() {
  const [open, setOpen] = useState(false);
  const [accent, setAccent] = useState<string | null>(null);
  const [texture, setTexture] = useState(true);
  const [ready, setReady] = useState(false);
  // The first-visit tour opens the menu and holds it open across two steps.
  const [owned, setOwned] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('accent');
    } catch {
      // Blocked storage: the picker still works, it just will not persist.
    }
    setAccent(saved);
    setTexture(isTextureOn());
    setReady(true);
    // The lag notice and the tour can switch the texture too.
    return onTextureChange(setTexture);
  }, []);

  useEffect(() => {
    const onTour = (event: Event) => {
      const take = (event as CustomEvent<boolean>).detail;
      setOwned(take);
      setOpen(take);
    };
    window.addEventListener(TOUR_MENU_EVENT, onTour);
    return () => window.removeEventListener(TOUR_MENU_EVENT, onTour);
  }, []);

  useEffect(() => {
    if (!open || owned) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, [open, owned]);

  function pick(name: string, value: string | null) {
    setAccent(value);
    if (!owned) setOpen(false);
    window.dispatchEvent(new CustomEvent<string>(ACCENT_PICK_EVENT, { detail: name }));

    const style = document.documentElement.style;
    if (value) style.setProperty('--color-accent', value);
    else style.removeProperty('--color-accent');

    try {
      if (value) localStorage.setItem('accent', value);
      else localStorage.removeItem('accent');
    } catch {
      // As above.
    }
  }

  /*
   * The faceted ground is the loudest thing on the page and not everyone
   * wants to read over it. The attribute drives a pair of opacity
   * transitions in globals.css rather than a `display` switch, so the mesh
   * fades out instead of vanishing between one frame and the next.
   */
  function toggleTexture() {
    applyTexture(!texture);
  }

  // Held back until the saved value is known, so the swatch never shows the
  // wrong colour for a frame during hydration.
  if (!ready) return null;

  return (
    <div className="accent-picker" ref={rootRef}>
      {open && (
        <ul className="accent-picker__menu">
          {OPTIONS.map((option) => (
            <li key={option.name}>
              <button
                type="button"
                onClick={() => pick(option.name, option.value)}
                aria-pressed={accent === option.value}
              >
                <span
                  className="accent-picker__swatch"
                  aria-hidden="true"
                  style={option.value ? { background: option.value } : undefined}
                  data-default={option.value === null || undefined}
                />
                {option.name}
              </button>
            </li>
          ))}
          <li className="accent-picker__toggle">
            <button
              type="button"
              className="accent-picker__toggle-btn"
              onClick={toggleTexture}
              aria-pressed={texture}
            >
              Texture
              <span className="accent-picker__switch" aria-hidden="true" />
            </button>
          </li>
        </ul>
      )}
      <button
        type="button"
        className="accent-picker__trigger"
        onClick={() => {
          if (!owned) setOpen((was) => !was);
        }}
        aria-expanded={open}
      >
        {/*
         * A solid square of the accent itself rather than a palette glyph:
         * the control's whole subject is one colour, so showing that colour
         * says more than any icon of a paint palette would, and it sits in
         * a design with zero radius and hairline rules far more quietly.
         */}
        <span className="accent-picker__chip" aria-hidden="true" />
        <span className="accent-picker__word">Accent</span>
      </button>
    </div>
  );
}
