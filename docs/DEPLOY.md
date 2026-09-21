# Deployment checklist — free tier only

Nothing below costs money. Backend first, then frontend. Tick as you go.

---

## The free stack

| Piece | Service | Free allowance | Catch |
|---|---|---|---|
| Public site | **Vercel Hobby** | generous | none that affects you |
| Admin + API | **Render Web Service** | 750 h/month | sleeps after ~15 min idle |
| Database | **Neon Postgres** | 0.5 GB, no expiry | none |
| Images | **not needed yet** | — | see §1.5 |
| Queue | `sync` — no worker | — | saving is slightly slower |

**Total: $0.** Three things make that work:

**1. You don't need image storage yet.** All 18 images are external placeholder
URLs (`placehold.co`) — **zero files are stored locally**. The API passes
absolute URLs straight through, so Render's ephemeral disk isn't a problem
today. It becomes one when you upload a real screenshot, and that can be solved
then — free options in §1.5.

**2. Use Neon, not Render's Postgres.** Render's free database is deleted after
its trial window; Neon's free tier has no expiry. Both are standard Postgres and
the app cannot tell the difference. Check Render's current policy yourself — it
has changed more than once.

**3. Use `QUEUE_CONNECTION=sync`, not a worker.** Render's Background Workers
are **not** free. With `sync` the revalidation runs inline when you press Save:
the save takes a moment longer, and that is the entire downside for one admin
user.

### What "sleeps after 15 minutes" actually means

Your **public site is unaffected** — it's static on Vercel and only talks to the
API during a build or a sync. Nothing a visitor does touches Render.

It affects you: opening the admin after a quiet spell takes 30–60 seconds to
wake. If you press Save while it's cold the sync may time out — the save still
succeeds, you just press **Sync site** afterwards.

---

## What I set up for you already

- [x] **A `Dockerfile`** — Render has no native PHP runtime, so the app ships as
      a container. FrankenPHP: one process, no nginx + php-fpm wiring. Node is
      confined to a build stage so it isn't in the final image.
- [x] **A `.dockerignore`** so `.env`, `vendor/`, the SQLite file and the tests
      never enter the image.
- [x] **The NDA database constraint now installs on Postgres.** It only covered
      MySQL — on Postgres `confidential` is a real boolean, so `confidential = 1`
      is a type error, not a false condition. Layer one of the three-layer NDA
      guard would silently not have existed in production, on the database that
      actually holds client names.
- [x] **`php artisan storage:link` now runs on container boot.** It was missing
      entirely — not in the Dockerfile and not even locally — so every uploaded
      image would have 404'd on Render: the file on disk, unreachable over HTTP.
- [x] **The build now copies uploaded screenshots into the site** (§1.5), so
      they are served from Vercel rather than from a sleeping free-tier service.
- [x] **`DB_SSLMODE` is configurable.** It was hardcoded to `prefer`, which
      quietly falls back to plaintext; Neon refuses unencrypted connections.
- [x] 88 tests passing, both repos typecheck and lint clean.

> I could not build the container here — there's no Docker on this machine. The
> Dockerfile follows the standard FrankenPHP pattern, but its first real test is
> Render's build log. If it fails, paste the log and I'll fix it.

---

## Which first, and why

**Backend first.** The two apps reference each other, so one has to go first:

- The frontend's build *pulls content from the API*. With no API live it falls
  back to the committed `content/snapshot.json` — the site would work, but with
  today's content frozen in, and you'd redeploy the moment the API appeared.
- The backend does **not** need the frontend. Without `SITE_REVALIDATE_URL` it
  simply doesn't try to sync, which is a normal state.

Deploy the backend, get its URL, deploy the frontend with that URL, then give
the backend the frontend's URL. **Part 3 closes the loop.**

---

## Part 1 — Backend on Render

### 1.1 Push the repo

- [ ] `portfolio-api` has **19 uncommitted files**. Review and commit them.
- [ ] `git push origin main` (remote is already `chrysanly/portfolio-api`)
- [ ] Confirm on GitHub that **`.env` is NOT there**. `.env.example` is, and
      should be — it holds no secrets.

### 1.2 Database on Neon

- [ ] Sign up at **neon.tech** (GitHub login, no card)
- [ ] New project, region closest to you — Frankfurt for Dubai
- [ ] Copy the connection string:
      `postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/dbname?sslmode=require`

