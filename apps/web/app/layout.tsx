import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'மகரம் மீடியா',
  description: 'Tamil journalism, local commerce, and community intelligence.',
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
