import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteHeader } from '@/components/ui/SiteHeader';
import { BackLink } from '@/components/ui/BackLink';
import { CvViewer } from '@/components/ui/CvViewer';
import { cvFileName, updatedLabel } from '@/lib/cv';
import { getProfile } from '@/lib/profile';
import { site } from '@/content/site';
import './cv.css';

export const metadata: Metadata = {
  title: 'CV',
  description: `The CV of ${site.name}, ${site.role}.`,
};

/**
 * The uploaded CV, shown as uploaded, with Open and Download beside it.
 *
 * Only ever the backend's copy: `docs/resume.pdf` carries a date of birth and
 * a civil status, which rule 2 of CLAUDE.md keeps off the site.
 */
export default async function CvPage() {
  const profile = await getProfile();
  const cv = profile.cv;
  const fileName = cv ? cvFileName(cv.url) : null;
  const updated = updatedLabel(cv?.updatedAt ?? null);

  return (
    <>
      <SiteHeader current="/cv" />

      <main id="content" className="cv">
        <div className="cv__bar">
          <BackLink />
          <div className="cv__title">
            <h1>Curriculum vitae</h1>
            <p className="cv__meta">
              {profile.fullName}
              {updated ? ` · Updated ${updated}` : null}
            </p>
          </div>

          {cv && fileName ? (
            <div className="cv__actions">
              <a
                className="button cv__open"
                href={cv.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in new tab
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path
                    d="M6 3H3v10h10v-3M9 3h4v4M13 3 7.5 8.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                </svg>
              </a>
              <a className="button button--cv" href={cv.url} download={fileName}>
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                  <path
                    d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13h10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                </svg>
                Download PDF
              </a>
            </div>
          ) : null}
        </div>

        <section className="cv__frame" aria-label="CV preview">
          {cv && fileName ? (
            <CvViewer url={cv.url} fileName={fileName} />
          ) : (
            <div className="cv-state" role="status">
              <p className="cv-state__title">No CV here yet.</p>
              <p className="cv-state__body">Ask for one and it comes by email.</p>
              <div className="cv-state__actions">
                <Link className="button" href="/contact">
                  Send a message
                </Link>
              </div>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
