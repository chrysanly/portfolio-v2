import Link from 'next/link';
import type { Project } from '@/lib/schema';
import { attributionParts } from '@/lib/projects';

/**
 * docs/04-UIUX-BRIEF.md §4. Renders complete with client: null and images: [] —
 * the confidential case is a real cell, not a gap.
 */
export function WorkIndexRow({ project, index }: { project: Project; index: number }) {
  const { primary, secondary } = attributionParts(project);

  return (
    <Link className="row" href={`/work/${project.slug}`}>
      <span className="row__no">{String(index + 1).padStart(2, '0')}</span>
      <span className="row__title">{project.title}</span>
      <span className="row__client">
        {primary}
        {secondary ? <em>{secondary}</em> : null}
      </span>
      <span className="row__scope">{project.summary}</span>
      <span className="row__out">
        <b>{project.outcome.value}</b>
        <em>{project.outcome.label}</em>
      </span>
    </Link>
  );
}
