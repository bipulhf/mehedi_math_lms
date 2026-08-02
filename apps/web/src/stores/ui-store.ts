import { create } from "zustand";

/**
 * Genuinely global UI state only -- things two unrelated parts of the tree both
 * need and neither owns. Server data belongs in TanStack Query, not here.
 *
 * The unread badge qualifies: the messages page knows the count, the dashboard
 * sidebar renders it, and they share no ancestor that could hold the state.
 * This replaces a `window` CustomEvent bus, which worked but was invisible to
 * types and impossible to read from a test.
 */
interface UiState {
  isMobileNavOpen: boolean;
  messageUnreadCount: number;
  setMessageUnreadCount: (count: number) => void;
  setMobileNavOpen: (isOpen: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileNavOpen: false,
  messageUnreadCount: 0,
  setMessageUnreadCount: (count) => set({ messageUnreadCount: Math.max(0, count) }),
  setMobileNavOpen: (isOpen) => set({ isMobileNavOpen: isOpen })
}));
