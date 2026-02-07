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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  editorHeadingClasses,
  headingTypographyClasses,
  type HeadingTag,
} from "@/features/tasks/components/task-description-heading-styles";
import {
  formatShortcutLabel,
  isPrimaryModifierPressed,
} from "@/lib/keyboard-shortcuts";
import { cn } from "@/lib/utils";
import { LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  BOLD_STAR,
  CHECK_LIST,
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
  INSERT_CHECK_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListItemNode,
  ListNode,
} from "@lexical/list";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { AutoFocusPlugin } from "@lexical/react/LexicalAutoFocusPlugin";
import { CheckListPlugin } from "@lexical/react/LexicalCheckListPlugin";
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
  HeadingNode,
  QuoteNode,
} from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  COMMAND_PRIORITY_EDITOR,
  FORMAT_TEXT_COMMAND,
  KEY_DOWN_COMMAND,
  type LexicalEditor,
} from "lexical";
import {
  Bold,
  ChevronDown,
  CircleHelp,
  Code,
  Italic,
  Link2,
  List,
  ListOrdered,
  ListTodo,
  Pilcrow,
  Strikethrough,
  TextQuote,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const MARKDOWN_TRANSFORMERS: Transformer[] = [
  BOLD_STAR,
  ITALIC_STAR,
  STRIKETHROUGH,
  INLINE_CODE,
  LINK,
  UNORDERED_LIST,
  CHECK_LIST,
  HEADING,
  ORDERED_LIST,
  QUOTE,
];

type TextStyle = "paragraph" | HeadingTag;

const HEADING_ITEMS: Array<{
  label: string;
  tag: HeadingTag;
  shortcut: string;
}> = [
  {
    label: "Heading 1",
    tag: "h1",
    shortcut: "Mod+Alt+1",
  },
  {
    label: "Heading 2",
    tag: "h2",
    shortcut: "Mod+Alt+2",
  },
  {
    label: "Heading 3",
    tag: "h3",
    shortcut: "Mod+Alt+3",
  },
  {
    label: "Heading 4",
    tag: "h4",
    shortcut: "Mod+Alt+4",
  },
  {
    label: "Heading 5",
    tag: "h5",
    shortcut: "Mod+Alt+5",
  },
  {
    label: "Heading 6",
    tag: "h6",
    shortcut: "Mod+Alt+6",
  },
];

const SHORTCUT_HELP: Array<{ action: string; shortcut: string }> = [
  { action: "Bold", shortcut: "Mod+B" },
  { action: "Italic", shortcut: "Mod+I" },
  { action: "Strikethrough", shortcut: "Mod+Shift+S" },
  { action: "Inline code", shortcut: "Mod+Shift+M" },
  { action: "Link", shortcut: "Mod+K" },
  { action: "Numbered list", shortcut: "Mod+Shift+7" },
  { action: "Bullet list", shortcut: "Mod+Shift+8" },
  { action: "Quote", shortcut: "Mod+Shift+9" },
  { action: "Checklist", shortcut: "Mod+Alt+Enter" },
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
  { label: "Checklist", syntax: "- [ ] todo / - [x] done" },
  { label: "Quote", syntax: "> quoted text" },
  { label: "Heading", syntax: "# H1 / ## H2 / ### H3" },
];

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
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

function toggleLink(editor: LexicalEditor): void {
  const url = window.prompt(
    "Enter URL. Leave empty to remove link.",
    "https://",
  );
  if (url === null) return;

  const normalizedUrl = url.trim();
  editor.dispatchCommand(
    TOGGLE_LINK_COMMAND,
    normalizedUrl.length > 0 ? normalizedUrl : null,
  );
}

function ToolbarButton({
  onClick,
  children,
  label,
  shortcut,
}: {
  onClick: () => void;
  children: ReactNode;
  label: string;
  shortcut?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClick}
          aria-label={shortcut ? `${label} (${shortcut})` : label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2 text-xs">
        <span>{label}</span>
        {shortcut ? (
          <span className="text-muted-foreground font-mono tracking-normal">
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
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event) => {
        const hasMod = isPrimaryModifierPressed(event);
        if (!hasMod) {
          return false;
        }

        if (event.altKey && !event.shiftKey) {
          switch (event.code) {
            case "Digit0":
              event.preventDefault();
              setParagraph(editor);
              return true;
            case "Digit1":
              event.preventDefault();
              setHeading(editor, "h1");
              return true;
            case "Digit2":
              event.preventDefault();
              setHeading(editor, "h2");
              return true;
            case "Digit3":
              event.preventDefault();
              setHeading(editor, "h3");
              return true;
            case "Digit4":
              event.preventDefault();
              setHeading(editor, "h4");
              return true;
            case "Digit5":
              event.preventDefault();
              setHeading(editor, "h5");
              return true;
            case "Digit6":
              event.preventDefault();
              setHeading(editor, "h6");
              return true;
            case "Enter":
              event.preventDefault();
              editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined);
              return true;
            default:
              break;
          }
        }

        if (event.shiftKey && !event.altKey) {
          switch (event.code) {
            case "Digit7":
              event.preventDefault();
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
              return true;
            case "Digit8":
              event.preventDefault();
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
              return true;
            case "Digit9":
              event.preventDefault();
              setQuote(editor);
              return true;
            case "KeyM":
              event.preventDefault();
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code");
              return true;
            case "KeyS":
              event.preventDefault();
              editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough");
              return true;
            default:
              break;
          }
        }

        if (!event.altKey && !event.shiftKey && event.code === "KeyK") {
          event.preventDefault();
          toggleLink(editor);
          return true;
        }

        return false;
      },
      COMMAND_PRIORITY_EDITOR,
    );
  }, [editor]);

  return null;
}

