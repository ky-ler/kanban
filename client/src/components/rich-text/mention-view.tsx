import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { MentionProfileCard } from "@/components/rich-text/mention-profile-card";
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";

interface MentionViewProps {
  mentionName: string;
  mentionUserId: string;
  mentionUsers?: MentionUser[];
  container?: HTMLElement | null;
}

export function MentionView({
  mentionName,
  mentionUserId,
  mentionUsers = [],
  container,
}: Readonly<MentionViewProps>) {
  const user = mentionUsers.find((candidate) => candidate.id === mentionUserId);
  const displayName = user?.displayName?.trim() || mentionName;

  if (!user) {
    return <span className="mention">@{mentionName}</span>;
  }

  const mentionChip = (
    <button
      type="button"
      className="mention font-inherit border-0 p-0 align-baseline"
      aria-label={`View profile for ${displayName}`}
      data-mention-trigger="true"
    >
      @{mentionName}
    </button>
  );

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{mentionChip}</HoverCardTrigger>
      <HoverCardContent
        className="w-64 p-3"
        align="start"
        sideOffset={8}
        container={container}
      >
        <MentionProfileCard user={user} fallbackName={mentionName} />
      </HoverCardContent>
    </HoverCard>
  );
}
