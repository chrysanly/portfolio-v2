import Link from 'next/link';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { StaticIntro } from '@/components/hero/StaticIntro';
import { HeroMount } from '@/components/hero/HeroMount';
import { WorkIndexRow } from '@/components/work/WorkIndexRow';
import { TechMarquee } from '@/components/ui/TechMarquee';
import { getFeaturedProjects } from '@/lib/projects';
import { site } from '@/content/site';

/**
 * Person JSON-LD — docs/02-TRD.md §7.
 * Deliberately excludes the phone number, date of birth and civil status.
 */
function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.fullName,
    alternateName: site.name,
    jobTitle: site.role,
    email: `mailto:${site.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Dubai', addressCountry: 'AE' },
    url: process.env.NEXT_PUBLIC_SITE_URL ?? undefined,
    sameAs: [site.links.github],
    knowsAbout: ['ERP systems', 'Automation', 'System integration', 'REST API design'],
  };
}

export default function HomePage() {
  const projects = getFeaturedProjects();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />
      <SiteHeader />
      <StaticIntro />
      <HeroMount />

      <main id="content" style={{ paddingBottom: '0' }}>
        <div className="wrap">
          <h2 className="section-label">Selected work</h2>
          {projects.length === 0 ? (
            <p className="prose-body">Project entries are on their way.</p>
          ) : (
            projects.map((project, i) => (
              <WorkIndexRow key={project.slug} project={project} index={i} />
            ))
          )}
          <p style={{ paddingTop: '28px' }}>
            <Link style={{ fontSize: 'var(--text-body)' }} href="/work">
              All work
            </Link>
          </p>
        </div>
        <TechMarquee />
        <ContactBand />
      </main>
    </>
  );
}
