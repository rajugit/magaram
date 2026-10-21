import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getPublicArticle } from '../../../_lib/public-data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Only the published projection is accessible. Never render private draft text here.
  const article = await getPublicArticle(slug);
  if (!article) return new Response('Not found', { status: 404 });
  const font = await readFile(join(process.cwd(), 'assets/fonts/NotoSansTamil-Regular.ttf'));
  const title = [...new Intl.Segmenter('ta', { granularity: 'grapheme' }).segment(article.title)]
    .slice(0, 110)
    .map((part) => part.segment)
    .join('');
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: '#102d32',
        color: '#ffffff',
        padding: 56,
        fontFamily: 'Tamil',
      }}
    >
      <div style={{ display: 'flex', color: '#edc783', fontSize: 32 }}>மகரம் மீடியா</div>
      <div style={{ display: 'flex', marginTop: 30, fontSize: 24 }}>
        {article.category} · {article.location}
      </div>
      <div style={{ display: 'flex', marginTop: 28, fontSize: 46, lineHeight: 1.5 }}>
        {title}
        {title !== article.title ? '…' : ''}
      </div>
      <div style={{ display: 'flex', marginTop: 'auto', fontSize: 22, color: '#edc783' }}>
        செய்தி அட்டை · நிகழ்வுப் புகைப்படம் அல்ல
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [{ name: 'Tamil', data: font, weight: 400, style: 'normal' }],
      headers: { 'Cache-Control': 'no-store' },
    },
  );
}
