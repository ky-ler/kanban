import { useCallback, useMemo, useState, type JSX } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  useBasicTypeaheadTriggerMatch,
} from "@lexical/react/LexicalTypeaheadMenuPlugin";
import type { TextNode } from "lexical";
import { $createMentionNode } from "@/components/rich-text/nodes/mention-node";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export interface MentionUser {
  id: string;
  username: string;
  profileImageUrl: string;
  displayName?: string;
  role?: string;
}

const SUGGESTION_LIST_LENGTH_LIMIT = 5;

class MentionTypeaheadOption extends MenuOption {
  user: MentionUser;
  picture: JSX.Element;

  constructor(user: MentionUser) {
    super(user.username);
    this.user = user;
    this.picture = (
      <Avatar className="h-6 w-6">
        <AvatarImage src={user.profileImageUrl} alt={user.username} />
        <AvatarFallback className="text-xs">
          {user.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
    );
  }
}

function MentionMenuItem({
  option,
  isSelected,
  onClick,
}: {
  option: MentionTypeaheadOption;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm",
        "hover:bg-accent hover:text-accent-foreground",
        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
        isSelected && "bg-accent text-accent-foreground",
      )}
      onClick={onClick}
    >
      {option.picture}
      <span className="truncate">{option.user.username}</span>
    </button>
  );
}

interface MentionsPluginProps {
  users: MentionUser[];
}

export function MentionsPlugin({
  users,
}: MentionsPluginProps): JSX.Element | null {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);

  const checkForMentionMatch = useBasicTypeaheadTriggerMatch("@", {
    minLength: 1,
    maxLength: 75,
    allowWhitespace: false,
  });

  const options = useMemo(() => {
    if (queryString === null) {
      return users
        .slice(0, SUGGESTION_LIST_LENGTH_LIMIT)
        .map((user) => new MentionTypeaheadOption(user));
    }

    const lowerQuery = queryString.toLowerCase();
    return users
      .filter((user) => user.username.toLowerCase().includes(lowerQuery))
      .slice(0, SUGGESTION_LIST_LENGTH_LIMIT)
      .map((user) => new MentionTypeaheadOption(user));
  }, [users, queryString]);

  const onSelectOption = useCallback(
    (
      selectedOption: MentionTypeaheadOption,
      nodeToReplace: TextNode | null,
      closeMenu: () => void,
    ) => {
      editor.update(() => {
        const mentionNode = $createMentionNode(
          selectedOption.user.id,
          selectedOption.user.username,
        );
        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }
        mentionNode.select();
        closeMenu();
      });
    },
    [editor],
  );

  if (users.length === 0) {
    return null;
  }

  return (
    <LexicalTypeaheadMenuPlugin<MentionTypeaheadOption>
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForMentionMatch}
      options={options}
      anchorClassName="z-[9999] pointer-events-none"
      parent={typeof document !== "undefined" ? document.body : undefined}
      menuRenderFn={(
        anchorElementRef,
        { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex },
      ) => {
        if (anchorElementRef.current === null || options.length === 0) {
          return null;
        }

        return (
          <div className="bg-popover text-popover-foreground border-border pointer-events-auto z-50 min-w-[180px] overflow-hidden rounded-md border p-1 shadow-md">
            {options.map((option, index) => (
              <MentionMenuItem
                key={option.user.id}
                option={option}
                isSelected={selectedIndex === index}
                onClick={() => {
                  setHighlightedIndex(index);
                  selectOptionAndCleanUp(option);
                }}
              />
            ))}
          </div>
        );
      }}
    />
  );
}
