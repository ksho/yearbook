/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
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
