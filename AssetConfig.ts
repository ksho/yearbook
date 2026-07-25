// Photo assets are served through CloudFront (distribution E2AKQTW7LH879C), which fronts
// the yearbook-assets S3 bucket. The distribution also attaches a long-lived Cache-Control
// via a response headers policy -- the S3 objects themselves carry no cache headers at all.
//
// Set NEXT_PUBLIC_ASSET_HOST to override, e.g. to fall back to the bucket directly
// ('yearbook-assets.s3.amazonaws.com') without a code change.
export const ASSET_HOST =
  process.env.NEXT_PUBLIC_ASSET_HOST || 'd2nk87d9flz1jw.cloudfront.net';

export const assetUrl = (key: string) => `https://${ASSET_HOST}/${key}`;
