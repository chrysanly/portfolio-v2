/**
 * What this site is built out of, drawn as the path it describes.
 *
 * Asked for on 2026-09-22, for one reader in particular: an engineering
 * manager who wants to know whether the person who wrote the portfolio
 * understands the infrastructure under it. Everything else on the site is
 * work done for other people behind an NDA — this is the one system a visitor
 * is standing inside while they read about it.
 *
 * It was four labelled columns and a paragraph, which floated in the middle of
 * the full-height section it was given. This is the same facts as a request
 * path, because that is what Chrys's sentence already describes: a frontend
 * that consumes an API that is backed by a database, with a CDN serving media
 * beside it. The connectives on the line — "dynamically consumes", "backed
 * by" — are lifted from that sentence, so the diagram reads as the sentence
 * and the paragraph below it reads as the caption.
 *
 * The prose is his, verbatim, and is the only copy on the site not drawn from
 * `docs/07-SOURCE-CONTENT.md`: it describes this repository, which is a fact
 * the site can verify about itself. A constant rather than a content field
 * because it changes when the deployment changes, not when the content does.
 *
 * `<ol>`, deliberately: three hops in order is a real sequence, which is the
 * only thing that earns numbered or ordered markup. Cloudinary is not a
 * fourth hop — media never travels through the API — so it hangs off the
 * frontend as a branch rather than joining the line.
 */

/** The request path, in order. `edge` is how this hop reaches the next one. */
const PATH = [
  { name: 'Next.js', role: 'frontend, deployed on Vercel', edge: 'dynamically consumes' },
  { name: 'Laravel', role: 'custom REST API, hosted on Render', edge: 'backed by' },
  { name: 'Neon PostgreSQL', role: 'serverless database', edge: null },
] as const;

const BRANCH = { name: 'Cloudinary', role: 'optimized static assets and project media' };

const LEAD = 'A decoupled, headless production application.';

const PROSE =
  'This portfolio is engineered as a decoupled, headless production application. ' +
  'The fast, SEO-optimized frontend is built with Next.js and deployed on Vercel. ' +
  'It dynamically consumes a custom REST API built with Laravel, hosted on Render, ' +
  'and backed by a serverless Neon PostgreSQL database. Static assets and project ' +
  'media are optimized and served through Cloudinary.';

/**
 * Two placements, because the section is doing two different jobs.
 *
 * `page` is the home route: a screen of its own between the work and the
 * contact band, with the rule above it as the boundary between the two.
 *
 * `detail` is /about, where it is one more entry in a column that already
 * reads Experience, Education, Languages, Availability. Chrys asked for it to
 * match those: no rule, no screenful of height, the same 64px above the
 * heading as they have between each other. A banded full-height section in
 * the middle of a list of details was the thing that looked wrong.
 */
export function ArchitectureNote({ variant = 'page' }: { variant?: 'page' | 'detail' }) {
  const detail = variant === 'detail';

  const body = (
    <>
      <h2 id="arch-heading" className={detail ? undefined : 'section-label'}>
        Engineering stack and architecture
      </h2>

      <p className="arch__lead">{LEAD}</p>

      <ol className="arch__path">
        {PATH.map((hop) => (
          <li key={hop.name} className="arch__hop">
            <b className="arch__name">{hop.name}</b>
            <span className="arch__role">{hop.role}</span>
            {/*
             * The connective belongs to the segment leaving this hop, so it
             * is drawn from this cell rather than from the next one — and it
             * is hidden from assistive tech, which reads the paragraph
             * below as one continuous sentence instead.
             */}
            {hop.edge ? (
              <em className="arch__edge" aria-hidden="true">
                {hop.edge}
              </em>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="arch__branch">
        <b className="arch__name arch__name--branch">{BRANCH.name}</b>
        <span className="arch__role">{BRANCH.role}</span>
      </div>

      <p className="arch__prose">{PROSE}</p>
    </>
  );

  /*
   * On /about the surrounding page already provides the `.wrap`, so this must
   * not add a second one — nesting them would indent the content past the
   * column every other entry sits in and cap its width twice.
   */
  if (detail) {
    return (
      <section className="detail-section arch arch--detail" aria-labelledby="arch-heading">
        {body}
      </section>
    );
  }

  return (
    <section className="arch" aria-labelledby="arch-heading">
      <div className="wrap arch__inner">{body}</div>
    </section>
  );
}
