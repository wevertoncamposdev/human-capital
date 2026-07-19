"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import Document from "@tiptap/extension-document";
import { cn } from "@/lib/utils";

export function RichTextReadonly({
  value,
  className,
  bodyClassName,
}: {
  value: string;
  className?: string;
  bodyClassName?: string;
}) {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
      }),
      Heading.configure({
        levels: [1, 2, 3, 4, 5, 6],
      }),
      BulletList,
      OrderedList,
      ListItem,
    ],
    content: value ?? "",
    editable: false,
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className={cn("richtext-root", className)}>
      <div className={cn("richtext-body", bodyClassName)}>
        <EditorContent editor={editor} className="tiptap" />
      </div>
    </div>
  );
}

