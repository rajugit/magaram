export type ArticleStatus =
  | 'DRAFT'
  | 'AI_DRAFT'
  | 'EDITOR_REVIEW'
  | 'FACT_CHECK'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'UPDATED'
  | 'ARCHIVED';
export type Article = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  body: string;
  category: string;
  location: string;
  status: ArticleStatus;
  type: string;
  sensitive: boolean;
  sponsored: boolean;
  isDemo: boolean;
  version: number;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  author: { id: string; displayName: string };
  authorId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sources: { id: string; label: string; url: string; verified: boolean }[];
  claims: { id: string; text: string; status: string; evidence: string }[];
  corrections: { id: string; reason: string; createdAt: string }[];
  image?: { id: string; alt: string; credit: string } | null;
};
export const contactEmail = 'magaram.in@gmail.com';
export const demoArticles: Article[] = [
  [
    'chennai-neighbourhood',
    'நம் ஊரை நெருக்கமாகப் பார்ப்போம்: சென்னையின் அன்றாடக் கதைகள்',
    'சென்னை',
    'உள்ளூர்',
    'PUBLISHED',
    'பரபரப்பான நகரத்திற்குள் வாழும் சிறிய தெருக்கள், உள்ளூர் கடைகள், மனிதர்களின் பெரிய கனவுகள்.',
  ],
  [
    'local-business-guide',
    'ஒரு சிறு தொழில், ஒரு பெரிய கனவு',
    'கோவை',
    'வணிகம்',
    'PUBLISHED',
    'உள்ளூர் தொழில்முனைவோரின் அனுபவங்களைப் பதிவு செய்வதற்கான மகரம் சிறப்புத் தொகுப்பு.',
  ],
  [
    'reading-spaces',
    'நூலகம் என்பது புத்தகங்களைக் கடந்த ஒரு சந்திப்பு',
    'மதுரை',
    'வாழ்க்கை',
    'PUBLISHED',
    'வாசிப்பு, உரையாடல், புதிய சிந்தனைகள்: நம் ஊரின் வாசிப்பு இடங்களை அறிமுகப்படுத்தும் தொடர்.',
  ],
  [
    'craft-stories',
    'கைவினையில் மலரும் தலைமுறைகளின் நினைவுகள்',
    'தஞ்சாவூர்',
    'கலை',
    'EDITOR_REVIEW',
    'கைவினைக் கலைஞர்களின் வாழ்வையும் படைப்புகளையும் பதிவு செய்யும் நேர்காணல் வரைவு.',
  ],
  [
    'student-opportunities',
    'மாணவர்களுக்கான வாய்ப்புகள்: தகவல்களைச் சரிபார்ப்பது எப்படி?',
    'தமிழ்நாடு',
    'கல்வி',
    'FACT_CHECK',
    'சேர்க்கை அறிவிப்புகளையும் கல்வி உதவிகளையும் அதிகாரப்பூர்வ ஆதாரங்களில் சரிபார்க்கும் வழிகாட்டி.',
  ],
  [
    'weekend-city',
    'இந்த வார இறுதியில் உங்கள் ஊரைப் புதிதாகக் காணுங்கள்',
    'சென்னை',
    'வாழ்க்கை',
    'DRAFT',
    'நடைப்பயணம், வாசிப்பு, கலை: அடுத்த சிறப்புத் தொகுப்பிற்கான ஆசிரியர் திட்டம்.',
  ],
].map(([slug, title, location, category, status, summary], i) => ({
  id: `demo-${i + 1}`,
  title,
  slug,
  summary,
  body: `${summary}\n\nஇது மகரம் மீடியாவின் வடிவமைப்பு மற்றும் செயல்முறை முன்னோட்டத்திற்காக உருவாக்கப்பட்ட மாதிரிக் கட்டுரை. இது வெளியிடப்பட்ட செய்தி அறிக்கை அல்ல. உண்மையான பெயர்கள், சம்பவங்கள், மேற்கோள்கள் அல்லது புள்ளிவிவரங்களை இந்த மாதிரி உரை குறிப்பிடவில்லை.\n\nவெளியீட்டிற்கு முன் செய்தியாளர் ஆதாரங்களைச் சேர்த்து, தகவல்களைச் சரிபார்த்து, ஆசிரியரின் ஒப்புதலைப் பெற வேண்டும்.`,
  category,
  location,
  status: status as ArticleStatus,
  type: 'NEWS',
  sensitive: false,
  sponsored: false,
  isDemo: true,
  version: 1,
  tags: ['மாதிரி'],
  authorId: 'demo-reporter',
  author: { id: 'demo-reporter', displayName: 'மகரம் ஆசிரியர் குழு' },
  publishedAt: status === 'PUBLISHED' ? '2026-09-15T03:30:00.000Z' : null,
  createdAt: '2026-09-15T03:30:00.000Z',
  updatedAt: '2026-09-15T03:30:00.000Z',
  sources: [],
  claims: [],
  corrections: [],
}));
export const phaseNames = [
  'Audit',
  'Foundation',
  'Editorial CMS',
  'AI newsroom',
  'Public website',
  'SEO',
  'Social distribution',
  'Magaram Local',
  'Advertising',
  'Revenue expansion',
  'Audience',
  'Media business',
  'Revenue intelligence',
  'AWS production',
  'CI/CD',
  'Production readiness',
];
export const navGroups = [
  {
    label: 'WORKSPACE',
    items: [
      ['Overview', '/admin', 'grid'],
      ['Articles', '/admin/articles', 'news'],
      ['Review queue', '/admin/review', 'check'],
      ['Media library', '/admin/media', 'image'],
      ['AI newsroom', '/admin/ai', 'spark'],
    ],
  },
  {
    label: 'GROWTH',
    items: [
      ['Distribution', '/admin/social', 'send'],
      ['Local businesses', '/admin/businesses', 'store'],
      ['Advertising', '/admin/campaigns', 'briefcase'],
      ['Audience', '/admin/audience', 'users'],
      ['Revenue', '/admin/revenue', 'chart'],
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      ['Settings', '/admin/settings', 'settings'],
      ['Audit trail', '/admin/audit', 'shield'],
      ['Taxonomy', '/admin/taxonomy', 'grid'],
      ['Phase previews', '/preview', 'grid'],
    ],
  },
];
