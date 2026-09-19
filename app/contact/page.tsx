import type { Metadata } from 'next';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { ContactForm } from '@/components/ui/ContactForm';
import { BackLink } from '@/components/ui/BackLink';
import { site } from '@/content/site';

export const metadata: Metadata = {
  title: 'Contact',
  description: `Get in touch with ${site.name}, ${site.role} in ${site.location}.`,
};

/**
 * One screen, no scrolling.
 *
 * The form used to run down the page with the direct details below the fold and
 * half the width empty beside it, so the two ways of getting in touch were
 * never visible at the same time. They are a pair, and a page whose entire job
 * is "get in touch" should not need scrolling to show both.
 *
 * This is also the only route on which the phone number appears —
 * docs/07-SOURCE-CONTENT.md §1.
 */
export default function ContactPage() {
  return (
    <>
      <SiteHeader current="/contact" />

      <main id="content" className="contact">
        <div className="wrap contact__grid">
          <div className="contact__aside">
            <BackLink />

            <h1 className="section-label">Contact</h1>

            <p className="contact__lead">Tell me what you are trying to build or fix.</p>

            <div className="contact__direct">
              <h2 className="label">Direct</h2>
              <ul>
                <li>
                  <a href={`mailto:${site.email}`}>{site.email}</a>
                </li>
                <li>
                  <a href={`tel:${site.phone.replace(/\s/g, '')}`}>{site.phone}</a>
                </li>
                <li className="contact__where">{site.location}</li>
              </ul>
            </div>
          </div>

          <div className="contact__form">
            <ContactForm email={site.email} />
          </div>
        </div>
      </main>
    </>
  );
}
