import { ImageResponse } from 'next/og';
import { site } from '@/content/site';

export const runtime = 'nodejs';
export const alt = `${site.name} — ${site.role}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const INK = '#1A1A18';
const GROUND = '#ECEAE4';
const MUTED = '#55524B';

export default function OpengraphImage() {
  return new ImageResponse(
    (
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
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 22 }}>
          <span>{site.location}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 210 }}>
          {site.name
            .toUpperCase()
            .split('')
            .map((ch, i) => (
              <span key={i}>{ch}</span>
            ))}
        </div>
        <div
          style={{
            display: 'flex',
            borderTop: `3px solid ${INK}`,
            paddingTop: 22,
            fontSize: 28,
            color: MUTED,
          }}
        >
          {site.intro.join(' ')}
        </div>
      </div>
    ),
    size,
  );
}
