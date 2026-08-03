import type { MessageParticipant } from "@/lib/api/messages";

/** Shared by the conversation list and the thread header. */
export function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

/**
 * Every role reads the same. This used to hand each one its own colour, which
 * DESIGN.md §2 has no budget for — the accent is reserved for what needs
 * acting on, and "this person is a teacher" is not that. The role is already
 * spelled out in the badge's own text.
 */
export function roleTone(role: MessageParticipant["role"]): "neutral" | "quiet" {
  return role === "STUDENT" ? "quiet" : "neutral";
}

export function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
