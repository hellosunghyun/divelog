"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { Link as TiptapLink } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { StarterKit } from "@tiptap/starter-kit";
import { Underline } from "@tiptap/extension-underline";
import { useEffect, useMemo } from "react";
import { createUserMentionExtension } from "../extensions/MentionExtension";
import { createRecordRefExtension } from "../extensions/RecordRefExtension";
import { cn } from "~/lib/utils/utils";

interface ResponseEditorProps {
  content?: object | null;
  onChange: (json: object, text: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

function ResponseEditor({
  content,
  onChange,
  placeholder,
  className,
  editable = true,
}: ResponseEditorProps) {
  const userMentionExtension = useMemo(() => createUserMentionExtension(), []);
  const recordRefExtension = useMemo(() => createRecordRefExtension(), []);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false }),
      Placeholder.configure({
        placeholder: placeholder ?? "공명, 질문, 연결, 제안... 자유롭게 남겨보세요",
      }),
      Underline,
      TiptapLink.configure({ openOnClick: false, autolink: true }),
      userMentionExtension,
      recordRefExtension,
    ],
    content: content ?? undefined,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON(), editor.getText());
    },
    editable,
  });

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <div className={cn("response-editor", className)}>
      <EditorContent editor={editor} />
    </div>
  );
}

export default ResponseEditor;
