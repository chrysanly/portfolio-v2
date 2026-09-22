import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { BackLink } from '@/components/ui/BackLink';
import { ContactBand } from '@/components/ui/ContactBand';
import { EvidenceGallery } from '@/components/work/EvidenceGallery';
import { ProjectMeta } from '@/components/work/ProjectMeta';
import { OutcomeFigure } from '@/components/work/OutcomeFigure';
import { adjacentProjects, attribution, getAllProjects, getProject } from '@/lib/projects';

export async function generateStaticParams() {
  return (await getAllProjects()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    openGraph: { title: project.title, description: project.summary },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const { previous, next } = await adjacentProjects(slug);

  return (
    <>
      <SiteHeader current="/work" />
      <main id="content">
        <div className="wrap">
          {/*
            Back where Back is meaningful, Home otherwise — a project page is
            the one page on the site that is always arrived at from somewhere,
            usually mid-scroll through the showcase, and returning to the top
            of the home page instead of to the panel is the whole complaint.
            The Work eyebrow stays: it is a breadcrumb, and it is the only
            thing naming which index this page belongs to.
          */}
          <BackLink allowHistory />

          <p className="section-label">
            <Link href="/work">Work</Link>
          </p>

          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 'clamp(2rem, 5vw, 3.25rem)',
              lineHeight: 1.15,
              maxWidth: '9em',
            }}
          >
            {project.title}
          </h1>
          <p className="visually-hidden">{attribution(project)}</p>

          <ProjectMeta project={project} />

          {/*
            One grid, and the order below is `docs/03-APPFLOW.md` §5 exactly —
            outcome, body, stack, evidence, next/previous. What changes on a
            wide screen is only where CSS *puts* them: the outcome and the
            stack are placed in a right-hand column beside the body, because
            prose holds its measure at 34em and everything to the right of it
            was empty from the outcome all the way down to the evidence. Grid
            placement, not reordered markup — a narrow screen, a screen reader
            and a page with no CSS all still get the fixed order.
          */}
          <div className="detail-body">
            <OutcomeFigure outcome={project.outcome} />

            <div className="mdx">
              <MDXRemote source={project.body} />
            </div>

            <section className="detail-section detail-body__stack">
              <h2>Stack</h2>
              <ul className="stack-list">
                {project.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>

            {/* Evidence is omitted entirely when images is empty — never a placeholder box. */}
            {project.images.length > 0 ? (
              <section className="detail-section detail-body__wide">
                <h2>Evidence</h2>
                <EvidenceGallery items={[...project.images]} />
              </section>
            ) : null}

            <nav className="detail-nav detail-body__wide" aria-label="Project navigation">
              {previous ? (
                <Link href={`/work/${previous.slug}`}>Previous: {previous.title}</Link>
              ) : (
                <span />
              )}
              {next ? <Link href={`/work/${next.slug}`}>Next: {next.title}</Link> : <span />}
            </nav>
          </div>
        </div>
        <ContactBand />
      </main>
    </>
  );
}
