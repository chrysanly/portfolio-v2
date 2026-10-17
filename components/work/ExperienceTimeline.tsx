import { getJourney, type JourneyEntry } from '@/lib/journey';
import { getAllProjects } from '@/lib/projects';
import { type JourneyChapter, JourneyTimeline } from './JourneyTimeline';

/**
 * "My journey": school first, then each post in turn, to today.
 *
 * Read forwards, oldest first, because that is the direction a life is
 * walked — the degree leads even though the first job overlaps it, because it
 * is where the story starts.
 *
 * Every word in a chapter comes from the stop the admin holds: the sky title
 * is its `phase`, the card is its title, organisation, place, period and
 * "what I took from it", and the spoken line is built from those same facts.
 * Nothing here is new copy. When the admin gains a narration field of its
 * own, that is what `say` should become.
 *
 * Projects attach to a stop by the slugs the backend states; the old match
 * on the role string survives only as a fallback when no stop states any.
 */

const PLACEHOLDER = /^\s*\[.*\]\s*$/;

/** One spoken line, first person, from the stop's own facts. */
function sayFor(stop: JourneyEntry): string {
  if (stop.kind === 'education') {
    return `This is where it started: ${stop.title} at ${stop.organisation}.`;
  }
  const present = /present/i.test(stop.period);
  return present
    ? `Today: ${stop.title} at ${stop.organisation}, ${stop.location}.`
    : `${stop.period}: ${stop.title} at ${stop.organisation}.`;
}

export async function ExperienceTimeline() {
  const projects = await getAllProjects();
  const journey = await getJourney();

  // Decided once for the whole journey: whether anything states a relation.
  const stated = journey.some((stop) => stop.projects.length > 0);

  const chapters: JourneyChapter[] = journey.map((stop) => {
    const mine = stated
      ? stop.projects
          .map((slug) => projects.find((p) => p.slug === slug))
          .filter((p): p is (typeof projects)[number] => p !== undefined)
      : stop.kind === 'education'
        ? []
        : projects.filter((p) => p.role === stop.title || p.role.startsWith(`${stop.title} `));

    const learned = stop.learned?.trim() || null;
    // The card's sector, summary, "What I did" and tools come from the first
    // project built here — facts the site already publishes, nothing new.
    const lead = mine[0];

    return {
      kind: stop.kind,
      // The no-JS list's kicker. Not `phase`: the admin no longer has a field
      // for it, so the site cannot depend on it.
      chapter: stop.kind === 'education' ? 'School' : 'Work',
      title: stop.title,
      org: stop.organisation,
      loc: stop.location,
      period: stop.period,
      learned,
      // Admin text is sanitised HTML; older rows and placeholders are plain.
      learnedIsHtml: !!learned && !PLACEHOLDER.test(learned) && learned.startsWith('<'),
      say: sayFor(stop),
      projects: mine.map((p) => ({ title: p.title, href: `/work/${p.slug}` })),
      sector: lead?.sector ?? null,
      short: lead?.summary,
      did: lead?.contributions ?? [],
      tools: lead?.stack.slice(0, 5) ?? [],
    };
  });

  if (chapters.length === 0) return null;

  return (
    <section className="jw" aria-labelledby="journey-heading">
      <div className="wrap jw-intro">
        <p className="jw-kicker">The Journey</p>
        <h2 id="journey-heading" className="jw-title">
          My journey
        </h2>
        <p className="jw-lede">
          {chapters.length === 6 ? 'Six' : chapters.length} stops, in my own words. Scroll, and
          climb with me through them.
        </p>
      </div>

      <JourneyTimeline chapters={chapters} />
    </section>
  );
}
