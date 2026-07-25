/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  compiler: {
    // Replaces the babel-plugin-styled-components config that used to live in .babelrc.
    // Keeping it here lets Next use SWC/Turbopack instead of falling back to Babel.
    styledComponents: true,
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
