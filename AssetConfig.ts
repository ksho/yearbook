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
// Key prefix for everything the album reads: listings, manifests and tier URLs alike.
//
// Regenerating a year renames its files -- the current Lightroom preset appends a sequence
// number, so 2014 through 2022 came back as 20160101-010156-2936.webp where the bucket
// holds 20160101-010156.jpg. Uploading those into the existing paths would leave both
// copies sitting there and every photo in those years would list twice. Writing the new
// ladder under its own prefix sidesteps that entirely: nothing overwrites, nothing has to
// be deleted, and the old paths stay exactly as they are, still cached at the edge, so a
// rollback is just shipping the previous value of this constant.
//
// Defaults to v2, which holds the full size ladder for every year plus the clips, verified
// object-for-object against what derive-sizes.mjs wrote (66,136 keys) before this was set.
// The old layout is still in the bucket at the root, untouched.
//
// `??` rather than `||` on purpose: an explicitly empty NEXT_PUBLIC_ASSET_PREFIX means the
// old root layout. That is how a local YEARBOOK_MANIFEST_DIR preview runs, since the folder
// derive-sizes.mjs writes has no v2/ level, and it is a way back without a code change.
export const KEY_PREFIX = (process.env.NEXT_PUBLIC_ASSET_PREFIX ?? 'v2').replace(/^\/+|\/+$/g, '');

export const prefixed = (key: string) => (KEY_PREFIX ? `${KEY_PREFIX}/${key}` : key);

export const assetUrl = (key: string) =>
  /^https?:\/\//.test(ASSET_HOST) ? `${ASSET_HOST}/${key}` : `https://${ASSET_HOST}/${key}`;
