# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js photo yearbook application that displays annual photo collections. Photos are stored in AWS S3 (bucket: `yearbook-assets`, under the `v2/` prefix) as a responsive size ladder -- 200 to 3000px, WebP and AVIF -- generated at upload time by `scripts/derive-sizes.mjs`, and the browser picks the size and format for each device. Video clips are stored alongside them at a single size. The app features infinite scroll loading, a lightbox for full-size viewing, and light/dark theme switching.

The whole site sits behind a shared passphrase -- see **Passphrase gate** below.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (default: http://localhost:3000)
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run hash-passphrase "<phrase>"` - Generate a `SITE_PASSPHRASE_HASH` value

`next export` is gone: the gate needs a server, and `getServerSideProps` had already ruled out a static export.

### Asset Management

Everything the site reads lives under `v2/` in `yearbook-assets` -- see **S3 Integration**.
A year goes up in three steps: generate the size ladder from the Lightroom exports, optionally
preview it locally, then upload.

The exports live in `~/Pictures/PicturesSrc/new yearbook/{year}/originals/`. The examples
below use `2026`.

**1. Generate the ladder**

```bash
caffeinate -i npm run derive-sizes -- "/Users/karlshouler/Pictures/PicturesSrc/new yearbook/2026"
```

Writes `{width}px/` folders for 200/400/800/1200/1600/2000/3000 next to `originals/`, each
holding a `.webp` and (from 400px up) an `.avif` per photo, plus a `manifest.json` with each
file's real dimensions. Tiers bound the **longest edge**, matching the Lightroom presets, and
tiers larger than the source are skipped rather than upscaled. EXIF is kept; only the embedded
thumbnail Lightroom writes is stripped. Run with no arguments for every flag.

It is resumable -- outputs newer than their original are skipped, so a re-run after one
re-edit regenerates one photo. Use `--force` to rebuild everything, which is needed after
changing the encode settings. Plug in first: on battery the laptop's Low Power Mode caps it
hard, and `caffeinate` stops the machine sleeping mid-run.

**2. Preview before uploading (optional)**

```bash
cd "/Users/karlshouler/Pictures/PicturesSrc/new yearbook" && python3 -m http.server 8081 --bind 127.0.0.1
```

```bash
SITE_GATE_DISABLED=true NEXT_PUBLIC_ASSET_PREFIX= NEXT_PUBLIC_ASSET_HOST=http://127.0.0.1:8081 YEARBOOK_MANIFEST_DIR="/Users/karlshouler/Pictures/PicturesSrc/new yearbook" npm run dev
```

`YEARBOOK_MANIFEST_DIR` makes both the listing and the manifest come from disk instead of S3,
and the asset host serves the same folder. `NEXT_PUBLIC_ASSET_PREFIX=` is deliberately set to
empty: the export folder has no `v2/` level. Only years present locally will render.

**3. Upload**

```bash
aws s3 sync "/Users/karlshouler/Pictures/PicturesSrc/new yearbook/2026" s3://yearbook-assets/v2/2026/ --profile default --acl public-read --exclude "*" --include "*.webp" --include "*.avif" --include "manifest.json" --exclude "originals/*" --exclude "video/*"
```

Every part of that is load-bearing:

- **`--acl public-read` is required.** Objects are public through an `AllUsers: READ` ACL, not
  a bucket policy. Without it the files upload private and CloudFront returns 403.
- **Filter order matters -- the last match wins.** The `originals/*` exclude has to come after
  the includes, or the full-size originals upload too, and become publicly fetchable.
- **`video/*` is excluded** because local video folders hold the raw `.mov` sources next to
  each served clip. Clips go up separately (below).
- **No `--size-only`.** Plain `sync` uploads anything whose local copy is newer than the S3
  object, so a re-edited photo propagates while untouched files are skipped. A re-edit keeps
  its filename, so invalidate afterwards -- see **Asset delivery**.
- **Never run `sync --delete` against the bucket root.** With `--include "*.webp"` in the
  filter, every WebP under `v2/` that is not in the local folder counts as extra and gets
  deleted -- which is most of what the site serves, clips included.

A new year needs no invalidation: its paths were never cached. To check it went up public:

```bash
curl -sI https://d2nk87d9flz1jw.cloudfront.net/v2/2026/manifest.json | head -1
```

**Video clips** are made with ffmpeg and are not part of the ladder yet (see **Video clips**
for why that matters):

```bash
for i in *.mov; do ffmpeg -ss 00:00:00.000 -i "$i" -vcodec libwebp -q 50 -r 12 -vf 'scale=1000:1000:force_original_aspect_ratio=decrease' -loop 0 -t 00:00:12.000 "${i%.*}_50.webp"; done
```

```bash
aws s3 cp . s3://yearbook-assets/v2/2026/video/webp/ --recursive --profile default --acl public-read --exclude "*" --include "*.webp"
```

The GIF recipe that used to sit here is gone on purpose. GIF has 256 colours and no real
interframe compression, which is why 2020's clips average 8 MB each.

## Passphrase gate

The site is not public. One shared phrase, no accounts, no per-person identity.

**Where it is enforced.** `proxy.ts` at the repo root -- Next 16's name for what used to be `middleware.ts`. Its matcher covers everything except `/enter`, `/api/gate`, `/_next/*`, and a few named public files, so the home page, every album, and every API route are all gated by one piece of code. Enforcing it here rather than in each `getServerSideProps` matters: the proxy runs first, so an unauthenticated request never reaches the S3 listing in `lib/photos.ts`.

Unauthenticated requests get a 307 to `/enter?next=<original path>`, so deep links survive. `safeNextPath()` in `lib/gate.ts` rejects anything that isn't a plain rooted path, which is what stops `?next=` becoming an open redirect.

**The session cookie.** `yb_session`, stateless and signed: `base64url({exp, epoch}).HMAC-SHA256`. Signed and verified with Web Crypto in `lib/gate.ts`, because the proxy may be built for either the Node or Edge runtime and `crypto.subtle` is what both have. `HttpOnly`, `SameSite=Lax`, 180 days, `Secure` only in production (a Secure cookie is silently dropped on `http://localhost`).

**Verifying a guess.** `pages/api/gate.ts` -> `verifyPassphrase()` in `lib/passphrase.ts`. That file is deliberately separate from `lib/gate.ts` so that `node:crypto` never gets pulled into the proxy bundle.

### Environment variables

| Var | What it is |
|---|---|
| `SITE_PASSPHRASE_HASH` | scrypt hash of the phrase, from `npm run hash-passphrase` |
| `SESSION_SECRET` | HMAC key, `openssl rand -hex 32` |
| `SESSION_EPOCH` | integer, starts at `1` |
| `SITE_GATE_DISABLED` | kill switch, normally unset -- see below |

Set the first three in Vercel for **Production, Preview, and Development**. Preview deployments are public URLs; without the vars set there, `proxy.ts` returns 503 rather than failing open. None of them may be `NEXT_PUBLIC_*`.

Two independent levers, both requiring a redeploy (Vercel env changes don't hot-apply):

- **Change the phrase** -- new `SITE_PASSPHRASE_HASH`. Existing sessions keep working.
- **Log everyone out** -- increment `SESSION_EPOCH`. The phrase is unchanged.

The hash uses `:` as its separator, not the `$` that PHC-style hashes conventionally use. This is not cosmetic: Next runs `.env` files through dotenv-expand, which reads `$k97sfhr...` as a variable reference and replaces it with nothing, so a `$`-separated hash arrives truncated and every correct passphrase is rejected.

### The kill switch

`SITE_GATE_DISABLED=true` turns the gate off entirely: `proxy.ts` passes every request through, and `/enter` redirects to the site rather than showing a prompt guarding nothing. It exists so that a bug in the gate, or a bad value in one of the vars above, doesn't mean a revert-and-redeploy to get the family back in.

Only the exact word `true` disables it, case- and whitespace-insensitive. `1`, `yes`, `on`, `false`, an empty string, and absence all leave the gate **on**, so nothing accidental opens the site. It is checked before the `SESSION_SECRET` test, deliberately -- the switch has to work when the thing that broke is the configuration it sits above.

**On Vercel this is not instant.** Environment variable changes only take effect on a new deployment, so flipping this still costs a redeploy. If the goal is purely to stop the bleeding, **Instant Rollback** to the previous deployment is faster -- seconds, no rebuild. The switch is the better tool when you want to keep the current deployment and only turn the gate off, and it does take effect immediately in local dev.

To check which state production is in: a `307` from `/` means the gate is on, a `200` means it is off.

### Why there is no rate limiter

The defense is entropy plus cost, not a counter. Use **five randomly chosen words** (~64 bits); scrypt at N=32768 makes every attempt cost ~120ms of CPU, and `/api/gate` floors every response at 600ms whether it succeeds or fails. That caps a client near two attempts a second, against a space of 2.8x10^19. Guessing is not the exposure.

What a rate limiter would actually protect is the Vercel invoice, if someone hammered the endpoint. If that ever happens the fix is a Vercel Firewall rate-limit rule on `/api/gate` -- dashboard only, no code change. The 5-failure cooldown on the gate page is a courtesy to whoever is fumbling the phrase from memory; it is trivially bypassed and is not counted as security.

### What the gate does not cover

**Photos on CloudFront are still publicly fetchable.** This is a deliberate call, not an oversight. The bucket refuses anonymous `ListObjectsV2`, and filenames are timestamp-plus-random, so nobody enumerates them -- but a URL that leaks works for anyone. The gate protects the year descriptions, the album structure, and discovery. If that ever needs to be airtight, the answer is CloudFront signed cookies plus locking S3 to OAC, which also means moving assets to a subdomain of the site so one cookie covers both.

`public/robots.txt` and the `X-Robots-Tag` header in `next.config.js` keep crawlers out from here on. Neither removes anything already sitting in a search index -- that needs Search Console's removal tool.

## Architecture

### Page Structure

**Home Page** (`pages/index.tsx`):
- Landing page listing all years with descriptions
- Each year's data is hardcoded in the `ALBUMS` array
- Links to individual album pages at `/album/[year]`

**Album Page** (`pages/album/[aid].tsx`):
- Dynamic route for viewing photos/videos from a specific year
- Uses `getServerSideProps` to fetch image/video list from S3 at request time
- Lists `v2/{year}/200px/` and `v2/{year}/video/webp/`, and reads `v2/{year}/manifest.json` for each photo's dimensions and available tiers (see **S3 Integration**)
- Images are sorted by filename (expected format: timestamp-based filenames)
- Uses `yet-another-react-lightbox` for full-screen viewing with state management

### Component Architecture

**AlbumContent** (`components/AlbumContent.tsx`):
- Implements batch loading (15 items per batch) for performance
- Monitors scroll position to load next batch when user approaches bottom (within 1500px)
- Uses interval polling (500ms) and scroll events to trigger loading
- Displays images in flex layout with object-fit: cover
- Receives `onImageClick` callback to trigger lightbox with selected image index
- Renders each photo with a manifest entry as a `<picture>`: an AVIF source and a WebP srcset built from the manifest's tiers, with `width`/`height` set so the tile reserves its space before it loads
- `sizes` is computed per photo from its aspect ratio, in `vh` -- tiles have a fixed 50vh height, so a portrait needs roughly half the pixels of a landscape. All of this lives in `lib/responsive.ts`
- The first four tiles load eagerly at high priority; the rest are lazy
- Anything without a manifest entry -- today only the clips -- falls back to a single `<img>` at `imageSizeMed`
- Grid wrapper uses `flex-wrap: wrap` to create justified row layout on desktop, stacks vertically on mobile

**LazyImage** (`components/LazyImage.tsx`):
- Currently unused but available for progressive image loading
- Loads placeholder first, then swaps to full image when ready

**SharedComponents** (`components/SharedComponents.ts`):
- Reusable styled-components used across pages
- `TopBar`, `Header`, `LightSwitch`, `MainContentWrapper`, `MainContent`

### Theme System

**ThemeConfig.ts**:
- Defines light/dark themes using styled-components ThemeProvider
- Theme state managed locally in each page component
- Global styles apply background and text color transitions

### S3 Integration

The app fetches image lists from S3 using AWS SDK v3 in `getServerSideProps`:
- Requires environment variables: `AWS_S3_ACCESS_KEY`, `AWS_S3_SECRET`
- Bucket: `yearbook-assets`
- Supported formats: jpg, gif, webp. AVIF never appears in a listing -- the 200px tier the album lists is WebP only -- and is only ever reached through the srcset

**Everything is read through a key prefix, currently `v2/`.** `KEY_PREFIX` in
`AssetConfig.ts` defaults to `v2` and is applied in two places only: `prefixed()` wraps the S3
paths for listings and manifests in `lib/photos.ts`, and `tierUrl()` in `lib/responsive.ts`
builds every tier URL. Nothing else should construct an asset path by hand.

The prefix exists because the current Lightroom preset renames files: 2014 through 2022 came
back as `20160101-010156-2936.webp` where the old layout holds `20160101-010156.jpg`. Uploading
into the old paths would have listed every photo in those years twice. Under `v2/` nothing
was overwritten.

**The old layout is still at the bucket root**, untouched, about 22 GB. It is the rollback:
reverting commit `3926603` points the site back at it with no invalidation. Once that is no
longer needed, everything at the root except `v2/` can go -- along with the dead weight listed
under **Video clips**.

`listAlbum()` also collapses `NAME.jpg` and `NAME.webp` to one entry, preferring WebP. Under a
clean prefix it never fires; it is there so a stray old file can never bring a duplicate back.

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_ASSET_PREFIX` | Overrides `KEY_PREFIX`. Set it to empty for the old root layout or a local preview |
| `NEXT_PUBLIC_ASSET_HOST` | Overrides the CDN host. May include a scheme (`http://127.0.0.1:8081`), which a local preview needs |
| `YEARBOOK_MANIFEST_DIR` | Read listings and manifests from this local folder instead of S3. Local preview only |

The `NEXT_PUBLIC_*` pair is inlined at build time, so on Vercel a change needs a redeploy.
- Listing is paginated via `paginateListObjectsV2` -- a bare `ListObjectsV2` silently caps at 1000 keys, and the larger years are already past 700

### Asset delivery (CloudFront)

Images are **read** through CloudFront, not directly from S3. The bucket remains public, so direct S3 URLs still work as a fallback.

- Distribution: `E2AKQTW7LH879C` -> `d2nk87d9flz1jw.cloudfront.net`
- Origin: `yearbook-assets.s3.us-east-1.amazonaws.com`
- Image URLs follow pattern: `https://d2nk87d9flz1jw.cloudfront.net/v2/{year}/{size}/{filename}`
- Built via `assetUrl()` in `AssetConfig.ts` -- the single place the host is defined. Override with `NEXT_PUBLIC_ASSET_HOST` (e.g. set it to `yearbook-assets.s3.amazonaws.com` to bypass the CDN without a code change).

The S3 objects carry **no** `Cache-Control` of their own. CloudFront attaches one at the edge via response headers policy `05df1ff4-a688-4ef8-b6bc-88d7583ad677` (`yearbook-assets-long-cache`), which sets:

```
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

Deliberately **not** `immutable`, and deliberately a day rather than a year: old shots get re-edited and re-uploaded in place, especially around December/January, so updates have to be able to propagate. A viewer sees a re-edited photo within a day on their own, and `stale-while-revalidate` means they get the cached copy instantly while the new one fetches in the background.

This lines up with the edge, which also holds one day -- because S3 sends no `Cache-Control`, CloudFront falls back to the `CachingOptimized` cache policy's 86400s `DefaultTTL`.

To push an update out immediately rather than waiting a day, invalidate the edge:

```bash
aws cloudfront create-invalidation --distribution-id E2AKQTW7LH879C --paths "/v2/2025/*"
```

Adding *new* files needs no invalidation -- they were never cached.

### Video clips

Clips are the one part of the album that never went through the size ladder, and they are
now the heaviest thing the site serves. Everything below was measured against the bucket in
August 2026 and is outstanding work, not a description of something already fixed.

The served clips were copied as-is into `v2/{year}/video/webp/` when the site moved to the
prefix in October 2026. The paths in the table below are the originals at the bucket root,
which is where the dead weight still sits.

**Only one prefix is served.** `listAlbum()` in `lib/photos.ts` lists `v2/{year}/200px` and
`v2/{year}/video/webp`, and nothing else. Anything sitting elsewhere in the bucket -- including
everything in the table below -- is invisible to the site no matter how much space it takes.

| path | contents | size | served |
|---|---|---|---|
| `2020/video/webp/` | 15 files, **GIF data despite the folder name** | 122.6 MB | yes |
| `2022/video/webp/` | 52 animated WebP | 284.3 MB | yes |
| `2025/video/webp/` | 4 animated WebP | 31.2 MB | yes |
| `2020/video/*.gif` | the same 15 GIFs, loose | 122.6 MB | no |
| `2020/video/gif/` | the same 15 GIFs again | 122.6 MB | no |
| `2022/video/gif/` | 13 GIFs | 116.6 MB | no |
| `2022/video/*.mov` | 7 raw camera originals | 1,715 MB | no |
| `2025/video/test/` | 1 file | 5 MB | no |
| `2016/3000px/*.mp4` | 2 strays in a photo tier folder | 200.7 MB | no |

**They dominate page weight.** The largest single served object is 16.4 MB
(`2022/video/webp/20220911-105347_40.webp`); the average is 5.5 MB in 2022 and 8.2 MB in
2020. After the responsive ladder landed, the first fifteen photo tiles cost 1.2--1.9 MB
altogether, so one clip is roughly ten times the entire first screen of photos. The grid
plays clips continuously rather than showing a poster, so every clip in a scrolled batch is
downloaded in full: scrolling all of 2022 pulls ~284 MB of clips against maybe 40 MB of
photos. Any year with clips largely undoes the image work.

**2020's are GIFs.** Confirmed by magic bytes -- `GIF89a`, in a folder called `webp`. GIF
gives 256 colours and no interframe compression worth the name, which is why they average
8.2 MB. Re-encoding to animated WebP should cut them by most of their size.

**Why they are outside the pipeline.** `scripts/derive-sizes.mjs` reads `originals/`, and
clips live under `{year}/video/`, so the script has never seen them. They have no manifest
entry, which means the grid renders them on the fallback path -- a single `<img>` at one
size, no srcset, the same 8 MB file for a phone and a desktop.

The script already handles animated input: it detects multi-page sources, sets
`{ animated: true }` (without which sharp silently flattens to frame one), caps them at
`ANIMATED_MAX_WIDTH` (1200) because every frame pays the full encode, emits WebP only
(animated AVIF is far slower and worse supported), and can write a still first frame with
`--posters`. So giving clips the 200/400/800/1200 ladder is mostly a matter of getting them
into a folder the script can read.

**The raw sources are publicly fetchable.** `2022/video/20220116-1234.mov` returns
`HTTP 200, video/quicktime, 539 MB` through CloudFront, as does
`2016/3000px/20160404-233132.mp4` at 181 MB. That is ~1.9 GB of unserved raw video in a
public bucket, and unlike the photos these filenames are guessable (`20220116-1234.mov`),
so the "nobody enumerates timestamp-plus-random names" argument in **What the gate does not
cover** does not apply to them.

**What is outstanding**

1. ~~Copy the 71 served clips into the new key prefix.~~ Done in October 2026.
2. Run the 71 clips through `derive-sizes.mjs` for the animated ladder and manifest
   entries, so a phone pulls the 400px version instead of the 8 MB one. 2020 gains most.
3. Delete the 9 raw `.mov`/`.mp4` objects (~1.9 GB) and the duplicate 2020 GIF sets
   (~245 MB). Nothing links to any of it.

### Styling

- Uses `styled-components` for component styling
- Global styles in `styles/globals.css` and `styles/Home.module.css`
- Mobile breakpoint: 768px
- Images displayed in flexible justified grid on desktop, single column on mobile

## Code Style

- TypeScript with strict rules (no `any`, no unused vars)
- Prettier config: no semicolons, single quotes, 2-space tabs
- ESLint extends Next.js recommended + TypeScript recommended + Prettier

## Adding a New Year

1. Add the year to the `ALBUMS` array in `pages/index.tsx`, with its description paragraphs
2. Export the originals to `~/Pictures/PicturesSrc/new yearbook/{year}/originals/`
3. Generate the ladder, preview if you like, and upload to `v2/{year}/` -- the three steps in
   **Asset Management**
4. Convert any clips with the ffmpeg recipe there and upload them to `v2/{year}/video/webp/`

No code change is needed for the sizes. The manifest tells the grid which tiers exist for
each photo, so the old step of editing `imageSizeMed` in `AlbumContent.tsx` is gone --
`imageSizeMed` now only affects the fallback path, which only clips take.

## Deployment

- Hosted on Vercel
- Image remote patterns configured in `next.config.js` to allow S3 URLs
- React strict mode enabled

## Recent Upgrades

### Next.js 16 + React 19 (January 2026)

The application was upgraded from Next.js 12 + React 17 to Next.js 16 + React 19.

**Key Changes Made:**
- Replaced `simple-react-lightbox` (unmaintained) with `yet-another-react-lightbox` (actively maintained)
- Updated `next.config.js` to use `remotePatterns` instead of deprecated `domains` for images
- Fixed TypeScript types for interval timers (changed from `NodeJS.Timer` to `ReturnType<typeof setInterval>`)
- Updated ESLint to v9+ as required by Next.js 16
- Changed lint command from `next lint` to `eslint .` (next lint removed in v16). The matching flat config was missed at the time, so `eslint .` errored out instead of linting until `eslint.config.mjs` was added alongside the passphrase gate; `.eslintrc.json` is gone. Turning it back on surfaced a handful of pre-existing violations in `components/LazyImage.tsx`, `pages/api/readphotos.ts`, `pages/index.tsx`, and `styled.d.ts`.
- Removed `<a>` tags from inside `<Link>` components (Next.js 13+ automatically renders Link as anchor)

**Breaking Changes in Next.js 16 That Could Impact This App:**
- **Turbopack is now default bundler** - Webpack deprecated (app doesn't use custom webpack config, so no impact)
- **next lint removed** - Updated to use eslint directly (✓ fixed)
- **images.domains deprecated** - Switched to images.remotePatterns (✓ fixed)
- **Minimum Node.js 20.9+** - Ensure deployment environment uses Node 20+
- **React 19 required** - All components updated and working

**Breaking Changes That Don't Impact This App:**
- Async request APIs (cookies, headers, params) - App uses Pages Router with getServerSideProps, not affected
- middleware → proxy rename - App doesn't use middleware
- Parallel routes require default.js - App doesn't use parallel routes
- AMP support removed - App doesn't use AMP
- Runtime config removed - App doesn't use serverRuntimeConfig/publicRuntimeConfig

**Warnings to Address (Optional):**
- AWS SDK v2 is end-of-support - Consider migrating to AWS SDK v3
- Babel config can be replaced with Next.js compiler.styledComponents option
- Workspace root warning - Can be silenced by setting turbopack.root in config
