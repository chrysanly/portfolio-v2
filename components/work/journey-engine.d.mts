/** One stop on the ladder, built from a journey stop. */
export interface JourneyChapter {
  kind: 'work' | 'education';
  /** The sky title — `phase` from the admin, or "Where it started" for school. */
  chapter: string;
  title: string;
  org: string;
  loc: string;
  period: string;
  /** "What I took from it": sanitised HTML from the admin, or a placeholder. */
  learned: string | null;
  learnedIsHtml: boolean;
  /** The line in his speech bubble at this stop, first person, from facts already in the stop. */
  say: string;
  projects: { title: string; href: string }[];
  /** From the first project built here; absent when the stop has none. */
  sector?: string | null;
  /** That project's summary, one line. */
  short?: string;
  /** That project's "What I did" lines. */
  did?: string[];
  /** That project's stack, first five. */
  tools?: string[];
}

export interface JourneyOptions {
  /** Route a "Built here" link through the app's router. */
  navigate: (href: string) => void;
  /** Light-DOM markers the section pager reads `data-substep-y` from. */
  markers?: HTMLElement[];
  /**
   * A card's View more was pressed: open the details for stop `index`.
   * `opener` is the button, inside the shadow root; focus returns to it.
   */
  onMore?: (index: number, opener: HTMLElement) => void;
}

/**
 * Draws the journey into a shadow root on `host` — the ladder scene from
 * 1024 up, one stop at a time below it and in short landscape — and returns
 * the cleanup.
 */
export function mountJourney(
  host: HTMLElement,
  chapters: JourneyChapter[],
  options: JourneyOptions,
): () => void;
