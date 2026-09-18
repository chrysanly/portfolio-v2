import type { Metadata } from 'next';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { WorkIndex } from '@/components/work/WorkIndex';
import { getAllProjects } from '@/lib/projects';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Selected ERP, automation, integration and web projects.',
};

/** The unfiltered index. Filtered views live at /work/type/[type]. */
export default function WorkPage() {
  return (
    <>
      <SiteHeader current="/work" />
      <main id="content">
        <div className="wrap">
          <h1 className="section-label">Work</h1>
          <WorkIndex projects={getAllProjects()} />
        </div>
        <ContactBand />
      </main>
    </>
  );
}
