import type { Project } from '@/lib/schema';
import { attribution } from '@/lib/projects';

/** Title block for a detail page — docs/03-APPFLOW.md §5, item 1. */
export function ProjectMeta({ project }: { project: Project }) {
  return (
    <dl className="meta-row" style={{ marginTop: '30px' }}>
      <div>
        <dt className="label">{project.confidential ? 'Sector' : 'Client'}</dt>
        <dd style={{ marginTop: '6px', color: 'var(--color-ink)' }}>{attribution(project)}</dd>
      </div>
      <div>
        <dt className="label">Year</dt>
        <dd style={{ marginTop: '6px', color: 'var(--color-ink)' }}>{project.year}</dd>
      </div>
      <div>
        <dt className="label">Role</dt>
        <dd style={{ marginTop: '6px', color: 'var(--color-ink)' }}>{project.role}</dd>
      </div>
    </dl>
  );
}
