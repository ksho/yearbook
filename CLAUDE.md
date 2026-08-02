# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js photo yearbook application that displays annual photo collections. Photos and videos are stored in AWS S3 (bucket: `yearbook-assets`) in multiple sizes (200px, 1000px/2000px, 3000px) for optimal loading performance based on context. The app features infinite scroll loading, a lightbox for full-size viewing, and light/dark theme switching.

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

Sync photos to S3 (from local photo directory):
```bash
aws s3 sync . s3://yearbook-assets/ --delete --acl public-read --profile default --exclude "*" --include "*.jpg" --include "*.webp" --include "*.gif" --size-only
```

Convert videos to webp:
```bash
for i in *.mov; do ffmpeg -ss 00:00:00.000 -i "$i" -vcodec libwebp -q 50 -r 12 -vf 'scale=1000:1000:force_original_aspect_ratio=decrease' -loop 0 -t 00:00:12.000 "${i%.*}_50.webp"; done
```

Convert videos to gif:
```bash
for i in *.MOV; do ffmpeg -ss 00:00:00.000 -i "$i" -pix_fmt rgb24 -r 12 -vf 'scale=600:600:force_original_aspect_ratio=decrease' -t 00:00:10.000 "${i%.*}.gif"; done
```

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

Set all three in Vercel for **Production, Preview, and Development**. Preview deployments are public URLs; without the vars set there, `proxy.ts` returns 503 rather than failing open. None of them may be `NEXT_PUBLIC_*`.

Two independent levers, both requiring a redeploy (Vercel env changes don't hot-apply):

- **Change the phrase** -- new `SITE_PASSPHRASE_HASH`. Existing sessions keep working.
- **Log everyone out** -- increment `SESSION_EPOCH`. The phrase is unchanged.

The hash uses `:` as its separator, not the `$` that PHC-style hashes conventionally use. This is not cosmetic: Next runs `.env` files through dotenv-expand, which reads `$k97sfhr...` as a variable reference and replaces it with nothing, so a `$`-separated hash arrives truncated and every correct passphrase is rejected.

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
- S3 directory structure: `{year}/200px/`, `{year}/video/webp/`
- Images are sorted by filename (expected format: timestamp-based filenames)
- Uses `yet-another-react-lightbox` for full-screen viewing with state management

### Component Architecture

**AlbumContent** (`components/AlbumContent.tsx`):
- Implements batch loading (15 items per batch) for performance
- Monitors scroll position to load next batch when user approaches bottom (within 1500px)
- Uses interval polling (500ms) and scroll events to trigger loading
- Displays images in flex layout with object-fit: cover
- Receives `onImageClick` callback to trigger lightbox with selected image index
- Configures image sizes based on year (newer years use 2000px, older use 1000px)
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
- Supported formats: jpg, gif, webp
- Listing is paginated via `paginateListObjectsV2` -- a bare `ListObjectsV2` silently caps at 1000 keys, and the larger years are already past 700

### Asset delivery (CloudFront)

Images are **read** through CloudFront, not directly from S3. The bucket remains public, so direct S3 URLs still work as a fallback.

- Distribution: `E2AKQTW7LH879C` -> `d2nk87d9flz1jw.cloudfront.net`
- Origin: `yearbook-assets.s3.us-east-1.amazonaws.com`
- Image URLs follow pattern: `https://d2nk87d9flz1jw.cloudfront.net/{year}/{size}/{filename}`
- Built via `assetUrl()` in `AssetConfig.ts` -- the single place the host is defined. Override with `NEXT_PUBLIC_ASSET_HOST` (e.g. set it to `yearbook-assets.s3.amazonaws.com` to bypass the CDN without a code change).

The S3 objects carry **no** `Cache-Control` of their own. CloudFront attaches one at the edge via response headers policy `05df1ff4-a688-4ef8-b6bc-88d7583ad677` (`yearbook-assets-long-cache`), which sets:

```
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
```

Deliberately **not** `immutable`, and deliberately a day rather than a year: old shots get re-edited and re-uploaded in place, especially around December/January, so updates have to be able to propagate. A viewer sees a re-edited photo within a day on their own, and `stale-while-revalidate` means they get the cached copy instantly while the new one fetches in the background.

This lines up with the edge, which also holds one day -- because S3 sends no `Cache-Control`, CloudFront falls back to the `CachingOptimized` cache policy's 86400s `DefaultTTL`.

To push an update out immediately rather than waiting a day, invalidate the edge:

```bash
aws cloudfront create-invalidation --distribution-id E2AKQTW7LH879C --paths "/2025/2000px/*"
```

Adding *new* files needs no invalidation -- they were never cached.

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

1. Add new year object to `ALBUMS` array in `pages/index.tsx` with description paragraphs
2. Upload photos to S3 in directory structure: `{year}/200px/`, `{year}/1000px/` or `{year}/2000px/`, `{year}/3000px/`
3. For videos: upload to `{year}/video/webp/`
4. Update `imageSizeMed` logic in `AlbumContent.tsx` if the year should use 2000px instead of 1000px

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
