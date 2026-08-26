// Turns a manifest entry into the srcset/sizes a <picture> needs.
//
// Deliberately free of any server-only import: AlbumContent is a client component, so
// anything it pulls in ends up in the browser bundle. The S3 side of the manifest lives
// in lib/photos.ts, which imports its types from here rather than the other way round.

import { assetUrl } from '../AssetConfig'

export interface PhotoMeta {
  name: string
  width: number
  height: number
  // Tier folder names, e.g. [200, 400, 800]. These bound the LONGEST edge.
  tiers: number[]
  // Parallel to `tiers`: the real intrinsic width of each file. Not the same number as the
  // tier for anything portrait -- a 3024x4032 photo's 2000px file is 1500 wide -- and the
  // one that a `w` descriptor has to carry.
  widths: number[]
  animated?: boolean
}

export interface AlbumManifest {
  year: string
  formats: string[]
  avifMinWidth: number | null
  photos: PhotoMeta[]
}

// Keyed by the filename without its extension, which is what the manifest records and what
// an S3 key ends with. Album keys look like '2025/200px/20250102-202907-9243.webp'.
export type PhotoIndex = Record<string, PhotoMeta>

export const photoSlug = (key: string) => (key.split('/').pop() ?? key).replace(/\.[^.]+$/, '')

export function indexPhotos(manifest: AlbumManifest | null): PhotoIndex {
  if (!manifest) return {}

  const index: PhotoIndex = {}
  for (const photo of manifest.photos) index[photo.name] = photo
  return index
}

const tierUrl = (year: string, tier: number, name: string, format: string) =>
  assetUrl(`${year}/${tier}px/${name}.${format}`)

export function srcSetFor(
  year: string,
  photo: PhotoMeta,
  format: 'webp' | 'avif',
  avifMinWidth: number | null
): string | null {
  // No AVIF for clips: the generator emits animated WebP only, because animated AVIF
  // encodes far slower and is worse supported.
  if (format === 'avif' && photo.animated) return null

  const entries: string[] = []
  photo.tiers.forEach((tier, i) => {
    // AVIF is not written below this width -- its container overhead makes it larger than
    // the WebP at thumbnail sizes -- so advertising it there would 404.
    if (format === 'avif' && avifMinWidth != null && tier < avifMinWidth) return

    const width = photo.widths[i]
    if (!width) return
    entries.push(`${tierUrl(year, tier, photo.name, format)} ${width}w`)
  })

  return entries.length ? entries.join(', ') : null
}

// The grid gives every tile a fixed height (50vh) and lets flex-grow justify the row, so a
// tile's WIDTH follows from its aspect ratio rather than from the viewport. That is why
// `sizes` is expressed in vh: a portrait needs roughly half the pixels of a landscape
// beside it, and a single shared value would over-serve every portrait in the album.
//
// Below the 768px breakpoint the layout switches to one column at width:100%.
const DESKTOP_TILE_VH = 50

// flex-grow stretches each tile to fill out its row, so the real width runs a little over
// height x aspect. Measured across typical rows this is 5-15%; the allowance rounds up
// because guessing low costs visible softness while guessing high usually lands on the same
// rung of the ladder anyway.
const JUSTIFY_ALLOWANCE = 1.2

export function sizesFor(photo: PhotoMeta): string {
  const aspect = photo.width / photo.height
  const desktopVh = (DESKTOP_TILE_VH * aspect * JUSTIFY_ALLOWANCE).toFixed(1)

  return `(max-width: 768px) 100vw, ${desktopVh}vh`
}

// Plain `src` for the <img> inside a <picture>: what a browser that ignores srcset would
// load. Aims at the middle of the ladder rather than the top so that fallback is not also
// the most expensive file in the set.
const FALLBACK_TARGET = 1200

export function fallbackSrc(year: string, photo: PhotoMeta): string {
  const tier =
    photo.tiers.find((t) => t >= FALLBACK_TARGET) ?? photo.tiers[photo.tiers.length - 1] ?? 200

  return tierUrl(year, tier, photo.name, 'webp')
}

// Largest available rung, for the lightbox.
export function largestTier(year: string, photo: PhotoMeta, format: 'webp' | 'avif' = 'webp') {
  const tier = photo.tiers[photo.tiers.length - 1]
  return tierUrl(year, tier, photo.name, format)
}
