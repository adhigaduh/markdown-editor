import { InitReady, remarkPluginsCtx, remarkStringifyOptionsCtx } from '@milkdown/core';
import { hardbreakFilterNodes } from '@milkdown/preset-commonmark';
import { defaultHandlers } from 'mdast-util-to-markdown';

// Parse direction: runs FIRST, before remarkPreserveEmptyLinePlugin strips html nodes.
// Converts html:<br> (has position = from source markdown) in table cells → break.
function processParseDir(children, tableCellNode) {
  const result = [];
  for (const child of children) {
    if (tableCellNode) {
      if (
        child.type === 'html' &&
        /^<br\s*\/?>$/i.test((child.value || '').trim()) &&
        child.position
      ) {
        result.push({ type: 'break' });
        continue;
      }
      if (child.type === 'text' && child.position && /<br\s*\/?>/i.test(child.value || '')) {
        const parts = (child.value || '').split(/<br\s*\/?>/i);
        parts.forEach((part, i) => {
          if (part) result.push({ type: 'text', value: part });
          if (i < parts.length - 1) result.push({ type: 'break' });
        });
        continue;
      }
    }
    if (Array.isArray(child.children) && child.children.length > 0) {
      child.children = processParseDir(
        child.children,
        child.type === 'tableCell' ? child : tableCellNode,
      );
    }
    result.push(child);
  }
  return result;
}

const tableBreakParsePlugin = () => (tree) => {
  if (Array.isArray(tree.children)) {
    tree.children = processParseDir(tree.children, null);
  }
};

// Serialize direction: custom remark-stringify handler for 'break' nodes.
// When the immediate parent is a tableCell, emit <br> instead of the default
// backslash+newline (which remark-gfm would convert to a space inside tables).
function breakHandler(node, parent, state, info) {
  if (state.stack.includes('tableCell')) {
    return '<br>';
  }
  return defaultHandlers.break(node, parent, state, info);
}

export const tableHardBreakPlugin = (ctx) => {
  // Outer function runs synchronously after system plugins inject their slices.
  // Override the remark-stringify break handler to emit <br> in table cells.
  ctx.update(remarkStringifyOptionsCtx, (options) => ({
    ...options,
    handlers: { ...options.handlers, break: breakHandler },
  }));

  return async () => {
    await ctx.wait(InitReady);
    // Remove 'table' from the hardbreak filter so Shift+Enter works in table cells.
    ctx.set(hardbreakFilterNodes.key, ['code_block']);
    // Add parse transform FIRST so it runs before remarkPreserveEmptyLinePlugin.
    ctx.update(remarkPluginsCtx, (plugins) => [
      { plugin: tableBreakParsePlugin, options: {} },
      ...plugins,
    ]);
  };
};
