// Photo assets are served through CloudFront (distribution E2AKQTW7LH879C), which fronts
// the yearbook-assets S3 bucket. The distribution also attaches a long-lived Cache-Control
// via a response headers policy -- the S3 objects themselves carry no cache headers at all.
//
// Set NEXT_PUBLIC_ASSET_HOST to override, e.g. to fall back to the bucket directly
// ('yearbook-assets.s3.amazonaws.com') without a code change.
export const ASSET_HOST =
  process.env.NEXT_PUBLIC_ASSET_HOST || 'd2nk87d9flz1jw.cloudfront.net';

// A host that already carries its own scheme is used verbatim. That is what makes a local
// preview possible -- point NEXT_PUBLIC_ASSET_HOST at 'http://localhost:8081' serving the
// folder derive-sizes.mjs wrote, and the album loads tiers that are not on the CDN yet.
// A bare hostname still gets https, so the production value is unaffected.
export const assetUrl = (key: string) =>
  /^https?:\/\//.test(ASSET_HOST) ? `${ASSET_HOST}/${key}` : `https://${ASSET_HOST}/${key}`;
