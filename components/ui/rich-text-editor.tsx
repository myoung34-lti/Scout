'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Bold, Italic, List, Link as LinkIcon } from 'lucide-react'
import { useEffect } from 'react'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          'prose prose-sm max-w-none focus:outline-none min-h-32 px-3 py-2 [&_p]:my-1 [&_ul]:my-1 [&_a]:text-primary [&_a]:underline',
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  })

  // The template dropdown replaces `value` wholesale after the editor's
  // already mounted — Tiptap only reads `content` on init, so external
  // changes need to be pushed in explicitly.
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  function setLink() {
    const previousUrl = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('URL', previousUrl ?? 'https://')
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className={cn('rounded-md border border-input bg-transparent', className)}>
      <div className="flex items-center gap-1 border-b p-1">
        <Toggle
          size="sm"
          pressed={editor.isActive('bold')}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          aria-label="Bold"
        >
          <Bold />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('italic')}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          aria-label="Italic"
        >
          <Italic />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('bulletList')}
          onPressedChange={() => editor.chain().focus().toggleBulletList().run()}
          aria-label="Bullet list"
        >
          <List />
        </Toggle>
        <Toggle
          size="sm"
          pressed={editor.isActive('link')}
          onPressedChange={setLink}
          aria-label="Link"
        >
          <LinkIcon />
        </Toggle>
      </div>
      <EditorContent editor={editor} className="[&_.tiptap]:min-h-32" />
    </div>
  )
}
