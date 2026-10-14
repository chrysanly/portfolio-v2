import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { BackLink } from '@/components/ui/BackLink';
import { ContactBand } from '@/components/ui/ContactBand';
import { EvidenceGallery } from '@/components/work/EvidenceGallery';
import { ArrivalFocus } from '@/components/ui/ArrivalFocus';
import { caseStudySource } from '@/lib/case-study';
import { adjacentProjects, attribution, getAllProjects, getProject } from '@/lib/projects';
import { PROJECT_TYPE_LABELS } from '@/lib/schema';

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
  const all = await getAllProjects();
  const index = all.findIndex((p) => p.slug === slug);
  const pad = (n: number) => String(n).padStart(2, '0');
  const context = project.confidential
    ? `Client under NDA · ${project.sector}`
    : attribution(project);

  return (
    <>
      <SiteHeader current="/work" />
      <main id="content">
        <div className="wrap cs">
          {/*
            Back where Back is meaningful, Home otherwise — a project page is
            always arrived at from somewhere, usually mid-scroll through the
            showcase, and returning to the top of the home page instead of to
            the panel is the whole complaint.
          */}
          <div className="arrive" style={{ '--i': 0 } as React.CSSProperties}>
            <BackLink allowHistory />
          </div>

          {/*
            The hero: the showcase panel, opened. Number, title and the tinted
            system box, then the facts, on the left; the full stack on the
            right. Both settle on one baseline above a rule, so the hero reads
            as one block. The screens are in "Screens from the build" below.
          */}
          <div className="cs__hero arrive" style={{ '--i': 1 } as React.CSSProperties}>
            <div>
              <p className="story__head">
                <span className="story__n">
                  <Link href="/work">Case study</Link> · {pad(index + 1)} / {pad(all.length)}
                </span>
              </p>
              <h1 id="cs-title" className="story__title" tabIndex={-1}>
                {project.title}
              </h1>
              <p className="visually-hidden">{attribution(project)}</p>

              <div className="system">
                <p className="system__kind">
                  <span>{PROJECT_TYPE_LABELS[project.type]} system</span>
                  {context ? <span>{context}</span> : null}
                </p>
                <p className="system__desc">{project.summary}</p>
              </div>

              <dl className="cs__meta">
                <div>
                  <dt>Year</dt>
                  <dd>{project.year}</dd>
                </div>
                <div>
                  <dt>Role</dt>
                  <dd>{project.role}</dd>
                </div>
              </dl>
            </div>

            {project.stack.length > 0 ? (
              <section className="cs__stack" aria-labelledby="cs-stack">
                <h2 id="cs-stack" className="story__label">
                  Stack
                </h2>
                <ul className="chips">
                  {project.stack.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          {/* The problem beside what was done. Nothing is clamped here: this
              is where the detail lives. */}
          {project.problem || project.contributions.length > 0 ? (
            <div
              className="cs__cols arrive"
              data-cols={project.problem && project.contributions.length > 0 ? 2 : 1}
              style={{ '--i': 2 } as React.CSSProperties}
            >
              {project.problem ? (
                <div className="problem">
                  <h2 className="story__label">The problem</h2>
                  <p>{project.problem}</p>
                </div>
              ) : null}
              {project.contributions.length > 0 ? (
                <div className="did">
                  <h2 className="story__label">What I did</h2>
                  <ul>
                    {project.contributions.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}

          <ArrivalFocus targetId="cs-title" />
          <div
            className="detail-body detail-body--cs arrive"
            style={{ '--i': 3 } as React.CSSProperties}
          >
            <div className="mdx">
              <MDXRemote source={caseStudySource(project)} />
            </div>

            {project.engineeringDepth ? (
              <section className="detail-section detail-depth">
                <h2>Engineering depth</h2>
                <p>{project.engineeringDepth}</p>
              </section>
            ) : null}

            {/* Evidence is omitted entirely when images is empty — never a placeholder box. */}
            {project.images.length > 0 ? (
              <section className="detail-section detail-body__wide">
                <h2>Screens from the build</h2>
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
