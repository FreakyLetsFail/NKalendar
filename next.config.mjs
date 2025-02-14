/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true, // Falls du Bilder ohne Optimierung nutzen willst
  },
};

export default nextConfig;