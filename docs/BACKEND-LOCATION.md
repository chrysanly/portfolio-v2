# Where "the backend" is

When Chrys says **"the backend"**, **"the API"**, or **"the admin"** on this
project, he means the `chrysanly/portfolio-api` checkout — the Laravel 12,
Inertia and React app that holds the admin UI and the content API. It is a
**separate repository and a separate working directory**; nothing in it is
committed from this repo, and vice versa.

## Where it is checked out, per machine

Paths are machine-specific. Match the machine first, then use its row.

| Machine                             | This repo                                         | The backend                                           |
| ----------------------------------- | ------------------------------------------------- | ----------------------------------------------------- |
| **Work PC** (Windows, user `admin`) | `C:\Users\admin\Desktop\Chrys\Personal\portfolio` | `C:\Users\admin\Desktop\Chrys\Personal\portfolio-api` |
| **Home PC**                         | _not recorded yet — Chrys will fill this in_      | _not recorded yet_                                    |

If the current working directory does not match any row above, do not guess a
backend path: the two repos are checked out side by side, so the backend is the
sibling directory `../portfolio-api`. Verify it exists before acting on it, and
ask Chrys if it does not.

|                      | This repo                         | The backend                                              |
| -------------------- | --------------------------------- | -------------------------------------------------------- |
| Remote               | `chrysanly/portfolio-v2`          | `chrysanly/portfolio-api`                                |
| Stack                | Next.js 15, React 19, Tailwind v4 | Laravel 12, Inertia, React                               |
| Runs on              | Vercel, static                    | a PHP host; locally Herd at `https://portfolio-api.test` |
| Its own instructions | `CLAUDE.md` here                  | `CLAUDE.md` there — read it first                        |

## Working in it

- Read `portfolio-api/CLAUDE.md` before changing anything there. Its rules win
  inside that directory.
- The specification for the backend lives **here**, in
  [`08-BACKEND.md`](08-BACKEND.md). §2 (build-time only, never runtime) is the
  constraint that must survive every change on either side.
- `php` must be 8.4. On the work PC, if the `php` on PATH reports 7.4, use
  Herd's binary: `~/.config/herd/bin/php84/php.exe artisan ...`
- Build tokens are issued there:
  `php artisan portfolio:build-token --email=...`, then pasted into
  `.env.local` here as `PORTFOLIO_API_TOKEN`.

## What crosses between them

Only HTTP, and only in one direction: this site reads
`GET /api/v1/content` from the backend at build time, authenticated with a
`content:read` token. A change to that payload's shape is a change to both
repos — `lib/schema.ts` here and the API resources there.
