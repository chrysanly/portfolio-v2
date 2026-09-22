import { ImageResponse } from 'next/og';
import { attribution, getAllProjects, getProject } from '@/lib/projects';
import { site } from '@/content/site';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#1A1A18';
const GROUND = '#ECEAE4';
const MUTED = '#55524B';
const ACCENT = '#7B2D2D';

export async function generateStaticParams() {
  return (await getAllProjects()).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = await getProject(slug);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        background: GROUND,
        color: INK,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 64,
        fontFamily: 'serif',
      }}
    >
      <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>
        {project ? attribution(project) : site.name}
      </div>
      <div style={{ display: 'flex', fontSize: 84, lineHeight: 1.1, maxWidth: 900 }}>
        {project?.title ?? site.name}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          borderTop: `3px solid ${INK}`,
          paddingTop: 22,
          fontSize: 26,
          color: MUTED,
        }}
      >
        <span>{site.name}</span>
        <span style={{ color: ACCENT }}>{project?.outcome.value ?? ''}</span>
      </div>
    </div>,
    size,
  );
}
