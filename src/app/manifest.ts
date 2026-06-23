import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SnapDigit',
    short_name: 'SnapDigit',
    description: 'Instantly purchase virtual numbers, social media boosts, and ready-made accounts.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#4F46E5', // Indigo-600
    icons: [
      {
        src: '/icon.png',
        sizes: 'any',
        type: 'image/png',
      },
    ],
  };
}
