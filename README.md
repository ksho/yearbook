This application displays the photos for my annual yearbook project.

Some vitals:
- Built with [Next.js](https://nextjs.org/)
- Media stored in S3 in multiple sizes -- allows the best size to be used depending on the case (e.g. 1000px for the main grid, 3000px for the lightbox)
- Images are loaded in batches as the user scrolls to keep initial load time fast.
- Hosted on Vercel

Features on deck:
- Support for multiple albums
- Read EXIF data from images to display photo captions
- Improve grid layout so portrait images aren't chopped so much at the top and bottom
