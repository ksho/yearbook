#!/usr/bin/env node
//
// Builds the responsive size ladder for one album year.
//
//   node scripts/derive-sizes.mjs ~/Pictures/yearbook/2025 --out ./build/2025
//
// Reads   <src>/originals/*  (or <src>/* directly, if there is no originals/ folder)
// Writes  <out>/200px/name.webp   <out>/200px/name.avif   ...
//         <out>/poster/800px/name.webp   (animated sources only)
//         <out>/manifest.json
//
// Output basenames drop the original extension, so 'IMG_1286.HEIC' becomes
// 'IMG_1286.webp'. That matters: getImageUrlBySize() in components/AlbumContent.tsx
// builds every other size by string-replacing '200px' in the key and keeping the
// filename as-is, so a photo's name has to be identical across every tier.
//
// Safe to re-run. Outputs that already exist and are newer than their original are
// skipped, so an interrupted run resumes where it stopped and adding one new photo
// costs one photo's worth of work.

import { createRequire } from 'node:module'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import { cpus } from 'node:os'

const require = createRequire(import.meta.url)
const sharp = require('sharp')
const ExifReader = require('exifreader')

// The ladder. 200/1000/2000/3000 is what the bucket held before this script existed;
// the gaps at 400/800/1200/1600 are where photos actually render. A 3:2 landscape in
// the album grid is ~675 CSS px on a 1440px laptop and ~390 on a phone, so almost
// every real request wants something between 400 and 1600 -- the old ladder forced
// those to round up to 2000 and eat ~294 KB apiece.
//
// 1000px is deliberately absent: it exists only for the pre-2014 years and is
// redundant with 800/1200 going forward. Nothing deletes it, it just stops growing.
const WIDTHS = [200, 400, 800, 1200, 1600, 2000, 3000]

// Both formats go in the same folder so a <picture> element can swap extensions and
// getImageUrlBySize() keeps working unchanged for the .webp fallback.
const FORMATS = ['webp', 'avif']

// Measured on this machine (sharp 0.35.3 / libvips 8.18.3) against a 1200x900 test
// image: webp q80 -> 238 KB, avif q50 -> 113 KB. AVIF is worth the extra encode time.
//
// AVIF effort is 4 rather than the maximum 9 on purpose. Effort 6 came out 1% LARGER
// than effort 4 while taking 2.6x as long (1618ms vs 614ms) -- past 4 the encoder is
// spending time on search that this kind of content doesn't reward. Raise it if you
// benchmark your own photos and see otherwise.
//
// The quality numbers are not on the same scale. AVIF q50 is roughly WebP q80 to the
// eye; they are not both "half quality".
const ENCODE = {
  webp: { quality: 80, effort: 6, smartSubsample: true },
  avif: { quality: 50, effort: 4, chromaSubsampling: '4:2:0' },
}

// AVIF carries a fixed container overhead that stops paying for itself on thumbnails.
// Measured on the 200px tier it came out LARGER than the WebP (487 vs 462 bytes), while
// at 400px it was already less than half (653 vs 1532). Below this width, WebP only.
const AVIF_MIN_WIDTH = 400

// Animated sources (GIF, animated WebP) get a shorter ladder and WebP only.
//
// Every frame pays the full resize and encode, so an animated file is roughly
// frame-count times the cost and size of a still at the same width -- a 12-second clip
// at 12fps is ~144 frames. Past this width the result is larger than the video it came
// from and nothing in the grid renders it that big anyway. The existing ffmpeg recipe in
// CLAUDE.md already tops out at 1000px, so this is consistent with what is in the bucket.
//
// No AVIF: animated AVIF encodes far slower than animated WebP and browser support for
// it is meaningfully worse than for the still format.
const ANIMATED_MAX_WIDTH = 1200
const ANIMATED_FORMATS = ['webp']

// Off by default: the grid plays clips continuously, so a still first frame is a file
// nobody ever fetches. Kept behind --posters because the same frame is what an og:image
// or a share preview would need, and those can't be animated.

// A light unsharp mask on the small tiers. Downscaling averages detail away, and
// thumbnails read as soft without it. Left off above this width because full-size
// photos are already sharp and it only adds bytes.
const SHARPEN_AT_OR_BELOW = 800
const SHARPEN = { sigma: 0.6 }

