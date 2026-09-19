# Project images

How screenshots reach the work showcase, what size they have to be, and how to
swap the current placeholders for real ones — by hand now, or from the Laravel
API in Phase 8.

---

## 1. The three frames

The showcase renders one project at a time with up to three device frames. Each
frame's CSS aspect ratio is derived from these numbers, so an image at the exact
size fills its frame with no letterboxing and no crop.

| `device` | Width | Height | Ratio | What it is |
|----------|-------|--------|-------|------------|
| `laptop` | **1440** | **900** | 16:10 | Drawn browser bar above the image |
| `tablet` | **1024** | **768** | 4:3 | Plain bezel |
| `mobile` | **390** | **844** | 195:422 | Plain bezel, iPhone-sized |

The single source of truth is `DEVICE_SIZES` in `lib/schema.ts`. Change a number
there and the frames follow — `app/globals.css` sets each frame's
`aspect-ratio` from the same pair. Do not edit one without the other.

A project may supply any subset. Missing devices simply do not render; there is
no empty frame, because `04-UIUX-BRIEF.md` forbids placeholder boxes. A project
with no images at all falls back to a full-width typographic panel.

---

## 2. Frontmatter

```yaml
images:
  - src: /shots/parsing-laptop.png
    alt: Supplier invoice parsed into structured fields, laptop browser
    device: laptop        # laptop | tablet | mobile
    width: 1440           # optional but recommended — see below
    height: 900
    caption: Optional single line shown on the project detail page
```

Validated by `projectImageSchema` in `lib/schema.ts`. The build **fails** if:

- `alt` is missing or empty. It is never generated from the filename — a
  screen reader gets what you write or nothing.
- `device` is not one of the three values.
- `width` or `height` is present but not a positive integer.

`width` and `height` are optional; when absent the component falls back to
`DEVICE_SIZES`. Set them anyway when a backend serves the file: the browser
reserves the exact box before the image arrives, so a slow image cannot shift
the panel. That is what keeps CLS at zero here.

Local files go in `public/` and are referenced from the root (`/shots/...`).
Remote URLs work as-is — the showcase uses a plain `<img>`, not `next/image`,
so no `remotePatterns` entry is needed in `next.config.ts`.

---

## 3. Placeholders while you gather real screenshots

Two services, used for different jobs. Both are in the repo right now by
design — see "What is in the repo" below — and both come out when the Phase 8
backend starts serving real images.

### picsum.photos — realistic test images

Real photographs at an exact size. Use these to check framing, crop and weight.

```
https://picsum.photos/seed/<any-stable-seed>/<width>/<height>
```

```
https://picsum.photos/seed/dpe-laptop/1440/900
https://picsum.photos/seed/dpe-tablet/1024/768
https://picsum.photos/seed/dpe-mobile/390/844
```

Always include a `seed`. Without it the service returns a different photo on
every request, so the page changes on each reload and screenshot comparisons
become useless.

### placehold.co — labelled boxes

A flat box with text. Use when you want the slot obviously marked as empty
rather than looking like content.

```
https://placehold.co/<width>x<height>?text=<label>
https://placehold.co/1440x900?text=Laptop+1440x900
```

### What is in the repo right now

Every project carries placeholders so no panel is blank while the backend is
being built. They are split deliberately:

| Projects | Service | Why |
|----------|---------|-----|
| The four `confidential: true` client projects | **placehold.co** — a labelled box in the palette (`eceae4` on `83807a`) reading e.g. `1440 x 900` | A realistic photograph framed as a confidential client system is the one placeholder that could actually mislead. A labelled box cannot be mistaken for a screenshot |
| `document-parsing-engine`, `devio` | **picsum.photos**, seeded | These two may legitimately show screenshots (`07-SOURCE-CONTENT.md` §5.5, §5.6), so a realistic image shows what the panel will look like |

Each file carries a comment block at `images:` saying it is a placeholder.

**These are temporary.** Replacing them is launch blocker 5. For the four
confidential projects the likely end state is not a real screenshot but
`images: []` — §5.8 says screenshots of client systems are "almost certainly
not" permitted, and the panel falls back to a full-width typographic
composition that reads as finished.

---

## 4. Capturing real screenshots

Set the browser viewport to the exact size, then capture:

| Device | Viewport | Chrome DevTools device toolbar |
|--------|----------|-------------------------------|
| laptop | 1440 × 900 | Responsive, type the numbers |
| tablet | 1024 × 768 | iPad |
| mobile | 390 × 844 | iPhone 14 / 15 |

Capture the viewport, not the full page — a full-page capture is the wrong
ratio and will be cropped. In DevTools: Ctrl/Cmd-Shift-P → "Capture screenshot".

Save as PNG for UI with text, JPEG only if the shot is photographic. Keep each
file under ~300KB; these load lazily but they are still on the home route.

**Before capturing:** the frames show whatever is on screen. Check for client
names, real customer data, email addresses and internal URLs. For the four
confidential projects the answer is not "blur it" — it is `images: []`.

---

## 5. Phase 8: serving these from Laravel

`08-BACKEND.md` §4 already specifies a `project_images` table with `path`, `alt`
and `sort_order`. Two additions make it line up with this document:

- a `device` column (`enum('laptop','tablet','mobile')`), and
- `width` and `height` smallints, populated on upload.

`GET /api/v1/content` then returns each image in the shape above and
`lib/content.ts` passes it through unchanged — the TypeScript interface is
already the contract, per `08-BACKEND.md` §5.

The service layer rule in §4 still applies: **uploads are blocked when the
parent project is `confidential: true`.** That is the mechanism that stops a
client screenshot being published by accident, and it matters more than the
frontmatter rule because the admin is where the mistake would be made.
