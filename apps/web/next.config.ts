import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite acessar o dev server via IP da rede local (ex: celular/outro
  // dispositivo na mesma rede) sem o Next bloquear assets e Server Actions
  // por origem cruzada.
  allowedDevOrigins: ['192.168.1.10', 'localhost'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', // Google profile pictures
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',             // Supabase Storage
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',         // Capas por esporte (hotlink, sem hospedar)
      },
    ],
  },
};

export default nextConfig;
