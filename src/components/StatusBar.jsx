import { useMemo } from 'react';
import { useMarkdownStore } from '../store/useMarkdownStore';
import { countWords } from '../utils/wordCount';

export default function StatusBar() {
  const content = useMarkdownStore((s) => s.content);

  const stats = useMemo(
    () => ({ words: countWords(content), chars: content.length }),
    [content]
  );

  return (
    <div className="status-bar">
      <span className="status-item">
        {stats.words} words · {stats.chars} chars
      </span>
      <span className="status-item">UTF-8</span>
    </div>
  );
}
