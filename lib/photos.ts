import { S3Client, paginateListObjectsV2 } from '@aws-sdk/client-s3'

// Shared S3 access + filename parsing. Both the album page and the home page
// preview strips read through here so there is one definition of "what is in a year".

const SUPPORTED_FILES = ['jpg', 'gif', 'webp']
const BUCKET = 'yearbook-assets'

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_S3_ACCESS_KEY as string,
    secretAccessKey: process.env.AWS_S3_SECRET as string,
  },
})

// Paginates past the 1000-key cap that a bare ListObjectsV2 silently truncates at.
// Only includes keys ending in SUPPORTED_FILES -- filters out directories and any
// weird files like .DS_Store.
async function listKeys(prefix: string): Promise<string[]> {
  const keys: string[] = []

  for await (const page of paginateListObjectsV2({ client: s3 }, { Bucket: BUCKET, Prefix: prefix })) {
    for (const { Key } of page.Contents ?? []) {
      const lower = Key?.toLowerCase()
      if (Key && lower && SUPPORTED_FILES.some((ext) => lower.endsWith(ext))) {
        keys.push(Key)
      }
    }
  }

  return keys
}

// The home page lists every year at once, so without this each page load would fan out
// 15 paginated bucket listings. Keys only change when new photos are uploaded, so a short
// process-local TTL is plenty -- and it resets on every deploy anyway.
const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { at: number; keys: string[] }>()

export const fileName = (key: string) => key.split('/').pop() ?? key

// Sorts by filename only -- keys are timestamp-prefixed, so this is chronological.
// Photos live in {year}/200px and videos in {year}/video/webp, and interleaving them
// by name puts a clip in the middle of the day it was shot.
function byFileName(a: string, b: string) {
  const aName = fileName(a)
  const bName = fileName(b)

  if (aName === bName) return 0
  return aName < bName ? -1 : 1
}

export async function listAlbum(year: string): Promise<string[]> {
  const hit = cache.get(year)
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return hit.keys
  }

  const [photos, videos] = await Promise.all([
    listKeys(`${year}/200px`),
    listKeys(`${year}/video/webp`),
  ])

  const keys = videos.concat(photos).sort(byFileName)
  cache.set(year, { at: Date.now(), keys })

  return keys
}

// Every key across all 15 years is named YYYYMMDD-... -- both the stills
// (20250102-202907-9243.webp) and the clips (20250301-IMG_1286-...webp).
const DATE_RE = /^(\d{4})(\d{2})(\d{2})/

export function keyDate(key: string): { year: number; month: number; day: number } | null {
  const match = DATE_RE.exec(fileName(key))
  if (!match) return null

  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  return { year: Number(match[1]), month, day }
}

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export const MONTH_ABBR = MONTH_NAMES.map((m) => m.slice(0, 3))

// "January 2, 2025" -- shown as the lightbox caption. Built from the filename rather than
// EXIF so it costs nothing; anything unparseable just gets no caption.
export function formatKeyDate(key: string): string | null {
  const parsed = keyDate(key)
  if (!parsed) return null

  return `${MONTH_NAMES[parsed.month - 1]} ${parsed.day}, ${parsed.year}`
}

export interface MonthMarker {
  month: number
  label: string
  count: number
  // Index into the album's key list of the first item in this month -- what the rail
  // scrolls to, and how far the grid has to reveal before that item exists in the DOM.
  index: number
}

// Walks the (already chronological) key list and records where each month starts.
export function monthMarkers(keys: string[]): MonthMarker[] {
  const markers: MonthMarker[] = []

  keys.forEach((key, index) => {
    const parsed = keyDate(key)
    if (!parsed) return

    const last = markers[markers.length - 1]
    if (last && last.month === parsed.month) {
      last.count += 1
      return
    }

    markers.push({
      month: parsed.month,
      label: MONTH_ABBR[parsed.month - 1],
      count: 1,
      index,
    })
  })

  return markers
}

// Picks `count` items spread evenly across the year for the home page preview strip,
// so a year reads as January-to-December rather than as one afternoon in March.
export function spreadSample(keys: string[], count: number): string[] {
  if (keys.length <= count) return keys

  const step = keys.length / count
  return Array.from({ length: count }, (_, i) => keys[Math.floor(i * step)])
}
