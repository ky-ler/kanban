export type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export const headingTypographyClasses: Record<HeadingTag, string> = {
  h1: "text-4xl leading-tight font-semibold tracking-tight",
  h2: "text-3xl leading-tight font-semibold tracking-tight",
  h3: "text-2xl leading-snug font-semibold",
  h4: "text-xl leading-snug font-semibold",
  h5: "text-lg leading-snug font-semibold",
  h6: "text-muted-foreground text-base leading-snug font-semibold",
};

export const editorHeadingClasses: Record<HeadingTag, string> = {
  h1: `mb-4 ${headingTypographyClasses.h1}`,
  h2: `mb-3 ${headingTypographyClasses.h2}`,
  h3: `mb-3 ${headingTypographyClasses.h3}`,
  h4: `mb-2 ${headingTypographyClasses.h4}`,
  h5: `mb-2 ${headingTypographyClasses.h5}`,
  h6: `mb-2 ${headingTypographyClasses.h6}`,
};
