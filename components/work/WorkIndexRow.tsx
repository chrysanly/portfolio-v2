import Link from 'next/link';
import type { Project } from '@/lib/schema';
import { attributionParts } from '@/lib/projects';

/** Enough of the stack to show judgement without turning the row into a list. */
const STACK_SHOWN = 4;

/**
 * docs/04-UIUX-BRIEF.md §4. Renders complete with client: null and images: [] —
 * the confidential case is a real cell, not a gap.
 *
 * The year, the role and the principal stack sit under the cells they belong
 * to rather than in new columns: docs/01-PRD.md §3 has a technical reader as
 * the secondary audience, and a title plus a sentence gives them nothing to
 * judge. Every value is already in the project's frontmatter.
 */
export function WorkIndexRow({ project, index }: { project: Project; index: number }) {
  const { primary, secondary } = attributionParts(project);
  const shown = project.stack.slice(0, STACK_SHOWN);
  const rest = project.stack.length - shown.length;

  return (
    <Link className="row" href={`/work/${project.slug}`}>
      <span className="row__no">{String(index + 1).padStart(2, '0')}</span>

      <span className="row__title">
        {project.title}
        <em className="row__role">
          {project.year}, {project.role}
        </em>
      </span>

      <span className="row__client">
        {primary}
        {secondary ? <em>{secondary}</em> : null}
      </span>

      <span className="row__scope">
        {project.summary}
        <em className="row__stack">
          {shown.join(', ')}
          {rest > 0 ? ` +${rest}` : ''}
        </em>
      </span>

      <span className="row__out">
        <b>{project.outcome.value}</b>
        <em>{project.outcome.label}</em>
      </span>
    </Link>
  );
}
