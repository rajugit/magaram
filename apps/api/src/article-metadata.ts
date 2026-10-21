/** Free, extractive defaults. These copy reporting, never add claims or verify it. */
export function completeArticleMetadata<
  T extends {
    title: string;
    summary: string;
    body: string;
    tags: string[];
    seoTitle?: string;
    seoDescription?: string;
  },
>(input: T, registeredTags: string[]): T & { seoTitle: string; seoDescription: string } {
  const clean = (value: string) => value.replace(/\s+/gu, ' ').trim();
  // Keep Tamil grapheme clusters intact while respecting database UTF-16 limits.
  const limit = (value: string, max: number) => {
    let result = '';
    for (const { segment } of new Intl.Segmenter('ta', { granularity: 'grapheme' }).segment(
      clean(value),
    )) {
      if ((result + segment).length > max) break;
      result += segment;
    }
    return result.trim();
  };
  const words = new Set(
    [
      ...new Intl.Segmenter('ta', { granularity: 'word' }).segment(
        input.title + ' ' + input.summary,
      ),
    ]
      .filter((part) => part.isWordLike)
      .map((part) => part.segment.toLocaleLowerCase('ta')),
  );
  const matches = registeredTags.filter((tag) => {
    const parts = [...new Intl.Segmenter('ta', { granularity: 'word' }).segment(tag)].filter(
      (part) => part.isWordLike,
    );
    return (
      parts.length > 0 && parts.every((part) => words.has(part.segment.toLocaleLowerCase('ta')))
    );
  });
  return {
    ...input,
    seoTitle: input.seoTitle?.trim() || limit(input.title, 250),
    seoDescription: input.seoDescription?.trim() || limit(input.summary, 320),
    tags: input.tags.length ? input.tags : [...new Set(matches)].sort().slice(0, 15),
  };
}
