import { InlineSaveActions } from "@/components/inline-save-actions";
import { MarkdownEditor } from "@/components/rich-text/markdown-editor";
import { createCommentBody } from "@/api/gen/endpoints/comment-controller/comment-controller.zod";
import { isPrimaryModifierPressed } from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  isPending?: boolean;
  placeholder?: string;
}

export function CommentInput({
  onSubmit,
  isPending = false,
  placeholder = "Write a comment...",
}: CommentInputProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [plainText, setPlainText] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);

  const isCommentEmpty = plainText.trim().length === 0;

  const validateComment = (markdown: string): string | null => {
    const result = createCommentBody.safeParse({ content: markdown });
    if (result.success) {
      return null;
    }

    return result.error.issues[0]?.message ?? "Comment cannot be blank";
  };

  const handleSubmit = () => {
    if (isPending) return;

    const markdown = content.trim();
    const validationError = validateComment(markdown);
    if (validationError || isCommentEmpty) {
      setCommentError(validationError ?? "Comment cannot be blank");
      return;
    }

    setCommentError(null);
    onSubmit(markdown);
    setContent("");
    setPlainText("");
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setContent("");
    setPlainText("");
    setCommentError(null);
    setIsExpanded(false);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[contenteditable="true"]')) {
      return;
    }

    if (e.key === "Enter" && isPrimaryModifierPressed(e)) {
      e.preventDefault();
      handleSubmit();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  if (!isExpanded) {
    return (
      <div
        className={cn(
          "bg-muted/50 cursor-text rounded-lg border border-transparent px-3 py-2 text-sm",
          "text-muted-foreground hover:bg-muted hover:border-border transition-colors",
        )}
        onClick={() => setIsExpanded(true)}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <div className="space-y-2" onKeyDownCapture={handleEditorKeyDown}>
      <MarkdownEditor
        value={content}
        onChange={(markdown) => {
          setContent(markdown);
          if (commentError) {
            setCommentError(null);
          }
        }}
        onContentMetaChange={({ plainText: nextPlainText }) => {
          setPlainText(nextPlainText);
        }}
        placeholder={placeholder}
        toolbarVariant="compact"
        minHeightClassName="min-h-[96px]"
        autoFocus={true}
      />
      <p className="text-destructive text-xs">{commentError ?? "\u00A0"}</p>
      <InlineSaveActions
        onCancel={handleCancel}
        onSave={handleSubmit}
        isSaving={isPending}
        cancelDisabled={isPending}
        saveDisabled={isCommentEmpty || isPending}
      />
    </div>
  );
}
