import https from 'node:https';
import { URL } from 'node:url';
import type { ContactInput } from './schema';

/**
 * Copies a contact message to the Laravel inbox.
 *
 * docs/08-BACKEND.md §5: the second of the two delivery paths. The email in
 * lib/mail.ts is what reaches a human; this is what makes the message
 * recoverable when that fails, and what puts anything in the admin's inbox.
 *
 * Returns whether the message landed, so the route can tell the difference
 * between "email failed but it is safely stored" and "it is gone".
 *
 * Unset PORTFOLIO_API_URL and this does nothing at all, which is the correct
 * behaviour with no backend deployed.
 */

/** The visitor is waiting on this, and their message is already sent. */
const TIMEOUT_MS = 4000;

/**
 * Whether this host is one that cannot have a real certificate.
 *
 * Herd serves `*.test` over HTTPS with a self-signed certificate, which Node
 * refuses — so in development the inbox is unreachable and the form appears
 * broken. These names cannot be resolved publicly, so trusting one is not a
 * decision that can follow the code into production: a real deployment points
 * at a real hostname and takes the verified path below.
 */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.test') ||
    hostname.endsWith('.localhost')
  );
}

export async function archiveContactMessage(message: ContactInput): Promise<boolean> {
  const base = process.env.PORTFOLIO_API_URL?.trim().replace(/\/+$/, '');
  if (!base) return false;

  const body = JSON.stringify({
    name: message.name,
    email: message.email,
    company: message.company || null,
    message: message.message,
  });

  let url: URL;
  try {
    url = new URL(`${base}/api/v1/messages`);
  } catch {
    console.warn(`[contact] PORTFOLIO_API_URL is not a valid URL: ${base}`);
    return false;
  }

  const selfSigned =
    process.env.NODE_ENV !== 'production' &&
    url.protocol === 'https:' &&
    isLocalHost(url.hostname);

  try {
    const ok = selfSigned
      ? await postIgnoringLocalCertificate(url, body)
      : await post(url, body);

    if (!ok) console.warn('[contact] archive was rejected by the API');

    return ok;
  } catch (error) {
    console.warn('[contact] could not archive the message:', (error as Error).message);
    return false;
  }
}

/** The normal path, and the only one production ever takes. */
async function post(url: URL, body: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body,
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) console.warn(`[contact] archive returned ${response.status}`);

    return response.ok;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The development path, using Node's https module so the relaxed check applies
 * to **this request only**.
 *
 * `NODE_TLS_REJECT_UNAUTHORIZED=0` would have been one line, and it turns off
 * certificate verification for the entire process — including the build-time
 * content fetch and anything else the server talks to. A per-request agent
 * keeps the exception where it belongs.
 */
function postIgnoringLocalCertificate(url: URL, body: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = https.request(
      {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        rejectUnauthorized: false,
        timeout: TIMEOUT_MS,
      },
      (response) => {
        // Drained even though it is unread: an unconsumed response keeps the
        // socket open and the process will not settle.
        response.resume();

        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          console.warn(`[contact] archive returned ${status}`);
        }

        response.on('end', () => resolve(status >= 200 && status < 300));
      },
    );

    request.on('timeout', () => request.destroy(new Error(`no response in ${TIMEOUT_MS}ms`)));
    request.on('error', reject);
    request.end(body);
  });
}
