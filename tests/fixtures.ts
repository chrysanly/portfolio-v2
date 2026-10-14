/**
 * A content payload shaped like the API's `GET /api/v1/content`, and a fake
 * `fetch` that serves it. Every test builds on this and changes the one field
 * it is about.
 */

export const API_URL = 'https://api.example.test';

export function project(overrides: Record<string, unknown> = {}) {
  return {
    slug: 'modular-erp-platform',
    title: 'Modular ERP Platform',
    type: 'erp',
    confidential: true,
    client: null,
    sector: 'Vehicle testing and registration',
    year: 2025,
    role: 'Senior Full-Stack Developer',
    summary: 'Four-module Laravel ERP on one codebase.',
    outcome: { value: '[METRIC]', label: '[what it improved]' },
    stack: ['Laravel', 'MySQL'],
    contributions: ['Role-based middleware', 'Finance module'],
    images: [],
    featured: true,
    order: 1,
    body: '## Problem\n\nText.',
    problem: 'Operations spread across layers.',
    stackNotes: null,
    engineeringDepth: null,
    ...overrides,
  };
}

export function site(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Chrys',
    fullName: 'Chrysanly John Corpuz Roma',
    role: 'Senior Full-Stack Developer',
    location: 'Dubai, UAE',
    yearsExperience: '6+',
    availability: '[X] days weekly',
    email: 'chrys@example.com',
    languages: ['English', 'Filipino'],
    portrait: null,
    cv: null,
    links: { github: 'https://github.com/chrysanly', linkedin: null },
    intro: [
      'Senior full-stack developer',
      'building ERP and automation systems',
      'for companies in Dubai.',
    ],
    notes: ['Strongest in role-based access control.'],
    positioning: 'Senior full-stack developer.',
    meta: {
      discipline: 'ERP platforms',
      architecture: 'SOLID',
      principalStack: 'Laravel',
      databases: 'MySQL',
      security: 'Sanctum',
      currentRole: 'Senior Full-Stack Developer',
    },
    ...overrides,
  };
}

export function stop(overrides: Record<string, unknown> = {}) {
  return {
    kind: 'work',
    title: 'Web Developer',
    organisation: 'ThinkBit Solutions',
    location: 'Philippines',
    period: 'Nov 2022 – Feb 2025',
    phase: 'Full-stack developer',
    learned: '[what I learned here]',
    projects: [],
    order: 1,
    ...overrides,
  };
}

export function payload(overrides: Record<string, unknown> = {}) {
  return {
    generated_at: '2026-10-13T00:00:00Z',
    site: site(),
    projects: [project()],
    journey: [stop()],
    ...overrides,
  };
}

/** Points the content source at the fake API, with a token. */
export function configureApi(): void {
  process.env.PORTFOLIO_API_URL = API_URL;
  process.env.PORTFOLIO_API_TOKEN = 'test-token';
  process.env.PORTFOLIO_API_TIMEOUT = '2000';
}

export interface FetchCall {
  url: string;
  init: RequestInit & { next?: unknown };
}

/** Replaces global fetch with one that answers `respond()`, and records calls. */
export function mockFetch(respond: () => Response | Promise<Response>): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init: (init ?? {}) as FetchCall['init'] });
    return respond();
  }) as typeof fetch;
  return calls;
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
