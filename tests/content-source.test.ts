import { afterEach, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readContentPayload } from '../lib/content-source';
import { API_URL, configureApi, json, mockFetch, payload } from './fixtures';

const realFetch = globalThis.fetch;

describe('readContentPayload', () => {
  beforeEach(configureApi);

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('reads the API with the build token', async () => {
    const calls = mockFetch(() => json(payload()));

    const result = await readContentPayload();

    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, `${API_URL}/api/v1/content`);
    assert.equal(
      (calls[0].init.headers as Record<string, string>).Authorization,
      'Bearer test-token',
    );
    assert.equal(result.projects?.length, 1);
  });

  it('throws when the API URL is not set — there is no other source', async () => {
    delete process.env.PORTFOLIO_API_URL;
    mockFetch(() => json(payload()));

    await assert.rejects(readContentPayload(), /PORTFOLIO_API_URL is not set/);
  });

  it('throws when the token is not set', async () => {
    delete process.env.PORTFOLIO_API_TOKEN;
    mockFetch(() => json(payload()));

    await assert.rejects(readContentPayload(), /PORTFOLIO_API_TOKEN is not set/);
  });

  it('throws, naming the URL, when the API is unreachable', async () => {
    mockFetch(() => {
      throw new TypeError('fetch failed');
    });

    await assert.rejects(readContentPayload(), /\[content\] Could not reach .*fetch failed/);
  });

  it('throws on a non-200 answer instead of caching it', async () => {
    mockFetch(() => json({ message: 'Unauthenticated.' }, 401));

    await assert.rejects(readContentPayload(), /answered 401/);
  });

  it('throws when the response is not a content payload', async () => {
    mockFetch(() => new Response('<html>login</html>', { status: 200 }));

    await assert.rejects(readContentPayload(), /did not return a content payload/);
  });
});