// Guards against a decompression bomb in the source folder. 500 MP is far above any real
// camera and far below anything that would exhaust memory.
const LIMIT_INPUT_PIXELS = 500_000_000

const SOURCE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.tif', '.tiff', '.heic', '.heif', '.webp', '.gif'])

const EXIF_MODES = new Set(['all', 'camera', 'none'])

function parseArgs(argv) {
  const opts = {
    dir: null,
    out: null,
    year: null,
    force: false,
    dryRun: false,
    concurrency: cpus().length,
    formats: FORMATS,
    widths: WIDTHS,
    exif: 'all',
    posters: false,
  }

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--force') opts.force = true
    else if (arg === '--posters') opts.posters = true
    else if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--out') opts.out = argv[++i]
    else if (arg === '--year') opts.year = argv[++i]
    else if (arg === '--exif') opts.exif = argv[++i]
    else if (arg === '--concurrency') opts.concurrency = Number(argv[++i])
    else if (arg === '--formats') opts.formats = argv[++i].split(',').map((f) => f.trim())
    else if (arg === '--widths') opts.widths = argv[++i].split(',').map((w) => Number(w.trim()))
    else if (arg.startsWith('-')) throw new Error(`unknown flag: ${arg}`)
    else if (!opts.dir) opts.dir = arg
    else throw new Error(`unexpected argument: ${arg}`)
  }

  if (!opts.dir) {
    console.error('usage: node scripts/derive-sizes.mjs <src-dir> [options]')
    console.error('')
    console.error('  <src-dir>              folder of originals, or a folder containing originals/')
    console.error('  --out <dir>            where to write the tiers (default: alongside the source)')
    console.error('  --year <name>          manifest label (default: the source folder name)')
    console.error('  --exif all|camera|none what to embed in the derivatives (default: all)')
    console.error('                           all    -- everything, including GPS coordinates')
    console.error('                           camera -- camera, lens and exposure; no GPS')
    console.error('                           none   -- strip it')
    console.error('  --widths 400,800       override the size ladder')
    console.error('  --formats webp         override output formats (webp,avif)')
    console.error('  --concurrency N        photos in flight at once (default: one per core)')
    console.error('  --posters              also emit a still first frame for animated sources')
    console.error('  --force                rebuild outputs that already exist')
    console.error('  --dry-run              report what would be written, write nothing')
    process.exit(1)
  }

  if (opts.formats.some((f) => !ENCODE[f])) throw new Error(`formats must be one of: ${Object.keys(ENCODE).join(', ')}`)
  if (opts.widths.some((w) => !Number.isInteger(w) || w < 1)) throw new Error('widths must be positive integers')
  if (!EXIF_MODES.has(opts.exif)) throw new Error(`--exif must be one of: ${[...EXIF_MODES].join(', ')}`)
  if (!Number.isInteger(opts.concurrency) || opts.concurrency < 1) throw new Error('--concurrency must be a positive integer')

  opts.widths.sort((a, b) => a - b)
  return opts
}

// --- metadata -------------------------------------------------------------------

const rational = (tag) => (Array.isArray(tag?.value) && tag.value.length === 2 ? tag.value[0] / tag.value[1] : undefined)
const scalar = (tag) => (Array.isArray(tag?.value) ? tag.value[0] : tag?.value)

