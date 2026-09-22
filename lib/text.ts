/**
 * Everything the page renders from the content source passes through here.
 *
 * The site reads three sources — the API, the committed snapshot, the MDX —
 * and only the third is written by hand. A field typed into the admin can
 * arrive with a stray `**`, a pasted non-breaking space, a Windows line break
 * mid-sentence, or simply empty; a list can arrive with a blank entry in it
 * because somebody left a row in the form. None of that should reach a
 * recruiter's screen, and none of it should be fixed by editing the database
 * either — the database is allowed to hold imperfect typing.
 *
 * What this does NOT do is invent or remove content. Bracketed placeholders
 * (`[METRIC]`, `[what I learned here]`) are real content under rule 1 of
 * CLAUDE.md and pass through untouched — filtering them here would hide the
 * very gaps `docs/CONTENT-TODO.md` exists to track.
 */

/** Paired emphasis around a whole value: `**Laravel**` typed into a form field. */
const WRAPPED = /^\s*(\*{1,3}|_{1,3})([\s\S]+?)\1\s*$/;

/** A run of markers left behind on its own, as in `Integration ****`. */
const ORPHAN_MARKERS = /(^|\s)(\*{1,3}|_{2,3}|`{1,3})(?=\s|$)/g;

/**
 * One string, as it should appear on screen.
 *
 * Returns `''` for anything that is not a usable string, so a caller can treat
 * empty and missing identically — `if (!clean) return null` collapses the
 * section, which is what item 1 of Chrys's brief asks for.
 */
export function cleanText(value: unknown): string {
  if (typeof value !== 'string') return '';

  let text = value
    // Non-breaking and zero-width characters survive a copy-paste out of Word
    // or a PDF and then break wrapping in ways that look like a CSS bug.
    .replace(/ /g, ' ')
    .replace(/[​-‍﻿]/g, '')
    // CRLF, which is what a Windows admin session writes into a textarea.
    .replace(/\r\n?/g, '\n');

  // Unwrap emphasis that wraps the entire value. Repeated, because `***x***`
  // parses as three nested pairs, and only when it is the whole string: a
  // `**` in the middle of a sentence is prose the site should not touch.
  for (let i = 0; i < 3; i += 1) {
    const match = WRAPPED.exec(text);
    if (!match) break;
    text = match[2];
  }

  return text
    .replace(ORPHAN_MARKERS, '$1')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * The same, for a single line: every kind of break becomes one space.
 *
 * For values the design lays out as one line — a stack entry, a role, a
 * summary in a card — where a line break from the source would otherwise
 * either be swallowed silently (collapsing two words into one, which is how
 * "CRM SystemsIntegration" happens) or break the layout.
 */
export function cleanLine(value: unknown): string {
  return cleanText(value).replace(/\s*\n+\s*/g, ' ');
}

/**
 * A list, with the holes taken out.
 *
 * Nulls, undefineds, non-strings, empty strings and whitespace-only strings
 * are dropped, and exact duplicates collapse. That is what stops an empty
 * value in `stack` from rendering as a bullet with nothing after it — the
 * "- - -" artifact — and it is why callers can use `list.length` to decide
 * whether a section exists at all.
 */
export function cleanList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];

  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = cleanLine(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}
