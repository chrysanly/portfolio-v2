import Link from 'next/link';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { StaticIntro } from '@/components/hero/StaticIntro';
import { HeroMount } from '@/components/hero/HeroMount';
import { WorkIndexRow } from '@/components/work/WorkIndexRow';
import { ExperienceTimeline } from '@/components/work/ExperienceTimeline';
import { SectionPager } from '@/components/ui/SectionPager';
import { WorkShowcase } from '@/components/work/WorkShowcase';
import { ArchitectureNote } from '@/components/ui/ArchitectureNote';
import { attribution, getFeaturedProjects } from '@/lib/projects';
import { getProfile, type Profile } from '@/lib/profile';

/**
 * Person JSON-LD — docs/02-TRD.md §7.
 * Deliberately excludes the phone number, date of birth and civil status.
 */
function personJsonLd(profile: Profile) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.fullName,
    alternateName: profile.name,
    jobTitle: profile.role,
    email: `mailto:${profile.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Dubai', addressCountry: 'AE' },
    url: process.env.NEXT_PUBLIC_SITE_URL ?? undefined,
    sameAs: [profile.links.github],
    knowsAbout: ['ERP systems', 'Automation', 'System integration', 'REST API design'],
  };
}

export default async function HomePage() {
  const projects = await getFeaturedProjects();
  const profile = await getProfile();

  // Only what the showcase renders — the MDX body would otherwise be serialised
  // into the client payload for no reason.
  const showcase = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    type: p.type,
    year: p.year,
    role: p.role,
    summary: p.summary,
    stack: p.stack,
    outcome: p.outcome,
    images: p.images,
    attribution: attribution(p),
  }));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd(profile)) }}
      />
      <SiteHeader minimal />
      <StaticIntro />
      <HeroMount profile={profile} />

      <main id="content" style={{ paddingBottom: '0' }}>
        <div id="showcase" data-section="Selected work">
          <WorkShowcase projects={showcase} />
        </div>

        <div className="wrap work-list" id="index">
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
        <div id="journey" data-section="Journey">
          <ExperienceTimeline />
        </div>
        {/* Near the foot of the page, after the work and the stack: by here a
            technical reader has seen what was built and is owed the answer to
            "and what is this site itself?". Asked for on 2026-09-22. */}
        <div id="architecture" data-section="Architecture">
          <ArchitectureNote />
        </div>

        <div id="contact" data-section="Contact">
          <ContactBand />
        </div>
      </main>

      <SectionPager />
    </>
  );
}
