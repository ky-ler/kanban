import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { headingTypographyClasses } from "@/features/tasks/components/task-description-heading-styles";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { Children, isValidElement } from "react";

interface TaskDescriptionViewProps {
  value: string;
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
  ul: ({ children, className }) => (
    <ul
      className={cn(
        "mb-2 ml-5 list-disc",
        className?.includes("contains-task-list") && "ml-0 list-none pl-0",
      )}
    >
      {children}
    </ul>
  ),
  ol: ({ children }) => <ol className="mb-2 ml-5 list-decimal">{children}</ol>,
  li: ({ children, className }) => {
    const isTaskItem = className?.includes("task-list-item");
    let isChecked = false;

    if (isTaskItem) {
      const childList = Children.toArray(children);
      const checkboxNode = childList.find(
        (child) =>
          isValidElement<{ checked?: boolean; type?: string }>(child) &&
          (child.props.type === "checkbox" ||
            typeof child.props.checked === "boolean"),
      );

      if (isValidElement<{ checked?: boolean }>(checkboxNode)) {
        isChecked = Boolean(checkboxNode.props.checked);
      }
    }

    return (
      <li
        className={cn(
          "my-1",
          isTaskItem && "ml-0 list-none",
          isChecked && "text-muted-foreground line-through",
        )}
      >
        {children}
      </li>
    );
  },
  input: ({ type, checked }) => {
    if (type !== "checkbox") {
      return null;
    }

    return (
      <Checkbox
        checked={Boolean(checked)}
        disabled
        className="mr-2 inline-flex align-middle disabled:opacity-100"
      />
    );
  },
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

export function TaskDescriptionView({
  value,
}: Readonly<TaskDescriptionViewProps>) {
  if (!value.trim()) {
    return (
      <span className="text-muted-foreground text-sm italic">
        Click to add a description...
      </span>
    );
  }

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {value}
    </ReactMarkdown>
  );
}