// Pulls the fields worth keeping into a plain object. This goes into manifest.json
// regardless of --exif, because the manifest is the copy the site can actually use --
// rendering "iPhone 15 Pro, 24mm, f/1.8, 1/250s" under a photo means reading a JSON file
// server-side, not parsing EXIF out of a binary in the browser.
function readMetadata(buffer) {
  let tags
  try {
    tags = ExifReader.load(buffer, { expanded: true })
  } catch {
    return null
  }

  const exif = tags.exif ?? {}
  const gps = tags.gps ?? {}

  const info = {
    make: exif.Make?.description,
    model: exif.Model?.description,
    lens: exif.LensModel?.description,
    fNumber: rational(exif.FNumber),
    exposureTime: exif.ExposureTime?.description,
    iso: scalar(exif.ISOSpeedRatings) ?? scalar(exif.PhotographicSensitivity),
    focalLength: rational(exif.FocalLength),
    focalLength35mm: scalar(exif.FocalLengthIn35mmFilm),
    takenAt: exif.DateTimeOriginal?.description,
    utcOffset: exif.OffsetTimeOriginal?.description,
    latitude: gps.Latitude,
    longitude: gps.Longitude,
    // exifreader's convenience gps section only decodes Latitude and Longitude --
    // altitude stays behind in the raw exif block as a rational.
    altitude: rational(exif.GPSAltitude),
  }

  // Drop the keys the file simply didn't carry, so the manifest stays readable.
  for (const [k, v] of Object.entries(info)) if (v === undefined || v === null || v === '') delete info[k]
  return Object.keys(info).length ? info : null
}

// The --exif camera dict. Rebuilding the tags by hand is the only way to keep the
// camera fields while dropping GPS: sharp's keepExif() is all-or-nothing, and there is
// no "keep everything except this IFD" option.
//
// Tag names here are the EXIF spec's, not exifreader's -- notably ISOSpeedRatings, which
// silently does nothing if you spell it ISO. Values must be strings.
function cameraExif(info) {
  if (!info) return null

  const ifd0 = {}
  const ifd2 = {}
  if (info.make) ifd0.Make = String(info.make)
  if (info.model) ifd0.Model = String(info.model)
  if (info.lens) ifd2.LensModel = String(info.lens)
  if (info.fNumber) ifd2.FNumber = String(info.fNumber)
  if (info.iso) ifd2.ISOSpeedRatings = String(info.iso)
  if (info.focalLength) ifd2.FocalLength = String(info.focalLength)
  if (info.focalLength35mm) ifd2.FocalLengthIn35mmFilm = String(info.focalLength35mm)
  if (info.takenAt) ifd2.DateTimeOriginal = String(info.takenAt)
  if (info.utcOffset) ifd2.OffsetTimeOriginal = String(info.utcOffset)

  // ExposureTime has to go in as decimal seconds; '1/250' is not parsed.
  if (info.exposureTime && info.exposureTime.includes('/')) {
    const [n, d] = info.exposureTime.split('/').map(Number)
    if (d) ifd2.ExposureTime = String(n / d)
  } else if (info.exposureTime) {
    ifd2.ExposureTime = String(info.exposureTime)
  }

  if (!Object.keys(ifd0).length && !Object.keys(ifd2).length) return null
  return { IFD0: ifd0, IFD2: ifd2 }
}

// --- derivation -----------------------------------------------------------------

// Each tier is resized from the original rather than cascaded down from the tier above
// it. Cascading would be faster but compounds resampling error, and the brief here is
// quality over encode time. The cost is smaller than it looks: libvips shrink-on-load
// decodes JPEGs straight at 1/2, 1/4 or 1/8 scale, so the small tiers never pay for a
// full-resolution decode.
async function deriveOne({ buffer, width, format, outPath, animated, exifMode, exifDict, firstFrameOnly }) {
  let pipeline = sharp(buffer, {
    limitInputPixels: LIMIT_INPUT_PIXELS,
    // Without this an animated source is silently flattened to its first frame --
    // verified: a 4-page WebP came back with pages undefined and 294 bytes.
    animated: animated && !firstFrameOnly,
  })
    // No argument means "apply whatever the EXIF orientation tag says". Without it
    // every photo shot in portrait comes out on its side. sharp resets the stored
    // orientation tag to 1 afterwards, so this does not double-rotate even when the
    // EXIF block is preserved below -- verified against an Orientation=6 source.
    .rotate()
    .resize(width, null, { withoutEnlargement: true, fit: 'inside' })

  if (width <= SHARPEN_AT_OR_BELOW && !animated) pipeline = pipeline.sharpen(SHARPEN)

  // keepIccProfile() is doing real work here, and the alternatives are both wrong.
  //
  // iPhones shoot Display P3. sharp's default is to strip the profile and leave the
  // pixel values alone, which hands a browser P3 numbers with no tag -- they get read
  // as sRGB and the colour shifts. withIccProfile('srgb') is worse: measured on this
  // setup it does NOT convert the pixels either, it just relabels them sRGB, so the
  // same wrong colours ship with a tag asserting they're right.
  //
  // keepIccProfile() is the only one that leaves pixels and tag consistent, for P3 and
  // sRGB sources alike.
  pipeline = pipeline.keepIccProfile()

  // Note that keepExif() carries GPS coordinates into every derivative, and these
  // objects are served from a public CloudFront distribution that the passphrase gate
  // does not cover. --exif camera is the same thing minus the location.
  if (exifMode === 'all') pipeline = pipeline.keepExif()
  else if (exifMode === 'camera' && exifDict) pipeline = pipeline.withExif(exifDict)

  return pipeline[format](ENCODE[format]).toFile(outPath)
}

