import { describe, expect, it } from 'vitest';
import { completeArticleMetadata } from '../src/article-metadata.js';
const draft = {
  title: 'தமிழ்நாடு விவசாயிகள் செய்தி',
  summary: 'விவசாயிகள் கோரிக்கை குறித்த செய்தித் தொகுப்பு.',
  body: '',
  tags: [] as string[],
};
describe('extractive article metadata', () => {
  it('fills SEO and matches only registered complete tag words', () => {
    const result = completeArticleMetadata(draft, [
      'விவசாயிகள்',
      'செய்தி',
      'விவசாயி',
      'விளையாட்டு',
    ]);
    expect(result.seoTitle).toBe(draft.title);
    expect(result.seoDescription).toBe(draft.summary);
    expect(result.tags).toEqual(['செய்தி', 'விவசாயிகள்']);
  });
  it('preserves editorial metadata and chosen tags', () => {
    const input = {
      ...draft,
      seoTitle: 'Custom title',
      seoDescription: 'Custom description',
      tags: ['தேர்வு'],
    };
    expect(completeArticleMetadata(input, ['செய்தி'])).toEqual(input);
  });
  it('bounds Tamil text without splitting graphemes and replaces whitespace-only fields', () => {
    const result = completeArticleMetadata(
      { ...draft, summary: 'கோ'.repeat(400), seoTitle: '  ' },
      [],
    );
    expect(result.seoTitle).toBe(draft.title);
    expect(result.seoDescription!.length).toBeLessThanOrEqual(320);
    expect(result.seoDescription).toMatch(/^(கோ)+$/u);
    expect(result.tags).toEqual([]);
  });
});
