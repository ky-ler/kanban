import { headingTypographyClasses } from "@/components/rich-text/heading-styles";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownViewProps {
  value: string;
  emptyState?: ReactNode;
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 leading-6 last:mb-0">{children}</p>,
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
  ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal">{children}</ol>,
  li: ({ children }) => <li className="my-1">{children}</li>,
  input: () => null,
  blockquote: ({ children }) => (
    <blockquote className="text-muted-foreground my-2 border-l-2 pl-3 italic">
      {children}
    </blockquote>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ children, className }) => (
    <code
      className={cn(
        "bg-muted border-border rounded border px-1 py-0.5 font-mono text-[0.85em]",
        className,
      )}
    >
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="bg-muted border-border my-2 overflow-x-auto rounded-md border p-3 text-xs leading-6">
      {children}
    </pre>
  ),
};

export function MarkdownView({
  value,
  emptyState,
}: Readonly<MarkdownViewProps>) {
  if (!value.trim() && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {value}
    </ReactMarkdown>
  );
}
