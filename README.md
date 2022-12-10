This application displays the photos for my annual yearbook project.

# Some vitals:
- Built with [Next.js](https://nextjs.org/)
- Media stored in S3 in multiple sizes -- allows the best size to be used depending on the case (e.g. 1000px for the main grid, 3000px for the lightbox)
- Images are loaded in batches as the user scrolls to keep initial load time fast.
- Hosted on Vercel

# Features on deck:
- Support for multiple albums
- Read EXIF data from images to display photo captions
- Improve grid layout so portrait images aren't chopped so much at the top and bottom

# Usage

## Sync assets to S3
- _doesn't sync video_
- `cd $LOCAL_PHOTO_DIRECTORY`
- `aws s3 sync . s3://yearbook-assets/ --delete --acl public-read --profile default --exclude "*" --include "*.jpg"`

## Converting videos to gif
```
for i in *; do ffmpeg -ss 00:00:00.000 -i "$i" -pix_fmt rgb24 -r 12 -vf 'scale=600:600:force_original_aspect_ratio=decrease' -t 00:00:10.000 "${i%.*}.gif"; done
```

- converts a folder of video -> gif
- longest side 600px
- first 10 secs
- 12 frames/sec


_alternatively_

`ffmpeg -ss 00:00:00.000 -i IMG_5407.MOV -pix_fmt rgb24 -r 15 -s 300x553 -t 00:00:10.000 output4.gif`
..this is a 10 sec clip of the movie at a 15/sec frame rate .. downsized to 300x553