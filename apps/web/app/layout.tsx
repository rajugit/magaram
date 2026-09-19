import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { siteUrl } from './_lib/public-data';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'மகரம் மீடியா | நம் ஊரின் குரல்',
    template: '%s | மகரம் மீடியா',
  },
  description: 'நம்பகமான தமிழ் செய்திகளும் உள்ளூர் பார்வைகளும்.',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'ta_IN',
    siteName: 'மகரம் மீடியா',
    title: 'மகரம் மீடியா | நம் ஊரின் குரல்',
    description: 'நம்பகமான தமிழ் செய்திகளும் உள்ளூர் பார்வைகளும்.',
    url: siteUrl,
  },
  twitter: {
    card: 'summary',
    title: 'மகரம் மீடியா | நம் ஊரின் குரல்',
    description: 'நம்பகமான தமிழ் செய்திகளும் உள்ளூர் பார்வைகளும்.',
  },
  icons: {
    icon: { url: '/brand/magaram-logo.png', type: 'image/png', sizes: '180x180' },
    apple: '/brand/magaram-logo.png',
  },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ta">
      <body>{children}</body>
    </html>
  );
}
