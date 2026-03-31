import {
  $applyNodeReplacement,
  type DOMConversionMap,
  type DOMConversionOutput,
  type DOMExportOutput,
  type EditorConfig,
  type LexicalNode,
  type NodeKey,
  type SerializedTextNode,
  type Spread,
  TextNode,
} from "lexical";

export type SerializedMentionNode = Spread<
  {
    userId: string;
    mentionName: string;
  },
  SerializedTextNode
>;

function $convertMentionElement(
  domNode: HTMLElement,
): DOMConversionOutput | null {
  const textContent = domNode.textContent;
  const userId = domNode.getAttribute("data-mention-user-id");
  const mentionName = domNode.getAttribute("data-mention-name");

  if (textContent !== null && userId !== null) {
    const node = $createMentionNode(
      userId,
      typeof mentionName === "string" ? mentionName : textContent,
    );
    return { node };
  }

  return null;
}

export class MentionNode extends TextNode {
  __userId: string;
  __mentionName: string;

  static getType(): string {
    return "mention";
  }

  static clone(node: MentionNode): MentionNode {
    return new MentionNode(
      node.__userId,
      node.__mentionName,
      node.__text,
      node.__key,
    );
  }

  static importJSON(serializedNode: SerializedMentionNode): MentionNode {
    return $createMentionNode(
      serializedNode.userId,
      serializedNode.mentionName,
    ).updateFromJSON(serializedNode);
  }

  constructor(
    userId: string,
    mentionName: string,
    text?: string,
    key?: NodeKey,
  ) {
    super(text ?? `@${mentionName}`, key);
    this.__userId = userId;
    this.__mentionName = mentionName;
  }

  exportJSON(): SerializedMentionNode {
    return {
      ...super.exportJSON(),
      userId: this.__userId,
      mentionName: this.__mentionName,
    };
  }

  getUserId(): string {
    return this.__userId;
  }

  getMentionName(): string {
    return this.__mentionName;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const dom = super.createDOM(config);
    dom.className = "mention";
    dom.setAttribute("data-mention-user-id", this.__userId);
    dom.setAttribute("data-mention-name", this.__mentionName);
    dom.spellcheck = false;
    return dom;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("span");
    element.setAttribute("data-lexical-mention", "true");
    element.setAttribute("data-mention-user-id", this.__userId);
    element.setAttribute("data-mention-name", this.__mentionName);
    element.className = "mention";
    element.textContent = this.__text;
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      span: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-mention")) {
          return null;
        }
        return {
          conversion: $convertMentionElement,
          priority: 1,
        };
      },
    };
  }

  isTextEntity(): true {
    return true;
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  canInsertTextAfter(): boolean {
    return false;
  }
}

export function $createMentionNode(
  userId: string,
  mentionName: string,
): MentionNode {
  const mentionNode = new MentionNode(userId, mentionName, `@${mentionName}`);
  mentionNode.setMode("segmented").toggleDirectionless();
  return $applyNodeReplacement(mentionNode);
}

export function $isMentionNode(
  node: LexicalNode | null | undefined,
): node is MentionNode {
  return node instanceof MentionNode;
}