async function readSource(path) {
  // Read once and hand the same buffer to every tier. Seven tiers x two formats is
  // fourteen decodes of this photo either way, but only one trip to disk.
  const buffer = await readFile(path)
  const meta = await sharp(buffer, { limitInputPixels: LIMIT_INPUT_PIXELS }).metadata()

  // metadata() reports the stored dimensions, before EXIF rotation is applied.
  // Orientation values 5-8 are the 90-degree ones, where displayed width is stored height.
  const swapped = meta.orientation >= 5 && meta.orientation <= 8
  return {
    buffer,
    width: swapped ? meta.height : meta.width,
    height: swapped ? meta.width : meta.height,
    pages: meta.pages ?? 1,
  }
}

async function isFresh(outPath, sourceMtimeMs) {
  try {
    const out = await stat(outPath)
    return out.mtimeMs >= sourceMtimeMs
  } catch {
    return false
  }
}

async function processPhoto(opts, sourceDir, outDir, entry) {
  const sourcePath = join(sourceDir, entry)
  const name = basename(entry, extname(entry))
  const sourceStat = await stat(sourcePath)
  const source = await readSource(sourcePath)

  const animated = source.pages > 1
  const info = animated ? null : readMetadata(source.buffer)
  const exifDict = opts.exif === 'camera' ? cameraExif(info) : null

  const formats = animated ? ANIMATED_FORMATS.filter((f) => opts.formats.includes(f)) : opts.formats
  const maxWidth = animated ? Math.min(source.width, ANIMATED_MAX_WIDTH) : source.width

  const tiers = []
  let written = 0
  let bytes = 0

  const emit = async (width, format, outPath, firstFrameOnly) => {
    if (!opts.force && (await isFresh(outPath, sourceStat.mtimeMs))) return
    if (opts.dryRun) {
      written++
      return
    }
    await mkdir(join(outPath, '..'), { recursive: true })
    const result = await deriveOne({
      buffer: source.buffer,
      width,
      format,
      outPath,
      animated,
      exifMode: opts.exif,
      exifDict,
      firstFrameOnly,
    })
    written++
    bytes += result.size
  }

  for (const width of opts.widths) {
    // Skip rather than clamp. withoutEnlargement would happily emit a 1200px-wide file
    // into the 2000px folder, and then srcset would advertise it as 2000w and the
    // browser would pick it for displays it cannot actually serve.
    if (width > maxWidth) continue
    tiers.push(width)

    for (const format of formats) {
      if (format === 'avif' && width < AVIF_MIN_WIDTH) continue
      await emit(width, format, join(outDir, `${width}px`, `${name}.${format}`), false)
    }

    // Still first frames, only when asked for -- see the note at ANIMATED_MAX_WIDTH.
    //
    // These live under poster/ rather than beside the animation on purpose: listKeys()
    // in lib/photos.ts lists the prefix '{year}/200px' and filters by extension, so a
    // poster written into 200px/ would be enumerated as if it were a separate photo.
    if (animated && opts.posters) {
      await emit(width, 'webp', join(outDir, 'poster', `${width}px`, `${name}.webp`), true)
    }
  }

  return { name, width: source.width, height: source.height, tiers, animated, exif: info, written, bytes }
}

