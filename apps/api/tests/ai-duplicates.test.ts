import { describe, expect, it } from 'vitest';
import { duplicateSimilarity } from '../src/ai-duplicates.js';
describe('Tamil-aware local duplicate checks', () => {
  it('recognizes identical Tamil text despite punctuation and Unicode normalization', () => {
    const text = 'சென்னையில் இன்று புதிய நூலகம் திறக்கப்பட்டது';
    expect(duplicateSimilarity(text, `${text.normalize('NFD')}!`)).toBe(1);
  });
  it('does not claim overlap for unrelated or empty reporting', () => {
    expect(
      duplicateSimilarity(
        'சென்னையில் புதிய நூலகம் திறக்கப்பட்டது',
        'மதுரையில் மழை காரணமாக பள்ளிகள் விடுமுறை',
      ),
    ).toBe(0);
    expect(duplicateSimilarity('', '')).toBe(0);
  });
  it('returns a bounded lexical overlap score for partial overlap', () => {
    const score = duplicateSimilarity(
      'சென்னை இன்று புதிய நூலகம் திறக்கப்பட்டது',
      'சென்னை இன்று புதிய பூங்கா திறக்கப்பட்டது',
    );
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });
});
