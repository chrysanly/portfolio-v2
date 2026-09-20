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
              {/*
                Four ways through, each with its own mark — docs/02-TRD.md §1
                allows no icon package, so every glyph here is inline SVG.
                WhatsApp and the phone are the same number and both are
                restricted to this route; LinkedIn is not.
              */}
              <ul>
                <li>
                  <a href={`mailto:${site.email}`}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="m3.6 6.6 8.4 6 8.4-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    {site.email}
                  </a>
                </li>
                <li>
                  <a href={`tel:${site.phone.replace(/\s/g, '')}`}>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M6.3 3.5h3l1.5 3.8-2 1.4a12 12 0 0 0 5.5 5.5l1.4-2 3.8 1.5v3a1.8 1.8 0 0 1-2 1.8A15.8 15.8 0 0 1 4.5 5.5a1.8 1.8 0 0 1 1.8-2Z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {site.phone}
                  </a>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${site.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`WhatsApp ${site.phone}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        fill="currentColor"
                        d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 1.9a8.1 8.1 0 1 1-4.2 15l-.3-.2-3 .8.8-2.9-.2-.3A8.1 8.1 0 0 1 12 3.9Zm-3.3 4c-.2 0-.4 0-.6.3-.2.3-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.6 4 3.5 1.9.7 2.3.6 2.8.6.5 0 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3l-1.8-.9c-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.5-1.9-.2-.2 0-.4.1-.5l.4-.5c.1-.2.2-.3.3-.5v-.5l-.8-1.7c-.2-.4-.4-.4-.5-.4h-.5Z"
                      />
                    </svg>
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href={site.links.linkedin} target="_blank" rel="noreferrer">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        fill="currentColor"
                        d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5ZM3 9.5h4v11H3v-11Zm6.5 0h3.8v1.5a4.2 4.2 0 0 1 3.8-2c3 0 4.4 1.8 4.4 5.1v6.4h-4v-5.7c0-1.6-.6-2.5-1.9-2.5-1.1 0-1.9.7-2.2 1.7v6.5h-4v-11Z"
                      />
                    </svg>
                    LinkedIn
                  </a>
                </li>
                <li className="contact__where">
                  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path
                      d="M12 21s6.5-5.6 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.4 12 21 12 21Z"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="10.5" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  {site.location}
                </li>
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
