import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { CONTENT_TAG, clearContentCache } from '@/lib/content-source';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Refreshes the site's content without a redeploy.
 *
 * The backend calls this when a published project is saved, and the admin's
 * "Sync site" button calls it on demand. It is what makes the content editable
 * at runtime while every page a visitor requests is still served from cache —
 * see the header of lib/projects.ts.
 *
 * Authenticated with a shared secret rather than the Sanctum build token,
 * because they are different permissions: the build token reads content, this
 * one spends work on the server. Anyone who could call this freely could make
 * the site refetch on demand.
 */
export async function POST(request: Request) {
  const expected = process.env.REVALIDATE_SECRET?.trim();

  if (!expected) {
    return NextResponse.json(
      { ok: false, message: 'REVALIDATE_SECRET is not set on the site.' },
      { status: 503 },
    );
  }

  /*
   * Accepted from a header or the body: the header is the tidier form, and the
   * body is what a webhook UI that cannot set headers will manage.
   */
  const header = request.headers.get('x-revalidate-secret');
  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const supplied = header ?? (typeof body.secret === 'string' ? body.secret : null);

  if (supplied !== expected) {
    // Deliberately terse. A wrong secret gets no detail about why.
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  revalidateTag(CONTENT_TAG);
  clearContentCache();

  /*
   * The tag alone refreshes the data, but the pages that render it are
   * statically cached too, so they have to be told as well. Listed explicitly
   * rather than revalidating layout-wide, which would also throw away pages
   * that have nothing to do with project content.
   */
  for (const path of ['/', '/work', '/about']) {
    revalidatePath(path);
  }
  revalidatePath('/work/[slug]', 'page');
  revalidatePath('/work/type/[type]', 'page');

  return NextResponse.json({
    ok: true,
    revalidatedAt: new Date().toISOString(),
  });
}
