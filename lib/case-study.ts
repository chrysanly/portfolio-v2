import type { Project } from './schema';

type CaseStudyFields = Pick<Project, 'body' | 'stackNotes'>;

/**
 * The case study's markdown, assembled from its fields: Approach, then Stack
 * notes. An empty part is left out; placeholders pass through as written.
 *
 * The problem is not here: the page already prints it beside "What I did".
 * Nor is the outcome, which Chrys asked to drop from the case study.
 */
export function caseStudySource(project: CaseStudyFields): string {
  // A body still written the old way, sections and all, from an API whose
  // split migration has not run yet: it is already the whole document.
  if (/^## /m.test(project.body)) return project.body;

  return [section('Approach', project.body), section('Stack notes', project.stackNotes)]
    .filter(Boolean)
    .join('\n\n');
}

function section(heading: string, text: string | null): string {
  const content = text?.trim();
  return content ? `## ${heading}\n\n${content}` : '';
}
