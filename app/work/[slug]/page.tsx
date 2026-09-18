import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactBand } from '@/components/ui/ContactBand';
import { ProjectMeta } from '@/components/work/ProjectMeta';
import { OutcomeFigure } from '@/components/work/OutcomeFigure';
import { adjacentProjects, attribution, getAllProjects, getProject } from '@/lib/projects';

export function generateStaticParams() {
  return getAllProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    openGraph: { title: project.title, description: project.summary },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const { previous, next } = adjacentProjects(slug);

  return (
    <>
      <SiteHeader current="/work" />
      <main id="content">
        <div className="wrap">
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

          <OutcomeFigure outcome={project.outcome} />

          <div className="mdx" style={{ paddingTop: '20px' }}>
            <MDXRemote source={project.body} />
          </div>

          <section className="detail-section" style={{ paddingTop: '44px' }}>
            <h2>Stack</h2>
            <ul
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px 22px',
                fontSize: 'var(--text-body)',
                color: 'var(--color-muted)',
              }}
            >
              {project.stack.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          {/* Evidence is omitted entirely when images is empty — never a placeholder box. */}
          {project.images.length > 0 ? (
            <section className="detail-section" style={{ paddingTop: '44px' }}>
              <h2>Evidence</h2>
              <ul style={{ display: 'grid', gap: '26px' }}>
                {project.images.map((image) => (
                  <li key={image.src}>
                    <figure>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image.src} alt={image.alt} style={{ width: '100%' }} />
                      {image.caption ? (
                        <figcaption
                          style={{
                            marginTop: '10px',
                            fontSize: 'var(--text-small)',
                            color: 'var(--color-faint)',
                          }}
                        >
                          {image.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <nav
            aria-label="Project navigation"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '22px',
              marginTop: '64px',
              paddingTop: '26px',
              borderTop: '1px solid var(--color-rule)',
              fontSize: 'var(--text-body)',
            }}
          >
            {previous ? (
              <Link href={`/work/${previous.slug}`}>Previous: {previous.title}</Link>
            ) : (
              <span />
            )}
            {next ? <Link href={`/work/${next.slug}`}>Next: {next.title}</Link> : <span />}
          </nav>
        </div>
        <ContactBand />
      </main>
    </>
  );
}
