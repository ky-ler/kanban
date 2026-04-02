import type { TextMatchTransformer } from "@lexical/markdown";
import type { LexicalNode, TextNode } from "lexical";
import {
  $createMentionNode,
  $isMentionNode,
  MentionNode,
} from "@/components/rich-text/nodes/mention-node";

// Matches [@Display Name](userId) and legacy @[Display Name](userId)
const MENTION_REGEX = /(?:@\[|\[@)([^\]]+)\]\(([^)]+)\)/;

export const MENTION_TRANSFORMER: TextMatchTransformer = {
  dependencies: [MentionNode],
  export: (node: LexicalNode) => {
    if (!$isMentionNode(node)) {
      return null;
    }
    return `[@${node.getMentionName()}](${node.getUserId()})`;
  },
  importRegExp: MENTION_REGEX,
  regExp: MENTION_REGEX,
  replace: (textNode: TextNode, match: RegExpMatchArray) => {
    const [, mentionName, userId] = match;
    const mentionNode = $createMentionNode(userId, mentionName);
    textNode.replace(mentionNode);
  },
  trigger: ")",
  type: "text-match",
};
