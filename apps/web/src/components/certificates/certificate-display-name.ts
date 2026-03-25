export function certificateDisplayName(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  if (typeof name === "string" && name.trim().length > 0) {
    return name.trim();
  }

  if (typeof email === "string" && email.length > 0) {
    return email;
  }

  return "Student";
}
