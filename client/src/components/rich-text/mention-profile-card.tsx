import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { MentionUser } from "@/components/rich-text/plugins/mentions-plugin";
import { IconUser } from "@tabler/icons-react";

interface MentionProfileCardProps {
  user: MentionUser;
  fallbackName: string;
}

function normalizeRoleLabel(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function MentionProfileCard({
  user,
  fallbackName,
}: Readonly<MentionProfileCardProps>) {
  const displayName = user.displayName?.trim() || fallbackName;

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10">
        <AvatarImage
          src={user.profileImageUrl}
          alt={displayName}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        <AvatarFallback>
          <IconUser className="h-4 w-4" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm leading-none font-semibold">
          {displayName}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          @{user.username}
        </p>
        {user.role ? (
          <p className="text-muted-foreground text-xs">
            {normalizeRoleLabel(user.role)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
