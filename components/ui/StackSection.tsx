import { skillGroups } from '@/content/site';
import { StackTools } from '@/components/work/StackTools';
import { buildTabs } from '@/lib/stack';
import '@/app/stack.css';

/**
 * "What I build with": every language, framework, database, tool and AI from
 * Chrys's resume, with its logo. The list is docs/07-SOURCE-CONTENT.md §3,
 * the same one About shows as words.
 *
 * Simple Icons logos are drawn as CSS masks in their brand colour on a light
 * badge; the few with no Simple Icons file are hand-drawn images
 * (`drawnLogos`). Practices show their group's icon. Filtering, "View more"
 * and the phone drag live in StackTools; this part is server-rendered.
 */
export function StackSection() {
  return (
    <section className="stack" aria-labelledby="stack-title">
      <div className="wrap">
        <p className="section-label">Stack &amp; tools</p>
        <h2 id="stack-title" className="stack__title">
          What I build with.
        </h2>
        <p className="stack__lede">
          What I build with day to day, from the framework to the payment gateway it talks to.
        </p>

        <StackTools tabs={buildTabs(skillGroups)} groupCount={skillGroups.length} />
      </div>
    </section>
  );
}
