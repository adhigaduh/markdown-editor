import { describe, it, expect } from 'vitest';
import { extractOutline } from '../utils/outline';

describe('extractOutline', () => {
  it('returns empty array for empty string', () => {
    expect(extractOutline('')).toEqual([]);
  });

  it('returns empty array when no headings', () => {
    expect(extractOutline('Hello world\nNo headings here')).toEqual([]);
  });

  it('extracts h1', () => {
    expect(extractOutline('# Title')).toEqual([{ level: 1, text: 'Title' }]);
  });

  it('extracts h2 and h3', () => {
    const result = extractOutline('## Section\n### Subsection');
    expect(result).toEqual([
      { level: 2, text: 'Section' },
      { level: 3, text: 'Subsection' },
    ]);
  });

  it('ignores h4 and deeper', () => {
    expect(extractOutline('#### Deep heading')).toEqual([]);
  });

  it('handles mixed content', () => {
    const md = `# Title\n\nSome text.\n\n## Section\n\nMore text.\n\n### Sub`;
    expect(extractOutline(md)).toEqual([
      { level: 1, text: 'Title' },
      { level: 2, text: 'Section' },
      { level: 3, text: 'Sub' },
    ]);
  });

  it('ignores # that is not at line start', () => {
    expect(extractOutline('Text with # symbol')).toEqual([]);
  });
});
