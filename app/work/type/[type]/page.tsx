import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { WorkIndex } from '@/components/work/WorkIndex';
import { getProjectsByType, isProjectType } from '@/lib/projects';
import { PROJECT_TYPE_LABELS, PROJECT_TYPES } from '@/lib/schema';

/**
 * One static page per type — docs/03-APPFLOW.md §4.
 *
 * Every type gets a page, not only the types that currently have work, so the
 * empty-filter state is a real reachable route rather than dead code.
 */
export function generateStaticParams() {
  return PROJECT_TYPES.map((type) => ({ type }));
}

/** Anything outside the enum is a 404, not a dynamically rendered page. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ type: string }>;
}): Promise<Metadata> {
  const { type } = await params;
  if (!isProjectType(type)) return {};
  return {
    title: `Work — ${PROJECT_TYPE_LABELS[type]}`,
    description: `${PROJECT_TYPE_LABELS[type]} projects.`,
  };
}

export default async function WorkTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  if (!isProjectType(type)) notFound();

  return (
    <>
      <SiteHeader current="/work" />
      <main id="content">
        <div className="wrap">
          <h1 className="section-label">Work — {PROJECT_TYPE_LABELS[type]}</h1>
          <WorkIndex projects={await getProjectsByType(type)} active={type} />
        </div>
        <ContactBand />
      </main>
    </>
  );
}
