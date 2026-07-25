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
        hostname: 'yearbook-assets.s3.amazonaws.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
}
