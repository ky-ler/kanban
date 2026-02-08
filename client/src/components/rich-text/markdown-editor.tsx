import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  editorHeadingClasses,
  headingTypographyClasses,
  type HeadingTag,
} from "@/components/rich-text/heading-styles";
import {
  formatShortcutLabel,
  isPrimaryModifierPressed,
} from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { $isLinkNode, $toggleLink, LinkNode } from "@lexical/link";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_STAR,
  HEADING,
  INLINE_CODE,
  ITALIC_STAR,
  LINK,
  ORDERED_LIST,
  QUOTE,
  STRIKETHROUGH,
  UNORDERED_LIST,
  type Transformer,
} from "@lexical/markdown";
import {
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { MarkdownShortcutPlugin } from "@lexical/react/LexicalMarkdownShortcutPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  $isQuoteNode,
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createRangeSelection,
  $createParagraphNode,
  $getNodeByKey,
  $getNearestNodeFromDOMNode,
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $isTextNode,
  $setSelection,
  CLICK_COMMAND,
  COMMAND_PRIORITY_HIGH,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  $createTextNode,
  type RangeSelection,
  createCommand,
  type LexicalEditor,
} from "lexical";
import {
  Bold,
  ChevronDown,
  CircleHelp,
  Code,
  Italic,
  Link2,
  ExternalLink,
  List,
  MoreHorizontal,
  Pencil,
  Strikethrough,
  Trash2,
  TextQuote,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const OPEN_LINK_EDITOR_COMMAND = createCommand<void>();

const MARKDOWN_TRANSFORMERS: Transformer[] = [
  BOLD_STAR,
  ITALIC_STAR,
  STRIKETHROUGH,
  INLINE_CODE,
  LINK,
  UNORDERED_LIST,
  HEADING,
  ORDERED_LIST,
  QUOTE,
];

type TextStyle = "paragraph" | HeadingTag;
type ListStyle = "none" | "bullet" | "number";

type ActiveFormats = {
  bold: boolean;
  italic: boolean;
  strikethrough: boolean;
  code: boolean;
  quote: boolean;
  link: boolean;
  list: ListStyle;
};

const HEADING_ITEMS: Array<{
  label: string;
  tag: HeadingTag;
  shortcut: string;
}> = [
  { label: "Heading 1", tag: "h1", shortcut: "Mod+Alt+1" },
  { label: "Heading 2", tag: "h2", shortcut: "Mod+Alt+2" },
  { label: "Heading 3", tag: "h3", shortcut: "Mod+Alt+3" },
  { label: "Heading 4", tag: "h4", shortcut: "Mod+Alt+4" },
  { label: "Heading 5", tag: "h5", shortcut: "Mod+Alt+5" },
  { label: "Heading 6", tag: "h6", shortcut: "Mod+Alt+6" },
];

const SHORTCUT_HELP: Array<{ action: string; shortcut: string }> = [
  { action: "Bold", shortcut: "Mod+B" },
  { action: "Italic", shortcut: "Mod+I" },
  { action: "Strikethrough", shortcut: "Mod+Shift+S" },
  { action: "Inline code", shortcut: "Mod+Shift+M" },
  { action: "Link", shortcut: "Mod+K" },
  { action: "Numbered list", shortcut: "Mod+Shift+7" },
  { action: "Bullet list", shortcut: "Mod+Shift+8" },
  { action: "Quote", shortcut: "Mod+Shift+." },
  { action: "Normal text", shortcut: "Mod+Alt+0" },
  ...HEADING_ITEMS.map(({ label, shortcut }) => ({ action: label, shortcut })),
];

const MARKDOWN_HELP: Array<{ label: string; syntax: string }> = [
  { label: "Bold", syntax: "**text**" },
  { label: "Italic", syntax: "*text*" },
  { label: "Strikethrough", syntax: "~~text~~" },
  { label: "Link", syntax: "[label](https://example.com)" },
  { label: "Bullet list", syntax: "- item" },
  { label: "Numbered list", syntax: "1. item" },
  { label: "Quote", syntax: "> quoted text" },
  { label: "Heading", syntax: "# H1 / ## H2 / ### H3" },
];

const DEFAULT_ACTIVE_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  strikethrough: false,
  code: false,
  quote: false,
  link: false,
  list: "none",
};