### 1.3 Create the web service

- [ ] Render → **New → Web Service** → connect the `portfolio-api` repo
- [ ] Runtime: **Docker** (the `Dockerfile` is in the repo)
- [ ] Instance type: **Free**
- [ ] Leave build and start commands **empty** — the Dockerfile handles both. It
      migrates, caches config and routes, then starts FrankenPHP.

### 1.4 Environment variables on Render

- [ ] `APP_NAME` = `Portfolio Admin`
- [ ] `APP_ENV` = `production`
- [ ] `APP_DEBUG` = `false`  ← **critical.** `true` leaks your env and stack traces.
- [ ] `APP_KEY` = run `php artisan key:generate --show` locally, paste the output
- [ ] `APP_URL` = your Render URL, e.g. `https://portfolio-api.onrender.com`

Database, from the Neon string:

- [ ] `DB_CONNECTION` = `pgsql`
- [ ] `DB_HOST` = the `ep-xxx...neon.tech` host
- [ ] `DB_PORT` = `5432`
- [ ] `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` = the rest
- [ ] `DB_SSLMODE` = `require`  ← Neon refuses the connection without it

Admin access:

- [ ] `ADMIN_EMAIL` = your email
- [ ] `ADMIN_NAME` = `Chrys`
- [ ] `ADMIN_PIN` = **a new PIN, not `010121`.** That one is in our chat history
      and your local `.env`. Login is throttled to 5 attempts a minute, but
      don't reuse a PIN that has been written down.

Session, cache, queue:

- [ ] `SESSION_DRIVER` = `database`
- [ ] `CACHE_STORE` = `database`
- [ ] `QUEUE_CONNECTION` = `sync`  ← **not** `database`. A worker costs money.

Site constants the API serves to the frontend:

- [ ] `PORTFOLIO_NAME`, `PORTFOLIO_FULL_NAME`, `PORTFOLIO_ROLE`,
      `PORTFOLIO_LOCATION`, `PORTFOLIO_YEARS`, `PORTFOLIO_EMAIL`,
      `PORTFOLIO_GITHUB`, `PORTFOLIO_LINKEDIN`
- [ ] Leave `SITE_REVALIDATE_URL` and `SITE_REVALIDATE_SECRET` **empty** — Part 3.

### 1.5 Images — where an upload actually goes

**You do not need S3.** Here is the whole path:

1. You upload in the admin. The file lands in the container at
   `storage/app/public/projects/<name>` and is served at
   `https://<your-api>.onrender.com/storage/projects/<name>`.
2. On the next site build, `scripts/pull-content.mjs` **downloads every image
   the admin is serving into the site's own `public/shots/`** and rewrites the
   payload to point there.
3. The published site therefore serves its screenshots from Vercel's CDN. They
   do not depend on Render being awake, and they survive Render wiping its disk.

That last point is what makes the free tier work. Without it, every screenshot
would be a request to a sleeping service — a visitor waiting 30–60 seconds, or
seeing nothing.

**The trade-off:** a screenshot uploaded after a build is not on the site until
the next one. Uploading already asks for a rebuild, so set the deploy hook in
Part 3 and it happens on its own.

**Still true:** the copy inside Render is ephemeral. If Render redeploys before
the site has pulled a new image, that image is gone and you upload it again.
Rare, and only affects images added between a deploy and a build. If it starts
to annoy you, switch `PORTFOLIO_IMAGES_DISK` to `s3` with Cloudflare R2 (10 GB
free) or Supabase Storage (1 GB free) — both S3-compatible, no code change.

- [ ] Leave `PORTFOLIO_IMAGES_DISK` unset — the default `public` disk is right
- [ ] Set up the deploy hook in Part 3 so uploads reach the site by themselves

Placeholders (`placehold.co`, `picsum`) are left as external URLs on purpose —
they are deliberately third-party and are not baked into the build.

### 1.6 First deploy

- [ ] Deploy. Watch the log for the image building, then `migrate --force`.
- [ ] Open `https://<your-api>.onrender.com/login` → the PIN screen
- [ ] Sign in with your new `ADMIN_PIN`
- [ ] Seed the content — Render **Shell** tab:
      ```
      php artisan db:seed --force
      ```
      Creates the admin account and imports the six projects.
- [ ] Issue the build token:
      ```
      php artisan portfolio:build-token --email=<your admin email>
      ```
      **Copy it — shown once.**