// Fixed-size worker pool over the file list. Parallelism lives here, at the photo
// level, which is why sharp.concurrency(1) is set below -- letting libvips also thread
// each individual resize would oversubscribe the machine and slow the whole run down.
async function pool(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0

  const runners = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (true) {
      const i = next++
      if (i >= items.length) return
      results[i] = await worker(items[i], i)
    }
  })

  await Promise.all(runners)
  return results
}

// --- main -----------------------------------------------------------------------

let opts
try {
  opts = parseArgs(process.argv.slice(2))
} catch (error) {
  console.error(`${error.message}\n\nRun with no arguments for usage.`)
  process.exit(1)
}

const srcRoot = resolve(opts.dir)

// Accept either layout: a folder with an originals/ subfolder, or a folder that is
// itself the originals. Exports usually land as the latter.
let sourceDir = join(srcRoot, 'originals')
try {
  await stat(sourceDir)
} catch {
  sourceDir = srcRoot
}

const outDir = opts.out ? resolve(opts.out) : srcRoot
const year = opts.year ?? basename(srcRoot)

let entries
try {
  entries = (await readdir(sourceDir)).filter((f) => SOURCE_EXTS.has(extname(f).toLowerCase())).sort()
} catch {
  console.error(`cannot read ${sourceDir}`)
  process.exit(1)
}

if (entries.length === 0) {
  console.error(`no images in ${sourceDir}`)
  process.exit(1)
}

sharp.concurrency(1)
// The operation cache is dead weight for a batch of thousands of distinct files: every
// photo is a cache miss, and holding them costs memory for the length of the run.
sharp.cache(false)

console.log(`${entries.length} originals in ${sourceDir}`)
console.log(`writing to ${outDir}  (manifest year "${year}")`)
console.log(`widths  ${opts.widths.join(', ')}`)
console.log(`formats ${opts.formats.join(', ')}`)
console.log(`exif    ${opts.exif}${opts.exif === 'all' ? '  -- includes GPS, and these files are public' : ''}`)
console.log(`${opts.dryRun ? 'DRY RUN -- ' : ''}${opts.concurrency} at a time\n`)

const started = Date.now()
const failures = []
let done = 0

const results = await pool(entries, opts.concurrency, async (entry) => {
  try {
    const result = await processPhoto(opts, sourceDir, outDir, entry)
    done++
    if (result.written) {
      const kind = result.animated ? ' (animated)' : ''
      console.log(`  ${String(done).padStart(4)}/${entries.length}  ${result.name}${kind}  ${result.written} files`)
    }
    return result
  } catch (error) {
    done++
    failures.push({ entry, message: error.message })
    console.error(`  FAIL  ${entry} -- ${error.message}`)
    return null
  }
})

const ok = results.filter(Boolean)
const totalWritten = ok.reduce((n, r) => n + r.written, 0)
const totalBytes = ok.reduce((n, r) => n + r.bytes, 0)

// The manifest is what lets the frontend do the things it currently cannot: set
// width/height on every <img> (no layout shift, and it retires the min-width:200px hack
// in AlbumContent that works around zero-size tiles never lazy-loading), build a srcset
// that only advertises tiers that were actually generated, know which items are clips,
// and caption a photo with the camera that took it.
if (!opts.dryRun) {
  const manifest = {
    year,
    formats: opts.formats,
    // AVIF is not emitted below this width (see AVIF_MIN_WIDTH), so a <picture> built
    // from `tiers` has to filter its AVIF <source> against this or it will advertise
    // files that were never written.
    avifMinWidth: opts.formats.includes('avif') ? AVIF_MIN_WIDTH : null,
    photos: ok
      .map(({ name, width, height, tiers, animated, exif }) => ({
        name,
        width,
        height,
        tiers,
        ...(animated ? { animated: true } : {}),
        ...(exif ? { exif } : {}),
      }))
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
  }
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  console.log(`\nmanifest.json  ${manifest.photos.length} photos`)
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1)
console.log(`${totalWritten} files  ${(totalBytes / 1048576).toFixed(1)} MB  ${elapsed}s`)

if (failures.length) {
  console.error(`\n${failures.length} failed:`)
  for (const f of failures) console.error(`  ${f.entry} -- ${f.message}`)
  process.exit(1)
}
