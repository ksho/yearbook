This application displays the photos for my annual yearbook project.

# Some vitals:
- Built with [Next.js](https://nextjs.org/)
- Media stored in S3 in multiple sizes -- allows the best size to be used depending on the case (e.g. 1000px for the main grid, 3000px for the lightbox)
- Served through CloudFront (`d2nk87d9flz1jw.cloudfront.net`) so images are edge-cached rather than pulled from us-east-1 on every view
- Images are loaded in batches as the user scrolls to keep initial load time fast.
- Hosted on Vercel

# Features on deck:
- Read EXIF data from images to display photo captions
- Improve grid layout so portrait images aren't chopped so much at the top and bottom

# Usage

The upload, preview and video recipes live in [CLAUDE.md](CLAUDE.md), under **Asset Management**.
They are kept in one place on purpose: the commands that used to sit here synced to the bucket
root with `--delete`, which against today's `v2/` layout would delete most of what the site
serves, and published the manifests that are meant to stay private.
