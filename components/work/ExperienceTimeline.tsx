import { getJourney } from '@/lib/journey';
import { getAllProjects } from '@/lib/projects';
import { JourneyTimeline, type JourneyStop } from './JourneyTimeline';

/**
 * The journey: college through to the current post.
 *
 * Read forwards, oldest first, because that is the direction a career is
 * actually walked — `07-SOURCE-CONTENT.md` §4 lists it newest first, which is
 * CV order, not narrative order.
 *
 * The degree opens the run. Chronologically it overlaps the first job — §1
 * gives 2020 as the graduation year and §4 has him working as a junior
 * developer from Nov 2018 — but it is where the story starts, so it leads and
 * the period label carries the year that settles the order.
 *
 * Projects attach to a stop by the relation the backend states — each stop
 * carries the slugs of the work built there, set on the journey screen in the
 * admin.
 *
 * They used to be matched by the role string, which made the job title
 * load-bearing: rewording either side emptied a stop on the public site with
 * nothing anywhere to report it. That matching survives as a fallback only,
 * for a snapshot written before the relation existed — the MDX content and the
 * hardcoded `content/site.ts` journey both still rely on it.
 *
 * The NDA marker is per project, not per employer: §5.8 is explicit that
 * employment is already public and it is project detail that is restricted.
 */
export async function ExperienceTimeline() {
  const projects = await getAllProjects();

  // Already oldest-first, whether it came from the admin or from the
  // hardcoded fallback — lib/journey.ts reconciles the two.
  const journey = await getJourney();

  /*
   * Decided once, for the whole timeline, and not per stop.
   *
   * Asking "does this stop carry slugs" would make an emptied stop
   * indistinguishable from an old payload — and the fallback would then
   * helpfully re-guess the very projects someone had just detached. Whether
   * *anything* in the payload states a relation is the honest test of which
   * source is in play.
   */
  const stated = journey.some((stop) => stop.projects.length > 0);

  const stops: JourneyStop[] = journey.map((stop) => {
    const mine = stated
      ? // The backend's own order: the slugs arrive in the order the site
        // lists work, and re-sorting here would lose it.
        stop.projects
          .map((slug) => projects.find((p) => p.slug === slug))
          .filter((p): p is (typeof projects)[number] => p !== undefined)
      : stop.kind === 'education'
        ? []
        : projects.filter((p) => p.role === stop.title || p.role.startsWith(`${stop.title} `));

    return {
      kind: stop.kind === 'education' ? 'education' : 'role',
      period: stop.period,
      title: stop.title,
      place: `${stop.organisation}, ${stop.location}`,
      learned: stop.learned ?? undefined,
      phase: stop.phase ?? undefined,
      // Everything he worked with there, de-duplicated across that stop's
      // projects and kept in the order the source lists it.
      tech: Array.from(new Set(mine.flatMap((p) => p.stack))),
      work: mine.map((p) => ({
        slug: p.slug,
        title: p.title,
        summary: p.summary,
        confidential: p.confidential,
        contributions: p.contributions,
      })),
    };
  });

  return (
    <section className="track-band" aria-labelledby="experience-heading">
      <div className="wrap">
        <h2 id="experience-heading" className="section-label">
          The journey
        </h2>

        <JourneyTimeline stops={stops} />
      </div>
    </section>
  );
}
