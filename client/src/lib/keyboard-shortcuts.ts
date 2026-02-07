type ModifierKeyEvent = {
  metaKey: boolean;
  ctrlKey: boolean;
};

export function getModifierKeyPrefix(): "⌘" | "Ctrl" {
  if (typeof navigator === "undefined") {
    return "Ctrl";
  }

  return navigator.platform.startsWith("Mac") ? "⌘" : "Ctrl";
}

export function formatShortcutLabel(shortcut: string): string {
  return shortcut.replace(/Mod/g, getModifierKeyPrefix());
}

export function isPrimaryModifierPressed(event: ModifierKeyEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

export function getSaveShortcutHint(): string {
  return `${getModifierKeyPrefix()}+Enter to save`;
}
