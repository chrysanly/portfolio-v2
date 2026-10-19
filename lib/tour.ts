/**
 * Plumbing for the first-visit tour: the events it shares with AccentPicker,
 * and where its card goes beside a spotlighted control.
 */

/** Tour → AccentPicker. `detail: true` opens the menu and hands it to the
    tour (the trigger, Escape and outside clicks stop closing it); `false`
    closes it and hands it back. */
export const TOUR_MENU_EVENT = 'tour-accent-menu';

/** AccentPicker → anyone. `detail` is the picked option's name. */
export const ACCENT_PICK_EVENT = 'accent-pick';

/** Set once the tour is done, skipped or left for How?. */
export const GUIDE_SEEN_KEY = 'guide-seen';

export type Side = 'top' | 'left' | 'bottom';

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Placement {
  x: number;
  y: number;
  /** Where the card enters from, in px: 8 towards the target's side. */
  fromX: number;
  fromY: number;
}

const GAP = 16;
/** Above the target the card carries a down arrow, which needs the extra room. */
const ARROW_GAP = 24;
const EDGE = 16;
/** At or under this width the card docks full width to a screen edge. */
export const PHONE_MAX = 520;

const clamp = (value: number, max: number) => Math.max(EDGE, Math.min(value, max - EDGE));

/**
 * Beside the target on `side` with a 16px gap (24px above it, for the arrow),
 * kept 16px inside the viewport.
 * On a phone it docks to the edge away from the target instead: the top when
 * the target is in the lower half, the bottom otherwise.
 */
export function placeCard(target: Box, side: Side, card: Size, view: Size): Placement {
  if (view.width <= PHONE_MAX) {
    const low = (target.top + target.bottom) / 2 > view.height / 2;
    return low
      ? { x: EDGE, y: EDGE, fromX: 0, fromY: -8 }
      : { x: EDGE, y: view.height - card.height - EDGE, fromX: 0, fromY: 8 };
  }

  const maxX = view.width - card.width;
  const maxY = view.height - card.height;

  if (side === 'top') {
    const centre = (target.left + target.right) / 2;
    return {
      x: clamp(centre - card.width / 2, maxX),
      y: clamp(target.top - card.height - ARROW_GAP, maxY),
      fromX: 0,
      fromY: 8,
    };
  }
  if (side === 'left') {
    const middle = (target.top + target.bottom) / 2;
    return {
      x: clamp(target.left - card.width - GAP, maxX),
      y: clamp(middle - card.height / 2, maxY),
      fromX: 8,
      fromY: 0,
    };
  }
  return {
    x: clamp(target.right - card.width, maxX),
    y: clamp(target.bottom + GAP, maxY),
    fromX: 0,
    fromY: -8,
  };
}
