import { NextResponse } from 'next/server';
import { contactSchema, type ContactInput } from '@/lib/schema';
import { pruneRateLimit, rateLimit } from '@/lib/rate-limit';
import { sendContactMessage } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Minimum time on form, in ms. Filters scripted submissions without a CAPTCHA. */
const MIN_ELAPSED_MS = 3000;

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Rejection order — docs/05-DATA-SCHEMA.md §4:
 * honeypot → 200 and send nothing; rate limit → 429; invalid → 422; mail → 500.
 * No submission is persisted and no submitted value is echoed into HTML.
 */
export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Message could not be sent.' },
      { status: 500 },
    );
  }

  const body = (payload ?? {}) as Record<string, unknown>;

  // Honeypot: do not tell a bot it failed.
  if (typeof body.website === 'string' && body.website !== '') {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  // Time-on-form check, treated the same way as the honeypot.
  const startedAt = Number(body.startedAt);
  if (Number.isFinite(startedAt) && Date.now() - startedAt < MIN_ELAPSED_MS) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  pruneRateLimit();
  if (!rateLimit(clientKey(request)).allowed) {
    return NextResponse.json(
      { ok: false, message: 'Too many messages. Try the direct email.' },
      { status: 429 },
    );
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const errors: Partial<Record<keyof ContactInput, string>> = {};
    for (const issue of parsed.error.issues) {
      const field = issue.path[0] as keyof ContactInput | undefined;
      if (field && !errors[field]) errors[field] = issue.message;
    }
    return NextResponse.json({ ok: false, errors }, { status: 422 });
  }

  try {
    await sendContactMessage(parsed.data);
  } catch {
    return NextResponse.json(
      { ok: false, message: 'Message could not be sent.' },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
