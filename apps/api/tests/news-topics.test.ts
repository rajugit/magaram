import { describe, expect, it } from 'vitest';
import { calculateTrendScore, headlineSimilarity, headlineTokens } from '../src/news-topics.js';

describe('news topic clustering', () => {
  it('normalizes Tamil and English headline tokens', () => {
    expect(headlineTokens('Chennai rains: city roads update')).toEqual(['chennai', 'rains', 'city', 'roads', 'update']);
    expect(headlineTokens('சென்னை நகர சாலை நிலவரம்')).toContain('சென்னை');
  });

  it('scores repeated headlines by shared tokens', () => {
    expect(headlineSimilarity('Chennai rains disrupt traffic', 'Chennai rains affect traffic')).toBeGreaterThan(0.35);
    expect(headlineSimilarity('Chennai rains disrupt traffic', 'Coimbatore exam schedule')).toBe(0);
  });

  it('redistributes unavailable trend signals over available inputs', () => {
    const base = calculateTrendScore({ publishedAt: new Date(), discoveredAt: new Date(), independentSourceCount: 2, geography: 'TAMIL_NADU' });
    const full = calculateTrendScore({ publishedAt: new Date(), discoveredAt: new Date(), independentSourceCount: 2, geography: 'TAMIL_NADU', searchTrend: 1, engagement: 1 });
    expect(base).toBeGreaterThan(0);
    expect(full).toBeGreaterThan(base);
    expect(full).toBeLessThanOrEqual(100);
  });
});
