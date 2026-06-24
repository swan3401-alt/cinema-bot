// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
  

// };


// export default nextConfig;


import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl({
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'images-eu.ssl-images-amazon.com',
        port: '',
        pathname: '/images/S/pv-target-images/**',
      },
      { 
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com"
      },
    ],
  },
});