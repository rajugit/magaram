import type { Metadata } from 'next';

import { TrustPage } from '../_components/public-site';

export const metadata: Metadata = {
  title: 'நம்பிக்கை மற்றும் ஆசிரியர் உறுதி',
  description: 'மகரம் மீடியாவின் ஆசிரியர் மதிப்பாய்வு மற்றும் திருத்த அணுகுமுறை.',
  alternates: { canonical: '/trust' },
};

export default function Trust() {
  return <TrustPage />;
}
