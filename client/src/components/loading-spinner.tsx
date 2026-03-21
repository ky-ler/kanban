import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function LoadingSpinner({
  title,
  className,
}: {
  title?: string;
  className?: string;
}) {
  return (
    <Item
      className={cn("flex flex-1 items-center justify-center gap-2", className)}
    >
      <ItemMedia>
        <Spinner />
      </ItemMedia>
      {title && (
        <ItemContent className="flex-none justify-end">
          <ItemTitle className="line-clamp-1">{title}</ItemTitle>
        </ItemContent>
      )}
    </Item>
  );
}
