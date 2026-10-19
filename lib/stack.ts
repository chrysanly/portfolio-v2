/**
 * The stack section's filter, ordering and drag maths, kept apart from the
 * component so node:test can check them (it cannot render JSX).
 */
import type { StackGroup, StackItem } from '@/content/site';

export type Tool = StackItem & { group: string };
export type Tab = { key: string; label: string; tools: readonly Tool[] };

export const ALL = 'all';

/** How far a phone drag must travel before letting go opens the next tab. */
export const ARM_PX = 72;

/** Past this share of the width the cloud follows the finger at 30%. */
const RESIST_FROM = 0.4;
const RESIST_RATE = 0.3;

/** Pixels before a drag picks horizontal (switch tabs) or vertical (scroll). */
const AXIS_LOCK_PX = 6;

/** Tools with a logo first, each half in its original order. */
export function logoFirst(tools: readonly Tool[]): Tool[] {
  return [...tools.filter((tool) => tool.logo), ...tools.filter((tool) => !tool.logo)];
}

/**
 * "All": one tool from each group in turn, so the first screen is a mix of
 * languages, databases, payments and tools rather than one long group. A tool
 * listed in two groups (Tauri, TDD) appears once, under the first.
 */
export function mixAll(groups: readonly StackGroup[]): Tool[] {
  const seen = new Set<string>();
  const mixed: Tool[] = [];
  const longest = Math.max(0, ...groups.map((group) => group.items.length));

  for (let i = 0; i < longest; i += 1) {
    for (const group of groups) {
      const item = group.items[i];
      if (!item || seen.has(item.name)) continue;
      seen.add(item.name);
      mixed.push({ ...item, group: group.key });
    }
  }

  return mixed;
}

export function buildTabs(groups: readonly StackGroup[]): Tab[] {
  return [
    { key: ALL, label: 'All', tools: logoFirst(mixAll(groups)) },
    ...groups.map((group) => ({
      key: group.key,
      label: group.short,
      tools: logoFirst(group.items.map((item) => ({ ...item, group: group.key }))),
    })),
  ];
}

/** The tab before (-1) or after (+1), wrapping: Desktop is next to All. */
export function neighbour(count: number, index: number, direction: -1 | 1): number {
  return (index + direction + count) % count;
}

/** How many tools "View more" reveals at a given limit. */
export function hiddenCount(total: number, limit: number): number {
  return Math.max(0, total - limit);
}

/** Where the cloud sits for a finger `dx` pixels away: 1:1, then resisting. */
export function resist(dx: number, width: number): number {
  const max = width * RESIST_FROM;
  if (Math.abs(dx) <= max) return dx;

  return Math.sign(dx) * (max + (Math.abs(dx) - max) * RESIST_RATE);
}

/** The cloud fades as it is pulled, never below half. */
export function dragOpacity(offset: number, width: number): number {
  return 1 - Math.min(Math.abs(offset) / width, 0.5);
}

export function isArmed(dx: number): boolean {
  return Math.abs(dx) >= ARM_PX;
}

/** Null until the pointer has moved far enough to tell. */
export function lockAxis(dx: number, dy: number): 'x' | 'y' | null {
  if (Math.abs(dx) <= AXIS_LOCK_PX && Math.abs(dy) <= AXIS_LOCK_PX) return null;

  return Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
}
