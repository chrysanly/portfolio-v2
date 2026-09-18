/* eslint-disable @next/next/no-html-link-for-pages --
 * docs/03-APPFLOW.md §4 specifies plain anchors for the filter. These are full
 * document navigations to statically generated pages, by design: no prefetch
 * JS, no client router, identical behaviour with JavaScript disabled. Swapping
 * in next/link would add a client dependency the filter does not need.
 */
import type { Project, ProjectType } from '@/lib/schema';
import { PROJECT_TYPE_LABELS, PROJECT_TYPES } from '@/lib/schema';
import { WorkIndexRow } from './WorkIndexRow';

/**
 * The work index and its filter bar, shared by /work and /work/type/[type].
 *
 * Filtering is static route segments — docs/03-APPFLOW.md §4. The links are
 * plain anchors to pages generated at build, so the filter is shareable,
 * survives a refresh and works with JavaScript disabled.
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
        <a href="/work" aria-current={active ? undefined : 'true'}>
          All
        </a>
        {PROJECT_TYPES.map((type) => (
          <a
            key={type}
            href={`/work/type/${type}`}
            aria-current={active === type ? 'true' : undefined}
          >
            {PROJECT_TYPE_LABELS[type]}
          </a>
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
              <a href="/work">Clear the filter</a>
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
