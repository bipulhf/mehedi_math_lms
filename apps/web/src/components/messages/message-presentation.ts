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

export function roleTone(
  role: MessageParticipant["role"]
): "blue" | "gray" | "green" | "violet" {
  if (role === "TEACHER") {
    return "violet";
  }

  if (role === "STUDENT") {
    return "blue";
  }

  if (role === "ADMIN") {
    return "green";
  }

  return "gray";
}

export function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}
