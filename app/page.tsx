import Link from 'next/link';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { StackSection } from '@/components/ui/StackSection';
import { StaticIntro } from '@/components/hero/StaticIntro';
import { HeroMount } from '@/components/hero/HeroMount';
import { WorkIndexRow } from '@/components/work/WorkIndexRow';
import { ExperienceTimeline } from '@/components/work/ExperienceTimeline';
import { WorkShowcase } from '@/components/work/WorkShowcase';
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
    sameAs: [profile.links.github, profile.links.linkedin].filter(Boolean),
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
    problem: p.problem,
    contributions: p.contributions,
    stack: p.stack,
    images: p.images,
    // The second half of the "ERP system · …" line: who it was for, or that
    // the client cannot be named.
    context: p.confidential ? `Client under NDA · ${p.sector}` : attribution(p),
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
        {/* "How this works?" no longer has a screen of its own here: it opens
            from the header's How? button on every route (Chrys, 2026-10-19).
            /about keeps its detail version. */}

        {/* Every tool, framework and AI from the resume, with logos (Chrys,
            2026-10-19). After the journey: the roles first, then what they
            were built with. */}
        <div id="stack" data-section="Stack">
          <StackSection />
        </div>

        <div id="contact" data-section="Contact">
          <ContactBand />
        </div>
      </main>
    </>
  );
}
