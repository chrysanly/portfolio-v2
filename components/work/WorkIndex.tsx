import Link from 'next/link';
import type { Project, ProjectType } from '@/lib/schema';
import { PROJECT_TYPE_LABELS, PROJECT_TYPES } from '@/lib/schema';
import { WorkIndexRow } from './WorkIndexRow';

/**
 * The work index and its filter bar, shared by /work and /work/type/[type].
 *
 * Filtering is static route segments — docs/03-APPFLOW.md §4. The filter is
 * therefore shareable and survives a refresh, which is the part of that
 * section that matters.
 *
 * These were plain anchors, on the reasoning that a full document navigation
 * to a pre-rendered page needs no client router. True, but it made the
 * filter the one place on the site that flashed and reloaded while every
 * other link glided, and the project rows beside it already use next/link.
 * `Link` renders a real `<a href>` to the same static page, so the
 * JavaScript-disabled behaviour the section asks for is unchanged — what is
 * gained is that clicking a filter now behaves like clicking anything else.
 */
export function WorkIndex({
  projects,
  active,
}: {
  projects: Project[];
  active?: ProjectType;
}) {
  return (
    <>
      <nav className="filters" aria-label="Filter by project type">
        <Link href="/work" aria-current={active ? undefined : 'true'}>
          All
        </Link>
        {PROJECT_TYPES.map((type) => (
          <Link
            key={type}
            href={`/work/type/${type}`}
            aria-current={active === type ? 'true' : undefined}
          >
            {PROJECT_TYPE_LABELS[type]}
          </Link>
        ))}
      </nav>

      {projects.length === 0 ? (
        <div className="prose-body">
          <p>
            {active
              ? 'No projects in this category yet.'
              : 'Project entries are on their way.'}
          </p>
          {active ? (
            <p style={{ marginTop: '14px' }}>
              <Link href="/work">Clear the filter</Link>
            </p>
          ) : null}
        </div>
      ) : (
        projects.map((project, i) => (
          <WorkIndexRow key={project.slug} project={project} index={i} />
        ))
      )}
    </>
  );
}
