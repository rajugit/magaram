// Local lexical comparison only: no embedding calls, external transmission or plagiarism verdict.
export function textShingles(text: string) {
  const words =
    text
      .slice(0, 20000)
      .normalize('NFC')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .toLocaleLowerCase('ta')
      .match(/[\p{L}\p{M}\p{N}]+/gu) || [];
  if (words.length < 2) return new Set(words);
  return new Set(words.slice(1).map((word, index) => `${words[index]} ${word}`));
}
export function duplicateSimilarity(left: string, right: string) {
  const a = textShingles(left);
  const b = textShingles(right);
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const item of a) if (b.has(item)) common++;
  return common / (a.size + b.size - common);
}
