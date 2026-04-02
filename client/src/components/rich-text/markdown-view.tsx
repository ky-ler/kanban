import { headingTypographyClasses } from "@/components/rich-text/heading-styles";
import { MentionView } from "@/components/rich-text/mention-view";
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";
import { cn } from "@/lib/utils";
import {
  Children,
  isValidElement,
  useMemo,
  type ReactNode,
  type ReactElement,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewProps {
  value: string;
  emptyState?: ReactNode;
  mentionUsers?: MentionUser[];
  container?: HTMLElement | null;
}

const mentionUuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeMentionId(rawHref: string): string {
  try {
    return decodeURIComponent(rawHref);
  } catch {
    return rawHref;
  }
}

function isMentionHref(href: string): boolean {
  const normalizedHref = normalizeMentionId(href);
  return normalizedHref.includes("|") || mentionUuidRegex.test(normalizedHref);
}

function getTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getTextContent).join("");
  }
  if (isValidElement(node)) {
    return Children.toArray(
      (node as ReactElement<{ children?: ReactNode }>).props.children,
    )
      .map(getTextContent)
      .join("");
  }
  return "";
}

export function MarkdownView({
  value,
  emptyState,
  mentionUsers = [],
  container,
}: Readonly<MarkdownViewProps>) {
  const markdownComponents = useMemo<Components>(
    () => ({
      p: ({ children }) => (
        <p className="mb-2 leading-6 break-words last:mb-0">{children}</p>
      ),
      h1: ({ children }) => (
        <h1 className={cn("mt-4 mb-3 first:mt-0", headingTypographyClasses.h1)}>
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className={cn("mt-4 mb-3 first:mt-0", headingTypographyClasses.h2)}>
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className={cn("mt-3 mb-2 first:mt-0", headingTypographyClasses.h3)}>
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className={cn("mt-3 mb-2 first:mt-0", headingTypographyClasses.h4)}>
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5 className={cn("mt-3 mb-2 first:mt-0", headingTypographyClasses.h5)}>
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6 className={cn("mt-2 mb-2 first:mt-0", headingTypographyClasses.h6)}>
          {children}
        </h6>
      ),
      ul: ({ children }) => <ul className="mb-2 ml-5 list-disc">{children}</ul>,
      ol: ({ children }) => (
        <ol className="mb-2 ml-5 list-decimal">{children}</ol>
      ),
      li: ({ children }) => <li className="my-1">{children}</li>,
      input: () => null,
      blockquote: ({ children }) => (
        <blockquote className="text-muted-foreground my-2 border-l-2 pl-3 italic">
          {children}
        </blockquote>
      ),
      a: ({ children, href }) => {
        if (href && isMentionHref(href)) {
          const mentionLabel = getTextContent(children);
          const mentionName = mentionLabel.startsWith("@")
            ? mentionLabel.slice(1)
            : mentionLabel;
          const mentionUserId = normalizeMentionId(href);
          return (
            <MentionView
              mentionName={mentionName}
              mentionUserId={mentionUserId}
              mentionUsers={mentionUsers}
              container={container}
            />
          );
        }

        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-2"
          >
            {children}
          </a>
        );
      },
      code: ({ children, className }) => (
        <code
          className={cn(
            "bg-muted border-border rounded-md border px-1 py-0.5 font-mono text-[0.85em]",
            className,
          )}
        >
          {children}
        </code>
      ),
      pre: ({ children }) => (
        <pre className="bg-muted border-border my-2 overflow-x-auto rounded-md border p-3 leading-6">
          {children}
        </pre>
      ),
    }),
    [mentionUsers, container],
  );

  if (!value.trim() && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {value}
    </ReactMarkdown>
  );
}