function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeTextStyle, setActiveTextStyle] =
    useState<TextStyle>("paragraph");

  const applyTextStyle = (style: TextStyle): void => {
    if (style === "paragraph") {
      setParagraph(editor);
      setActiveTextStyle("paragraph");
      return;
    }

    setHeading(editor, style);
    setActiveTextStyle(style);
  };

  useEffect(() => {
    const updateActiveTextStyle = (): void => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        const nextStyle: TextStyle = (() => {
          if (!$isRangeSelection(selection)) {
            return "paragraph";
          }

          const anchorNode = selection.anchor.getNode();
          const topLevelElement = anchorNode.getTopLevelElementOrThrow();
          if ($isHeadingNode(topLevelElement)) {
            return topLevelElement.getTag();
          }

          return "paragraph";
        })();

        setActiveTextStyle((previousStyle) =>
          previousStyle === nextStyle ? previousStyle : nextStyle,
        );
      });
    };

    updateActiveTextStyle();
    return editor.registerUpdateListener(() => {
      updateActiveTextStyle();
    });
  }, [editor]);

  const activeTextStyleLabel =
    activeTextStyle === "paragraph" ? "Text" : activeTextStyle.toUpperCase();

  return (
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
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")}
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Italic"
        shortcut={formatShortcutLabel("Mod+I")}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")}
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Strikethrough"
        shortcut={formatShortcutLabel("Mod+Shift+S")}
        onClick={() =>
          editor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
      >
        <Strikethrough className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Inline code"
        shortcut={formatShortcutLabel("Mod+Shift+M")}
        onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, "code")}
      >
        <Code className="h-4 w-4" />
      </ToolbarButton>

      <div className="bg-border mx-1 h-5 w-px" />

      <ToolbarButton
        label="Bullet list"
        shortcut={formatShortcutLabel("Mod+Shift+8")}
        onClick={() =>
          editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
        }
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        shortcut={formatShortcutLabel("Mod+Shift+7")}
        onClick={() =>
          editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
        }
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Checklist"
        shortcut={formatShortcutLabel("Mod+Alt+Enter")}
        onClick={() =>
          editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)
        }
      >
        <ListTodo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        label="Paragraph"
        shortcut={formatShortcutLabel("Mod+Alt+0")}
        onClick={() => setParagraph(editor)}
      >
        <Pilcrow className="h-4 w-4" />
      </ToolbarButton>

      <div className="bg-border mx-1 h-5 w-px" />

      <ToolbarButton
        label="Quote"
        shortcut={formatShortcutLabel("Mod+Shift+9")}
        onClick={() => setQuote(editor)}
      >
        <TextQuote className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarButton
        label="Add or remove link"
        shortcut={formatShortcutLabel("Mod+K")}
        onClick={() => toggleLink(editor)}
      >
        <Link2 className="h-4 w-4" />
      </ToolbarButton>

      <div className="bg-border mx-1 h-5 w-px" />
      <EditorHelpDialog />
    </div>
  );
}

export function TaskDescriptionEditor({
  value,
  onChange,
  placeholder = "Add a more detailed description...",
}: Readonly<TaskDescriptionEditorProps>) {
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
          checklist: "m-0 p-0",
          listitem: "my-1",
          listitemUnchecked:
            "relative my-1 list-none pl-7 before:absolute before:top-[0.33rem] before:left-0 before:h-4 before:w-4 before:rounded-sm before:border before:border-input before:bg-background before:shadow-xs before:content-['']",
          listitemChecked:
            "text-muted-foreground relative my-1 list-none pl-7 line-through before:absolute before:top-[0.33rem] before:left-0 before:h-4 before:w-4 before:rounded-sm before:border before:border-primary before:bg-primary before:shadow-xs before:content-[''] after:absolute after:top-[0.5rem] after:left-[0.3rem] after:h-2 after:w-1 after:rotate-45 after:border-r-2 after:border-b-2 after:border-primary-foreground after:content-['']",
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
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  "min-h-[160px] px-3 py-2 text-sm leading-6",
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
          <AutoFocusPlugin />
          <ListPlugin />
          <CheckListPlugin />
          <LinkPlugin />
          <EditorShortcutsPlugin />
          <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
          <OnChangePlugin
            ignoreSelectionChange={true}
            onChange={(editorState) => {
              editorState.read(() => {
                onChange($convertToMarkdownString(MARKDOWN_TRANSFORMERS));
              });
            }}
          />
        </div>
      </LexicalComposer>
    </div>
  );
}
