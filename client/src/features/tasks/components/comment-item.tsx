import type { CommentDto } from "@/api/gen/model";
import { updateCommentBody } from "@/api/gen/endpoints/comment-controller/comment-controller.zod";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { InlineSaveActions } from "@/components/inline-save-actions";
import { MarkdownEditor } from "@/components/rich-text/markdown-editor";
import { MarkdownView } from "@/components/rich-text/markdown-view";
import { isPrimaryModifierPressed } from "@/lib/keyboard-shortcuts";
import { formatDistanceToNow } from "date-fns";
import { User } from "lucide-react";
import { useEffect, useState } from "react";

interface CommentItemProps {
  comment: CommentDto;
  currentUserId?: string;
  onUpdate: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export function CommentItem({
  comment,
  currentUserId,
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editPlainText, setEditPlainText] = useState(comment.content);
  const [commentError, setCommentError] = useState<string | null>(null);

  const isAuthor = currentUserId === comment.author.id;
  const isCommentEmpty = editPlainText.trim().length === 0;

  const validateComment = (markdown: string): string | null => {
    const result = updateCommentBody.safeParse({ content: markdown });
    if (result.success) {
      return null;
    }

    return result.error.issues[0]?.message ?? "Comment cannot be blank";
  };

  const handleSave = () => {
    if (isUpdating) return;

    const markdown = editContent.trim();
    const validationError = validateComment(markdown);
    if (validationError || isCommentEmpty) {
      setCommentError(validationError ?? "Comment cannot be blank");
      return;
    }

    setCommentError(null);
    onUpdate(comment.id, markdown);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setEditPlainText(comment.content);
    setCommentError(null);
    setIsEditing(false);
  };

  useEffect(() => {
    if (isEditing) {
      return;
    }

    setEditContent(comment.content);
    setEditPlainText(comment.content);
    setCommentError(null);
  }, [comment.content, isEditing]);

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest('[contenteditable="true"]')) {
      return;
    }

    if (e.key === "Enter" && isPrimaryModifierPressed(e)) {
      e.preventDefault();
      handleSave();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.dateCreated), {
    addSuffix: true,
  });

  const wasEdited =
    comment.dateModified && comment.dateModified !== comment.dateCreated;

  return (
    <div className="flex gap-3 py-2">
      <div className="bg-primary/10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
        {comment.author.profileImageUrl ? (
          <img
            src={comment.author.profileImageUrl}
            alt={comment.author.username}
            className="h-8 w-8 rounded-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User className="text-primary h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium">
            {comment.author.username}
          </span>
          <span className="text-muted-foreground/70 text-xs">{timeAgo}</span>
          {wasEdited && (
            <span className="text-muted-foreground/50 text-xs">(edited)</span>
          )}
        </div>

        {isEditing ? (
          <div
            className="mt-2 space-y-2"
            onKeyDownCapture={handleEditorKeyDown}
          >
            <MarkdownEditor
              value={editContent}
              onChange={(markdown) => {
                setEditContent(markdown);
                if (commentError) {
                  setCommentError(null);
                }
              }}
              onContentMetaChange={({ plainText }) => {
                setEditPlainText(plainText);
              }}
              toolbarVariant="compact"
              minHeightClassName="min-h-[96px]"
              autoFocus={true}
            />
            <p className="text-destructive text-xs">
              {commentError ?? "\u00A0"}
            </p>
            <InlineSaveActions
              onCancel={handleCancel}
              onSave={handleSave}
              isSaving={isUpdating}
              cancelDisabled={isUpdating}
              saveDisabled={isCommentEmpty || isUpdating}
            />
          </div>
        ) : (
          <>
            <div
              className="bg-muted/50 mt-1 rounded-lg px-3 py-2"
              onClick={(event) => {
                if (!isAuthor) {
                  return;
                }

                const target = event.target as HTMLElement;
                if (target.closest("a")) {
                  return;
                }

                setIsEditing(true);
              }}
              style={{ cursor: isAuthor ? "pointer" : "default" }}
            >
              <div className="text-sm">
                <MarkdownView value={comment.content} />
              </div>
            </div>

            {isAuthor && (
              <div className="text-muted-foreground mt-1 flex items-center gap-3 text-xs">
                <button
                  className="hover:text-foreground transition-colors hover:underline"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="text-destructive hover:text-destructive/80 transition-colors hover:underline">
                      Delete
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <Button
                        variant="destructive"
                        onClick={() => onDelete(comment.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
