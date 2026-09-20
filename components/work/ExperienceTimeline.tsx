import { site } from '@/content/site';
import { getJourney, getRoles } from '@/lib/journey';
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
 * Projects attach to a role by the role string — the only correspondence the
 * source states. A project role may *extend* the employment role ("Web
 * Developer / Full-stack lead" belongs to the "Web Developer" post) but never
 * the reverse, so a broader project role can never claim a narrower job.
 *
 * The NDA marker is per project, not per employer: §5.8 is explicit that
 * employment is already public and it is project detail that is restricted.
 */
export function ExperienceTimeline() {
  const projects = getAllProjects();

  // Already oldest-first, whether it came from the admin or from the
  // hardcoded fallback — lib/journey.ts reconciles the two.
  const stops: JourneyStop[] = getJourney().map((stop) => {
    const mine =
      stop.kind === 'education'
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

        <p className="track__foot">
          {site.yearsExperience} years, {getRoles().length} companies. Based in {site.location}.
        </p>
      </div>
    </section>
  );
}
