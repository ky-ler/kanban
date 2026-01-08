import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isExpanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = () => {
    if (!content.trim() || isPending) return;
    onSubmit(content.trim());
    setContent("");
    setIsExpanded(false);
  };

  const handleCancel = () => {
    setContent("");
    setIsExpanded(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (!isExpanded) {
    return (
      <div
        className={cn(
          "bg-muted/50 cursor-text rounded-lg border border-transparent px-3 py-2 text-sm",
          "text-muted-foreground transition-colors hover:bg-muted hover:border-border",
        )}
        onClick={() => setIsExpanded(true)}
      >
        {placeholder}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={3}
        className="resize-none"
        disabled={isPending}
      />
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isPending}
        >
          <Check className="mr-1 h-3 w-3" />
          {isPending ? "Saving..." : "Save"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isPending}
        >
          <X className="mr-1 h-3 w-3" />
          Cancel
        </Button>
        <span className="text-muted-foreground ml-auto text-xs">
          Ctrl+Enter to save
        </span>
      </div>
    </div>
  );
}
