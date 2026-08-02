/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  // Two `next dev` instances in one checkout fight over the .next/dev lock. Setting
  // NEXT_DIST_DIR gives a second instance its own build dir; unset, nothing changes.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  compiler: {
    // Replaces the babel-plugin-styled-components config that used to live in .babelrc.
    // Keeping it here lets Next use SWC/Turbopack instead of falling back to Babel.
    styledComponents: true,
  },
  // Belt and braces alongside public/robots.txt: robots.txt asks a crawler not to fetch, this
  // tells anything that fetched anyway not to index. Applies to the gate page too, which is
  // the only page a crawler can actually reach.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd2nk87d9flz1jw.cloudfront.net',
        port: '',
        pathname: '/**',
      },
      // Kept so NEXT_PUBLIC_ASSET_HOST can fall back to the bucket without a code change.
      {
        protocol: 'https',
        hostname: 'yearbook-assets.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}
