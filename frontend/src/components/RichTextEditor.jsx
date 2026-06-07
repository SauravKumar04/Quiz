import { useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Image as ImageIcon,
  Undo2,
  Redo2,
  Trash2,
} from 'lucide-react';

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Write here...',
  onUploadImage,
  className = '',
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const extensions = useMemo(
    () => [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder]
  );

  const editor = useEditor({
    extensions,
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[220px] rounded-b-2xl bg-white px-4 py-4 text-[15px] leading-7 outline-none prose prose-neutral max-w-none',
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const next = value || '';
    if (next !== current) {
      editor.commands.setContent(next, false);
    }
  }, [value, editor]);

  const uploadAndInsert = async (file) => {
    if (!file || !onUploadImage || !editor) return;

    setUploading(true);
    try {
      const url = await onUploadImage(file);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      onChange?.(editor.getHTML());
    } finally {
      setUploading(false);
    }
  };

  const handleImagePick = () => {
    fileInputRef.current?.click();
  };

  const applyMark = (mark) => {
    if (!editor) return;
    editor.chain().focus()[mark]().run();
  };

  const clearFormat = () => {
    if (!editor) return;
    editor.chain().focus().clearNodes().unsetAllMarks().run();
  };

  return (
    <div className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 px-2 py-2">
        <button
          type="button"
          onClick={() => applyMark('toggleBold')}
          className={`rounded-xl p-2 transition hover:bg-white ${
            editor?.isActive('bold') ? 'bg-white text-neutral-950' : 'text-neutral-600'
          }`}
        >
          <Bold size={16} />
        </button>

        <button
          type="button"
          onClick={() => applyMark('toggleItalic')}
          className={`rounded-xl p-2 transition hover:bg-white ${
            editor?.isActive('italic') ? 'bg-white text-neutral-950' : 'text-neutral-600'
          }`}
        >
          <Italic size={16} />
        </button>

        <button
          type="button"
          onClick={() => applyMark('toggleBulletList')}
          className={`rounded-xl p-2 transition hover:bg-white ${
            editor?.isActive('bulletList') ? 'bg-white text-neutral-950' : 'text-neutral-600'
          }`}
        >
          <List size={16} />
        </button>

        <button
          type="button"
          onClick={() => applyMark('toggleOrderedList')}
          className={`rounded-xl p-2 transition hover:bg-white ${
            editor?.isActive('orderedList') ? 'bg-white text-neutral-950' : 'text-neutral-600'
          }`}
        >
          <ListOrdered size={16} />
        </button>

        <button
          type="button"
          onClick={handleImagePick}
          className="rounded-xl p-2 text-neutral-600 transition hover:bg-white hover:text-neutral-950"
        >
          <ImageIcon size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().undo().run()}
          className="rounded-xl p-2 text-neutral-600 transition hover:bg-white hover:text-neutral-950"
        >
          <Undo2 size={16} />
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().redo().run()}
          className="rounded-xl p-2 text-neutral-600 transition hover:bg-white hover:text-neutral-950"
        >
          <Redo2 size={16} />
        </button>

        <button
          type="button"
          onClick={clearFormat}
          className="rounded-xl p-2 text-neutral-600 transition hover:bg-white hover:text-neutral-950"
        >
          <Trash2 size={16} />
        </button>

        {uploading && (
          <span className="ml-2 text-xs font-medium text-neutral-500">Uploading image...</span>
        )}
      </div>

      <EditorContent editor={editor} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) uploadAndInsert(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}