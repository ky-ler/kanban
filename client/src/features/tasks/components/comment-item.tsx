import type { CommentDto } from "@/api/gen/model";
import { UpdateCommentBody } from "@/api/gen/endpoints/comment-controller/comment-controller.zod";
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
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";
import { MarkdownView } from "@/components/rich-text/markdown-view";
import { isPrimaryModifierPressed } from "@/lib/keyboard-shortcuts";
import { DateTooltip } from "@/components/date-tooltip";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { IconUser } from "@tabler/icons-react";
import { useEffect, useState } from "react";

interface CommentItemProps {
  comment: CommentDto;
  currentUserId?: string;
  mentionUsers?: MentionUser[];
  onUpdate: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  container?: HTMLElement | null;
}

export function CommentItem({
  comment,
  currentUserId,
  mentionUsers = [],
  onUpdate,
  onDelete,
  isUpdating = false,
  isDeleting = false,
  container,
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editPlainText, setEditPlainText] = useState(comment.content);
  const [commentError, setCommentError] = useState<string | null>(null);

  const isAuthor = currentUserId === comment.author.id;
  const isCommentEmpty = editPlainText.trim().length === 0;

  const validateComment = (markdown: string): string | null => {
    const result = UpdateCommentBody.safeParse({ content: markdown });
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
      e.stopPropagation();
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
      <Avatar>
        <AvatarImage
          src={comment.author.profileImageUrl ?? undefined}
          alt={comment.author.username}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <AvatarFallback>
          <IconUser />
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">
            {comment.author.username}
          </span>
          <DateTooltip date={new Date(comment.dateCreated)} showTime>
            <span className="text-muted-foreground/70 cursor-default">
              {timeAgo}
            </span>
          </DateTooltip>
          {wasEdited && (
            <span className="text-muted-foreground/50">(edited)</span>
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
              mentionUsers={mentionUsers}
              container={container}
            />
            <p className="text-destructive">{commentError ?? "\u00A0"}</p>
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
              className="mt-1 rounded-lg"
              onClick={(event) => {
                if (!isAuthor) {
                  return;
                }

                const target = event.target as HTMLElement;
                if (target.closest('a, [data-mention-trigger="true"]')) {
                  return;
                }

                setIsEditing(true);
              }}
              style={{ cursor: isAuthor ? "pointer" : "default" }}
            >
              <div className="">
                <MarkdownView
                  value={comment.content}
                  mentionUsers={mentionUsers}
                  container={container}
                />
              </div>
            </div>

            {isAuthor && (
              <div className="text-muted-foreground mt-1 flex items-center gap-3">
                <Button
                  variant="link"
                  size="sm"
                  className="text-muted-foreground h-auto p-0"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="link"
                      size="sm"
                      className="text-destructive h-auto p-0"
                    >
                      Delete
                    </Button>
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
