/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Cloudflare Workers no tiene optimizador de imágenes nativo
  },
};

export default nextConfig;