### 1.7 Confirm the API

- [ ] `curl https://<your-api>.onrender.com/api/v1/content` → **401** (good, it's protected)
- [ ] With `-H "Authorization: Bearer <token>"` → **200** and JSON containing
      `site`, `projects`, `journey`

---

## Part 2 — Frontend on Vercel

### 2.1 Push

- [ ] `git push origin main` (remote is already `chrysanly/portfolio-v2`)
- [ ] `content/snapshot.json` **is** committed — deliberate. It's the fallback
      that lets a build succeed when the API is asleep, which on a free tier it
      often will be.

### 2.2 Import

- [ ] Vercel → **Add New → Project** → import `portfolio-v2`
- [ ] Framework preset: **Next.js** (auto-detected)
- [ ] Leave build and output settings alone
- [ ] Do **not** set `NODE_EXTRA_CA_CERTS` — that's for Herd's local certificate
      only, and would point at a file that doesn't exist.

### 2.3 Environment variables on Vercel

- [ ] `PORTFOLIO_API_URL` = `https://<your-api>.onrender.com`
- [ ] `PORTFOLIO_API_TOKEN` = the build token from 1.6
- [ ] `REVALIDATE_SECRET` = generate one: `openssl rand -hex 32`
- [ ] `NEXT_PUBLIC_SITE_URL` = your Vercel URL
- [ ] `PORTFOLIO_API_TIMEOUT` = `30000` ← longer than the 15s default, because a
      sleeping Render service takes 30–60s to wake and the build would otherwise
      give up and use the snapshot
- [ ] `RESEND_API_KEY` + `CONTACT_TO_EMAIL` — for contact emails. Without them
      the form still works and messages land in the admin inbox; you just don't
      get an email.

### 2.4 Deploy and check

- [ ] **Wake the API first** — open the admin in a tab so Render is warm, then
      deploy. Otherwise the first build may not reach it.
- [ ] In the build log expect:
      ```
      [content] Fetching https://<your-api>.onrender.com/api/v1/content
      [content] Wrote 6 projects to content/snapshot.json
      ```
      If it says *"Could not reach the API"* the site still builds, from the
      snapshot. Check the token and URL, wake the API, redeploy.
- [ ] `/`, `/work`, `/about`, `/contact` all load
- [ ] A project page renders, e.g. `/work/modular-erp-platform`

---

## Part 3 — Close the loop

- [ ] On Render, set:
      - `SITE_REVALIDATE_URL` = `https://<your-site>.vercel.app/api/revalidate`
      - `SITE_REVALIDATE_SECRET` = **the same string** as Vercel's `REVALIDATE_SECRET`
- [ ] Redeploy the backend so it picks them up
- [ ] Optional: Vercel → Settings → Git → **Deploy Hooks**, then set
      `VERCEL_DEPLOY_HOOK_URL` on Render. Only for full redeploys — content
      changes don't need one.

### Test it

- [ ] Edit a project in the admin → Save
- [ ] Hard-refresh the live site → your change is there, **no redeploy**
- [ ] The admin dashboard shows a fresh *Content synced* time

---

## Things that will catch you out

1. **`APP_DEBUG=true` in production** leaks environment variables and stack
   traces to anyone who triggers an error. Check it twice.
2. **The secrets must match.** `REVALIDATE_SECRET` on Vercel and
   `SITE_REVALIDATE_SECRET` on Render are the same string. A mismatch is a
   silent 401 and sync just stops.
3. **Cold starts** make the first save after idle feel broken. It isn't — press
   **Sync site** if a save's sync times out.
4. **Don't reuse the PIN `010121`.**
5. **`php artisan config:clear`** if you change env vars and nothing takes
   effect — a cached config ignores them entirely.
6. **Neon needs `DB_SSLMODE=require`**, or the connection is refused with a
   message that doesn't mention SSL.

---

## Still outstanding (not blockers)

- [ ] `RESEND_API_KEY` / `CONTACT_TO_EMAIL` for contact emails
- [ ] Content placeholders: `[METRIC]` ×6, `[what it improved]` ×6,
      `[what I learned here]` ×5, `[linkedin-url]` — see `CONTENT-TODO.md`.
      These render on the live site exactly as written, brackets and all.
- [ ] `docs/resume.pdf` stays unpublished — it contains date of birth and civil
      status
- [ ] A custom domain on both, if you want one
