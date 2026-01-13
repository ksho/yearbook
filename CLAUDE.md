# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js photo yearbook application that displays annual photo collections. Photos and videos are stored in AWS S3 (bucket: `yearbook-assets`) in multiple sizes (200px, 1000px/2000px, 3000px) for optimal loading performance based on context. The app features infinite scroll loading, a lightbox for full-size viewing, and light/dark theme switching.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (default: http://localhost:3000)
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run export` - Build and export static site

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

The app fetches image lists from S3 using AWS SDK in `getServerSideProps`:
- Requires environment variables: `AWS_S3_ACCESS_KEY`, `AWS_S3_SECRET`
- Bucket: `yearbook-assets`
- Image URLs follow pattern: `https://yearbook-assets.s3.amazonaws.com/{year}/{size}/{filename}`
- Supported formats: jpg, gif, webp

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
- Changed lint command from `next lint` to `eslint .` (next lint removed in v16)
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