type SelectionSnapshot = {
  anchorKey: string;
  anchorOffset: number;
  anchorType: "text" | "element";
  focusKey: string;
  focusOffset: number;
  focusType: "text" | "element";
};

type LinkEditContext = {
  linkNodeKey?: string;
  selectionSnapshot?: SelectionSnapshot;
  url: string;
  text: string;
};

type PopoverPosition = {
  x: number;
  y: number;
};

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onContentMetaChange?: (meta: { plainText: string; markdown: string }) => void;
  placeholder?: string;
  toolbarVariant?: "full" | "compact";
  autoFocus?: boolean;
  minHeightClassName?: string;
}

function setParagraph(editor: LexicalEditor): void {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createParagraphNode());
    }
  });
}

function setHeading(editor: LexicalEditor, heading: HeadingTag): void {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createHeadingNode(heading));
    }
  });
}

function setQuote(editor: LexicalEditor): void {
  editor.update(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      $setBlocksType(selection, () => $createQuoteNode());
    }
  });
}

function getSelectedLinkNode(selection: RangeSelection): LinkNode | null {
  for (const node of selection.getNodes()) {
    let current: typeof node | null = node;

    while (current) {
      if ($isLinkNode(current)) {
        return current;
      }
      current = current.getParent();
    }
  }

  return null;
}

function getLinkNodeFromNode(
  node: ReturnType<typeof $getNodeByKey> | null,
): LinkNode | null {
  let current = node;

  while (current) {
    if ($isLinkNode(current)) {
      return current;
    }
    current = current.getParent();
  }

  return null;
}

function normalizeLinkUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "";
  }

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("?")
  ) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function getSelectionPopoverPosition(): PopoverPosition | null {
  if (typeof window === "undefined") {
    return null;
  }

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  if (selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  if (rect.width > 0 || rect.height > 0) {
    return {
      x: rect.left + rect.width / 2,
      y: rect.bottom + 6,
    };
  }

  const rects = range.getClientRects();
  if (!rects.length) {
    return null;
  }

  const anchorRect = rects[rects.length - 1];
  return {
    x: anchorRect.left + anchorRect.width / 2,
    y: anchorRect.bottom + 6,
  };
}

function getEditorRootPopoverPosition(
  editor: LexicalEditor,
): PopoverPosition | null {
  const rootElement = editor.getRootElement();
  if (!rootElement) {
    return null;
  }

  const rect = rootElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  return {
    x: rect.left + rect.width / 2,
    y: rect.top + 14,
  };
}

function scheduleOpen(next: () => void): void {
  if (typeof window === "undefined") {
    next();
    return;
  }

  window.requestAnimationFrame(next);
}

function ToolbarButton({
  onClick,
  onMouseDown,
  children,
  label,
  shortcut,
  className,
  active = false,
}: {
  onClick: () => void;
  onMouseDown?: (event: MouseEvent<HTMLButtonElement>) => void;
  children: ReactNode;
  label: string;
  shortcut?: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8",
            active && "bg-accent text-accent-foreground hover:bg-accent",
            className,
          )}
          onClick={onClick}
          onMouseDown={onMouseDown}
          aria-label={shortcut ? `${label} (${shortcut})` : label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2 text-xs">
        <span>{label}</span>
        {shortcut ? (
          <span className="font-mono tracking-normal opacity-90">
            {shortcut}
          </span>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

function EditorHelpDialog() {
  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Editor help"
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">Editor help</TooltipContent>
      </Tooltip>

      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editor help</DialogTitle>
          <DialogDescription>
            Keyboard shortcuts and markdown syntax supported in task
            descriptions.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-semibold">Keyboard shortcuts</h4>
            <div className="space-y-2">
              {SHORTCUT_HELP.map((item) => (
                <div
                  key={item.action}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{item.action}</span>
                  <kbd className="bg-muted border-border rounded border px-2 py-0.5 font-mono text-xs">
                    {formatShortcutLabel(item.shortcut)}
                  </kbd>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">Markdown</h4>
            <div className="space-y-2">
              {MARKDOWN_HELP.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span>{item.label}</span>
                  <code className="bg-muted border-border rounded border px-2 py-0.5 font-mono text-xs">
                    {item.syntax}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditorShortcutsPlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const getDigitFromEvent = (event: KeyboardEvent): string | null => {
      if (event.code.startsWith("Digit")) {
        return event.code.replace("Digit", "");
      }

      if (/^[0-9]$/.test(event.key)) {
        return event.key;
      }

      return null;
    };

    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        if (!isPrimaryModifierPressed(event)) {
          return false;
        }

        const key = event.key.toLowerCase();
        const digit = getDigitFromEvent(event);

        if (event.altKey && !event.shiftKey && digit) {
          const headingByDigit: Partial<Record<string, HeadingTag>> = {
            "1": "h1",
            "2": "h2",
            "3": "h3",
            "4": "h4",
            "5": "h5",
            "6": "h6",
          };

          if (digit === "0") {
            event.preventDefault();
            setParagraph(editor);
            return true;
          }

          const heading = headingByDigit[digit];
          if (heading) {
            event.preventDefault();
            setHeading(editor, heading);
            return true;
          }
        }

        if (event.shiftKey && !event.altKey) {
          if (digit === "7" || event.code === "Digit7") {
            event.preventDefault();
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
            return true;
          }

          if (digit === "8" || event.code === "Digit8") {
            event.preventDefault();
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
            return true;
          }

          if (event.code === "Period" || key === ">" || key === ".") {
            event.preventDefault();
            setQuote(editor);
            return true;
          }

          if (key === "m") {
            event.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
            return true;
          }

          if (key === "s") {
            event.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
            return true;
          }
        }

        if (!event.altKey && !event.shiftKey && key === "k") {
          event.preventDefault();
          editor.dispatchCommand(OPEN_LINK_EDITOR_COMMAND, undefined);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  return null;
}

function ToolbarPlugin({
  toolbarVariant,
}: Readonly<{ toolbarVariant: "full" | "compact" }>) {
  const [editor] = useLexicalComposerContext();
  const [activeTextStyle, setActiveTextStyle] =
    useState<TextStyle>("paragraph");
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(
    DEFAULT_ACTIVE_FORMATS,
  );
  const [linkContext, setLinkContext] = useState<LinkEditContext | null>(null);
  const [isLinkActionsOpen, setIsLinkActionsOpen] = useState(false);
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("https://");
  const [linkDisplayText, setLinkDisplayText] = useState("");
  const [linkActionsPosition, setLinkActionsPosition] =
    useState<PopoverPosition | null>(null);

  const [linkFormPosition, setLinkFormPosition] =
    useState<PopoverPosition | null>(null);

  const closeLinkUi = useCallback(() => {
    setIsLinkActionsOpen(false);
    setIsLinkPopoverOpen(false);
  }, []);

  const applyTextStyle = (style: TextStyle): void => {
    if (style === "paragraph") {
      setParagraph(editor);
      setActiveTextStyle("paragraph");
      return;
    }

    setHeading(editor, style);
    setActiveTextStyle(style);
  };

  const getLinkContextFromSelection =
    useCallback((): LinkEditContext | null => {
      let context: LinkEditContext | null = null;

      editor.read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const linkNode = getSelectedLinkNode(selection);
        context = {
          linkNodeKey: linkNode?.getKey(),
          selectionSnapshot: {
            anchorKey: selection.anchor.key,
            anchorOffset: selection.anchor.offset,
            anchorType: selection.anchor.type,
            focusKey: selection.focus.key,
            focusOffset: selection.focus.offset,
            focusType: selection.focus.type,
          },
          url: linkNode?.getURL() ?? "https://",
          text: selection.getTextContent() || linkNode?.getTextContent() || "",
        };
      });

      return context;
    }, [editor]);

  const restoreSelection = (
    snapshot?: SelectionSnapshot,
  ): RangeSelection | null => {
    if (!snapshot) {
      const currentSelection = $getSelection();
      return $isRangeSelection(currentSelection) ? currentSelection : null;
    }

    const anchorNode = $getNodeByKey(snapshot.anchorKey);
    const focusNode = $getNodeByKey(snapshot.focusKey);
    if (!anchorNode || !focusNode) {
      return null;
    }

    const selection = $createRangeSelection();
    selection.anchor.set(
      snapshot.anchorKey,
      snapshot.anchorOffset,
      snapshot.anchorType,
    );
    selection.focus.set(
      snapshot.focusKey,
      snapshot.focusOffset,
      snapshot.focusType,
    );
    $setSelection(selection);
    return selection;
  };

  const openLinkEditor = useCallback(
    (options?: { position?: PopoverPosition; context?: LinkEditContext }) => {
      const context = options?.context ?? getLinkContextFromSelection();
      if (context) {
        setLinkContext(context);
      }

      const baseUrl = context?.url ?? "https://";
      const baseText = context?.text ?? "";

      setLinkValue(baseUrl);
      setLinkDisplayText(baseText);

      setLinkFormPosition(
        options?.position ??
          getSelectionPopoverPosition() ??
          getEditorRootPopoverPosition(editor) ?? {
            x: typeof window !== "undefined" ? window.innerWidth / 2 : 320,
            y:
              typeof window !== "undefined"
                ? Math.max(120, window.innerHeight / 3)
                : 180,
          },
      );

      setIsLinkActionsOpen(false);
      setIsLinkPopoverOpen(false);
      scheduleOpen(() => setIsLinkPopoverOpen(true));
    },
    [editor, getLinkContextFromSelection],
  );

  const openLinkActions = (params: {
    position: PopoverPosition;
    context: LinkEditContext;
  }) => {
    setLinkContext(params.context);
    setLinkActionsPosition(params.position);
    setIsLinkActionsOpen(false);
    setIsLinkPopoverOpen(false);
    scheduleOpen(() => setIsLinkActionsOpen(true));
  };

  const applyLinkValue = () => {
    const normalized = normalizeLinkUrl(linkValue);
    const normalizedText = linkDisplayText.trim();

    editor.update(() => {
      const existingNode = linkContext?.linkNodeKey
        ? $getNodeByKey(linkContext.linkNodeKey)
        : null;

      const existingLinkNode = getLinkNodeFromNode(existingNode);

      if (existingLinkNode) {
        if (!normalized) {
          existingLinkNode.selectStart();
          const children = existingLinkNode.getChildren();
          children.forEach((child) => {
            existingLinkNode.insertBefore(child);
          });
          existingLinkNode.remove();
          return;
        }

        const existingText = existingLinkNode.getTextContent();
        const finalText =
          normalizedText || existingText || linkContext?.text || normalized;

        existingLinkNode.setURL(normalized);

        if (finalText && finalText !== existingText) {
          const children = existingLinkNode.getChildren();
          const firstChild = children[0] ?? null;

          if (!firstChild) {
            const replacementTextNode = $createTextNode(finalText);
            existingLinkNode.append(replacementTextNode);
            replacementTextNode.select(0, finalText.length);
            return;
          }

          if ($isTextNode(firstChild)) {
            firstChild.setTextContent(finalText);
            firstChild.select(0, finalText.length);

            for (const extraChild of children.slice(1)) {
              extraChild.remove();
            }

            return;
          }

          const replacementTextNode = $createTextNode(finalText);
          firstChild.replace(replacementTextNode);
          replacementTextNode.select(0, finalText.length);

          for (const extraChild of children.slice(1)) {
            extraChild.remove();
          }
        }

        return;
      }

      const selection = restoreSelection(linkContext?.selectionSnapshot);
      if (!selection) {
        return;
      }

      const replacementText =
        normalizedText ||
        selection.getTextContent().trim() ||
        linkContext?.text.trim() ||
        normalized;

      if (!replacementText) {
        return;
      }

      const textNode = $createTextNode(replacementText);
      selection.insertNodes([textNode]);
      textNode.select(0, replacementText.length);
      $toggleLink(normalized.length > 0 ? normalized : null);
    });

    closeLinkUi();
  };

  const removeLink = () => {
    editor.update(() => {
      const existingNode = linkContext?.linkNodeKey
        ? $getNodeByKey(linkContext.linkNodeKey)
        : null;

      const existingLinkNode = getLinkNodeFromNode(existingNode);

      if (existingLinkNode) {
        existingLinkNode.selectStart();
        const children = existingLinkNode.getChildren();
        children.forEach((child) => {
          existingLinkNode.insertBefore(child);
        });
        existingLinkNode.remove();
        return;
      }

      const selection = restoreSelection(linkContext?.selectionSnapshot);
      if (!selection) {
        return;
      }

      $toggleLink(null);
    });

    closeLinkUi();
  };

  const openLinkInNewTab = () => {
    const normalized = normalizeLinkUrl(linkContext?.url ?? "");
    if (!normalized) {
      return;
    }

    window.open(normalized, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    return editor.registerCommand(
      OPEN_LINK_EDITOR_COMMAND,
      () => {
        openLinkEditor();
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor, openLinkEditor]);

  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      (event) => {
        const target = event.target as HTMLElement | null;
        const linkElement = target?.closest("a");
        if (!linkElement) {
          return false;
        }

        event.preventDefault();
        event.stopPropagation();

        let context: LinkEditContext | null = null;
        editor.read(() => {
          const lexicalNode = $getNearestNodeFromDOMNode(linkElement);
          const linkNode = getLinkNodeFromNode(lexicalNode);
          if (!linkNode) {
            return;
          }

          const selection = $getSelection();
          const selectionSnapshot = $isRangeSelection(selection)
            ? {
                anchorKey: selection.anchor.key,
                anchorOffset: selection.anchor.offset,
                anchorType: selection.anchor.type,
                focusKey: selection.focus.key,
                focusOffset: selection.focus.offset,
                focusType: selection.focus.type,
              }
            : undefined;

          context = {
            linkNodeKey: linkNode.getKey(),
            selectionSnapshot,
            url: linkElement.getAttribute("href") ?? linkNode.getURL(),
            text: linkNode.getTextContent(),
          };
        });

        if (!context) {
          return false;
        }

        const linkRect = linkElement.getBoundingClientRect();
        const position = {
          x: linkRect.left + linkRect.width / 2,
          y: linkRect.bottom + 6,
        };

        openLinkActions({
          position,
          context,
        });
        return true;
      },
      COMMAND_PRIORITY_HIGH,
    );
  }, [editor]);

  useEffect(() => {
    const updateToolbarState = (): void => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();

        if (!$isRangeSelection(selection)) {
          setActiveTextStyle("paragraph");
          setActiveFormats(DEFAULT_ACTIVE_FORMATS);
          return;
        }

        const anchorNode = selection.anchor.getNode();
        const topLevelElement = anchorNode.getTopLevelElement();

        let nextTextStyle: TextStyle = "paragraph";
        let nextListStyle: ListStyle = "none";
        let quote = false;

        if (topLevelElement) {
          if ($isHeadingNode(topLevelElement)) {
            nextTextStyle = topLevelElement.getTag();
          }

          if ($isListNode(topLevelElement)) {
            const listType = topLevelElement.getListType();
            if (listType === "number") {
              nextListStyle = "number";
            } else if (listType === "bullet") {
              nextListStyle = "bullet";
            }
          }

          if ($isQuoteNode(topLevelElement)) {
            quote = true;
          }
        }

        let link = false;
        for (const node of selection.getNodes()) {
          let current: null | typeof node = node;
          while (current) {
            if ($isLinkNode(current)) {
              link = true;
              break;
            }
            current = current.getParent();
          }
          if (link) {
            break;
          }
        }

        const nextFormats: ActiveFormats = {
          bold: selection.hasFormat("bold"),
          italic: selection.hasFormat("italic"),
          strikethrough: selection.hasFormat("strikethrough"),
          code: selection.hasFormat("code"),
          quote,
          link,
          list: nextListStyle,
        };

        setActiveTextStyle((prev) =>
          prev === nextTextStyle ? prev : nextTextStyle,
        );
        setActiveFormats((prev) => {
          const isSame =
            prev.bold === nextFormats.bold &&
            prev.italic === nextFormats.italic &&
            prev.strikethrough === nextFormats.strikethrough &&
            prev.code === nextFormats.code &&
            prev.quote === nextFormats.quote &&
            prev.link === nextFormats.link &&
            prev.list === nextFormats.list;

          return isSame ? prev : nextFormats;
        });
      });
    };

    updateToolbarState();
    return editor.registerUpdateListener(() => {
      updateToolbarState();
    });
  }, [editor]);

  const activeTextStyleLabel =
    activeTextStyle === "paragraph" ? "Text" : activeTextStyle.toUpperCase();

  return (
    <>
      <div className="bg-muted/20 border-border flex flex-wrap items-center gap-1 border-b p-1">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-2"
                  aria-label="Text style"
                >
                  <span className="text-xs">{activeTextStyleLabel}</span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Text style & headings</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="min-w-64 p-1.5">
            <DropdownMenuItem
              onSelect={() => applyTextStyle("paragraph")}
              className={cn(
                "py-2",
                activeTextStyle === "paragraph" &&
                  "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              )}
            >
              <span className="text-sm font-medium">Normal text</span>
              <DropdownMenuShortcut
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-xs leading-none tracking-normal",
                  activeTextStyle === "paragraph"
                    ? "border-accent-foreground/30 text-accent-foreground/90"
                    : "border-border bg-muted/50 text-muted-foreground",
                )}
              >
                {formatShortcutLabel("Mod+Alt+0")}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {HEADING_ITEMS.map((item) => {
              const isActive = activeTextStyle === item.tag;

              return (
                <DropdownMenuItem
                  key={item.tag}
                  onSelect={() => applyTextStyle(item.tag)}
                  className={cn(
                    "py-2",
                    isActive &&
                      "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                  )}
                >
                  <span
                    className={cn(
                      headingTypographyClasses[item.tag],
                      isActive ? "text-accent-foreground" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                  <DropdownMenuShortcut
                    className={cn(
                      "rounded border px-1.5 py-0.5 font-mono text-xs leading-none tracking-normal",
                      isActive
                        ? "border-accent-foreground/30 text-accent-foreground/90"
                        : "border-border bg-muted/50 text-muted-foreground",
                    )}
                  >
                    {formatShortcutLabel(item.shortcut)}
                  </DropdownMenuShortcut>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarButton
          label="Bold"
          shortcut={formatShortcutLabel("Mod+B")}
          active={activeFormats.bold}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          shortcut={formatShortcutLabel("Mod+I")}
          active={activeFormats.italic}
          onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1 px-2",
                    activeFormats.list !== "none" &&
                      "bg-accent text-accent-foreground hover:bg-accent",
                  )}
                  aria-label="List formatting"
                >
                  <List className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">Lists</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="min-w-56 p-1.5">
            <DropdownMenuItem
              onSelect={() =>
                editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
              }
              className={cn(
                activeFormats.list === "bullet" &&
                  "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              )}
            >
              Bullet list
              <DropdownMenuShortcut>
                {formatShortcutLabel("Mod+Shift+8")}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
              }
              className={cn(
                activeFormats.list === "number" &&
                  "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              )}
            >
              Numbered list
              <DropdownMenuShortcut>
                {formatShortcutLabel("Mod+Shift+7")}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <ToolbarButton
          label="Add or remove link"
          shortcut={formatShortcutLabel("Mod+K")}
          active={activeFormats.link}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={openLinkEditor}
        >
          <Link2 className="h-4 w-4" />
        </ToolbarButton>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-8 gap-1 px-2",
                    (activeFormats.strikethrough ||
                      activeFormats.code ||
                      activeFormats.quote) &&
                      "bg-accent text-accent-foreground hover:bg-accent",
                  )}
                  aria-label="More formatting"
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">More formatting</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="min-w-56 p-1.5">
            <DropdownMenuItem
              onSelect={() =>
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
              }
              className={cn(
                activeFormats.strikethrough &&
                  "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              )}
            >
              <Strikethrough className="mr-2 h-4 w-4" />
              Strikethrough
              <DropdownMenuShortcut>
                {formatShortcutLabel("Mod+Shift+S")}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")
              }
              className={cn(
                activeFormats.code &&
                  "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              )}
            >
              <Code className="mr-2 h-4 w-4" />
              Inline code
              <DropdownMenuShortcut>
                {formatShortcutLabel("Mod+Shift+M")}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setQuote(editor)}
              className={cn(
                activeFormats.quote &&
                  "bg-accent text-accent-foreground focus:bg-accent focus:text-accent-foreground",
              )}
            >
              <TextQuote className="mr-2 h-4 w-4" />
              Quote
              <DropdownMenuShortcut>
                {formatShortcutLabel("Mod+Shift+.")}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {toolbarVariant === "full" && (
          <div className="ml-auto flex items-center">
            <EditorHelpDialog />
          </div>
        )}
      </div>

      <Popover
        open={isLinkActionsOpen && Boolean(linkActionsPosition)}
        onOpenChange={(open) => {
          setIsLinkActionsOpen(open);
        }}
      >
        {linkActionsPosition &&
          typeof document !== "undefined" &&
          createPortal(
            <PopoverAnchor asChild>
              <div
                style={{
                  position: "fixed",
                  left: linkActionsPosition.x,
                  top: linkActionsPosition.y,
                  width: 1,
                  height: 1,
                  pointerEvents: "none",
                }}
              />
            </PopoverAnchor>,
            document.body,
          )}
        <PopoverContent className="w-fit p-2" align="center" sideOffset={8}>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 justify-start gap-2"
                  onClick={() => {
                    openLinkEditor({
                      position: linkActionsPosition ?? undefined,
                      context: linkContext ?? undefined,
                    });
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Edit link
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Edit link</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={openLinkInNewTab}
                  aria-label="Open link in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Open in new tab</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removeLink}
                  aria-label="Remove link"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Remove link</TooltipContent>
            </Tooltip>
          </div>
        </PopoverContent>
      </Popover>

      <Popover
        open={isLinkPopoverOpen && Boolean(linkFormPosition)}
        onOpenChange={(open) => {
          setIsLinkPopoverOpen(open);
        }}
      >
        {linkFormPosition &&
          typeof document !== "undefined" &&
          createPortal(
            <PopoverAnchor asChild>
              <div
                style={{
                  position: "fixed",
                  left: linkFormPosition.x,
                  top: linkFormPosition.y,
                  width: 1,
                  height: 1,
                  pointerEvents: "none",
                }}
              />
            </PopoverAnchor>,
            document.body,
          )}
        <PopoverContent
          className="w-80 space-y-3"
          align="center"
          sideOffset={8}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">Link</label>
            <Input
              value={linkValue}
              onChange={(event) => setLinkValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyLinkValue();
                }
              }}
              placeholder="https://example.com"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">
              Display text (optional)
            </label>
            <Input
              value={linkDisplayText}
              onChange={(event) => setLinkDisplayText(event.target.value)}
              placeholder="Text to display"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={closeLinkUi}
            >
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={applyLinkValue}>
              Save
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  onContentMetaChange,
  placeholder = "Add a more detailed description...",
  toolbarVariant = "full",
  autoFocus = true,
  minHeightClassName = "min-h-[160px]",
}: Readonly<MarkdownEditorProps>) {
  const initialConfig = useMemo(
    () => ({
      namespace: "TaskDescriptionEditor",
      theme: {
        paragraph: "mb-2",
        quote:
          "border-l-2 border-border text-muted-foreground my-2 pl-3 italic",
        heading: {
          h1: editorHeadingClasses.h1,
          h2: editorHeadingClasses.h2,
          h3: editorHeadingClasses.h3,
          h4: editorHeadingClasses.h4,
          h5: editorHeadingClasses.h5,
          h6: editorHeadingClasses.h6,
        },
        link: "text-primary underline underline-offset-2",
        text: {
          bold: "font-semibold",
          italic: "italic",
          code: "bg-muted font-mono text-[0.85em] rounded px-1 py-0.5 border border-border",
          strikethrough: "line-through",
        },
        list: {
          ul: "ml-5 list-disc",
          ol: "ml-5 list-decimal",
          listitem: "my-1",
        },
      },
      onError: (error: Error) => {
        throw error;
      },
      nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode],
      editorState: () => {
        if (value.trim()) {
          $convertFromMarkdownString(value, MARKDOWN_TRANSFORMERS);
        }
      },
    }),
    [value],
  );

  return (
    <div className="border-border bg-background overflow-hidden rounded-md border">
      <LexicalComposer initialConfig={initialConfig}>
        <ToolbarPlugin toolbarVariant={toolbarVariant} />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  minHeightClassName,
                  "px-3 py-2 text-sm leading-6",
                  "focus-visible:ring-ring outline-none focus-visible:ring-2",
                )}
                aria-label="Task description editor"
              />
            }
            placeholder={
              <div className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 text-sm italic">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
          <HistoryPlugin />
          {autoFocus ? <AutoFocusPlugin /> : null}
          <ListPlugin />
          <LinkPlugin />
          <EditorShortcutsPlugin />
          <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              editorState.read(() => {
                const markdown = $convertToMarkdownString(
                  MARKDOWN_TRANSFORMERS,
                );
                const plainText = $getRoot().getTextContent();
                onChange(markdown);
                onContentMetaChange?.({ markdown, plainText });
              });
            }}
          />
        </div>
      </LexicalComposer>
    </div>
  );
}
