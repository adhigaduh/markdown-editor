export function extractOutline(content) {
  return content
    .split('\n')
    .filter((line) => /^#{1,3}\s/.test(line))
    .map((line) => {
      const match = line.match(/^(#{1,3})\s+(.+)/);
      return { level: match[1].length, text: match[2].trim() };
    });
}
