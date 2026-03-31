import {
  MarkdownEditor,
  type MarkdownEditorProps,
} from "@/components/rich-text/markdown-editor";

type TaskDescriptionEditorProps = Pick<
  MarkdownEditorProps,
  | "value"
  | "onChange"
  | "onContentMetaChange"
  | "placeholder"
  | "mentionUsers"
  | "container"
>;

export function TaskDescriptionEditor({
  value,
  onChange,
  onContentMetaChange,
  placeholder = "Add a more detailed description...",
  mentionUsers = [],
  container,
}: Readonly<TaskDescriptionEditorProps>) {
  return (
    <MarkdownEditor
      value={value}
      onChange={onChange}
      onContentMetaChange={onContentMetaChange}
      placeholder={placeholder}
      toolbarVariant="full"
      autoFocus={true}
      mentionUsers={mentionUsers}
      container={container}
    />
  );
}
