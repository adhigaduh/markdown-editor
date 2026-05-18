import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
import { Milkdown, MilkdownProvider, useEditor } from '@milkdown/react';
import { commonmark } from '@milkdown/preset-commonmark';
import { gfm } from '@milkdown/preset-gfm';
import { history } from '@milkdown/plugin-history';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { clipboard } from '@milkdown/plugin-clipboard';
import { useMarkdownStore } from '../store/useMarkdownStore';
import { tableHardBreakPlugin } from '../plugins/tableHardBreak';

function MilkdownEditor({ defaultValue, onChange }) {
  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, defaultValue);
        ctx.get(listenerCtx).markdownUpdated((_, markdown) => {
          onChange(markdown);
        });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(listener)
      .use(clipboard)
      .use(tableHardBreakPlugin)
  );

  return <Milkdown />;
}

export default function EditorComponent({ initialContent = '' }) {
  const { content, updateContent, isSourceMode } = useMarkdownStore();

  if (isSourceMode) {
    return (
      <div className="editor-wysiwyg">
        <div className="editor-content-wrapper">
          <textarea
            className="source-editor"
            value={content}
            onChange={(e) => updateContent(e.target.value)}
            spellCheck={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="editor-wysiwyg">
      <div className="editor-content-wrapper">
        <MilkdownProvider>
          <MilkdownEditor defaultValue={initialContent} onChange={updateContent} />
        </MilkdownProvider>
      </div>
    </div>
  );
}
