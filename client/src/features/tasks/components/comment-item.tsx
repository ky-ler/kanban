import { useState, useRef, useEffect } from "react";
import type { CommentDto } from "@/api/gen/model";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { formatDistanceToNow } from "date-fns";
import { Check, X, User } from "lucide-react";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAuthor = currentUserId === comment.author.id;

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length,
      );
    }
  }, [isEditing]);

  const handleSave = () => {
    if (!editContent.trim() || isUpdating) return;
    onUpdate(comment.id, editContent.trim());
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  const timeAgo = formatDistanceToNow(new Date(comment.dateCreated), {
    addSuffix: true,
  });

  const wasEdited =
    comment.dateModified &&
    comment.dateModified !== comment.dateCreated;

  return (
    <div className="flex gap-3 py-2">
      {/* Avatar */}
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

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="flex items-center gap-2 text-sm">
          <span className="truncate font-medium">{comment.author.username}</span>
          <span className="text-muted-foreground/70 text-xs">{timeAgo}</span>
          {wasEdited && (
            <span className="text-muted-foreground/50 text-xs">(edited)</span>
          )}
        </div>

        {/* Comment body */}
        {isEditing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="resize-none"
              disabled={isUpdating}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!editContent.trim() || isUpdating}
              >
                <Check className="mr-1 h-3 w-3" />
                {isUpdating ? "Saving..." : "Save"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isUpdating}
              >
                <X className="mr-1 h-3 w-3" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div
              className="bg-muted/50 mt-1 rounded-lg px-3 py-2"
              onClick={() => isAuthor && setIsEditing(true)}
              style={{ cursor: isAuthor ? "pointer" : "default" }}
            >
              <p className="whitespace-pre-wrap text-sm">{comment.content}</p>
            </div>

            {/* Actions */}
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
