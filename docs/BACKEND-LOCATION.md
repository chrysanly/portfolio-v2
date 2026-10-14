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
| **Work PC** (Windows, user `admin`) | `D:\Chrys\Personal\portfolio repo\portfolio` | `D:\Chrys\Personal\portfolio repo\portfolio-api` |
| **Home PC**                         | `D:\Projects\portfolio-v2`                        | `D:\Projects\portfolio-api`                           |

If the current working directory does not match any row above, do not guess a
backend path: the two repos are checked out side by side, so the backend is the
sibling directory `../portfolio-api`. Verify it exists before acting on it, and
ask Chrys if it does not.

|                      | This repo                         | The backend                                              |
| -------------------- | --------------------------------- | -------------------------------------------------------- |
| Remote               | `chrysanly/portfolio-v2`          | `chrysanly/portfolio-api`                                |
| Stack                | Next.js 15, React 19, Tailwind v4 | Laravel 12, Inertia, React                               |
| Runs on              | Vercel, cached pages              | a PHP host; locally Herd at `https://portfolio-api.test` |
| Its own instructions | `CLAUDE.md` here                  | `CLAUDE.md` there — read it first                        |

## Working in it

- Read `portfolio-api/CLAUDE.md` before changing anything there. Its rules win
  inside that directory.
- The specification for the backend lives **here**, in
  [`08-BACKEND.md`](08-BACKEND.md). §2 is the content model both sides depend
  on: the database is the only source, the site caches every page and
  refreshes on save, and a failed read throws rather than falling back.
- `php` must be 8.4. **`~/.config/herd/bin/php84/php.exe` is the answer on both
  machines** — it is a real `.exe`, so it works from Git Bash and PowerShell
  alike — but for different reasons, and the home PC's reason is a trap:

  | Machine     | Why a bare `php` fails                                          |
  | ----------- | --------------------------------------------------------------- |
  | **Work PC** | the `php` on PATH reports **7.4**, which cannot run this app    |
  | **Home PC** | Herd's `bin` is on PATH but holds only `.bat` shims, no `php`   |

  On the home PC the version is fine — `php.bat` is already 8.4. The shebang is
  what breaks: Git Bash will not use a `.bat` to satisfy `#!/usr/bin/env php`,
  so every Composer-installed binary dies with
  `/usr/bin/env: 'php': No such file or directory`. That covers
  `vendor/bin/pint`, `vendor/bin/pest` and `php artisan test`. Either use the
  `php84/php.exe` path above, or run them from PowerShell as
  `& "$env:USERPROFILE\.config\herd\bin\php.bat" vendor/bin/pint --test app`.

- Build tokens are issued there, with the same binary:
  `~/.config/herd/bin/php84/php.exe artisan portfolio:build-token --email=...`,
  then pasted into `.env.local` here as `PORTFOLIO_API_TOKEN`.

## What crosses between them

Only HTTP. This site reads `GET /api/v1/content` from the backend,
authenticated with a `content:read` token, and caches the pages it renders;
the backend calls this site's `/api/revalidate` with a shared secret when a
published project is saved. A change to the payload's shape is a change to
both repos — `lib/schema.ts` here and the API resources there.
