import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";

export function LoadingSpinner({ title }: { title?: string }) {
  return (
    <Item variant="muted">
      <ItemMedia>
        <Spinner />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="line-clamp-1">{title ?? "Loading..."}</ItemTitle>
      </ItemContent>
    </Item>
  );
}
