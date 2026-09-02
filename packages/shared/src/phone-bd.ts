/**
 * A Bangladesh mobile number in the shape the provider wants: `8801XXXXXXXXX`,
 * thirteen digits, no `+`. Anything this cannot place returns null rather than
 * a guess -- a wrong number is an SMS delivered to a stranger, and on the OTP
 * path it is a code delivered to a stranger.
 */
export function normalizeBdPhoneE164(raw: string): string | null {
  const digits = raw.replaceAll(/\D/g, "");

  if (digits.length === 0) {
    return null;
  }

  if (digits.startsWith("880") && digits.length === 13) {
    return digits;
  }

  if (digits.startsWith("01") && digits.length === 11) {
    return `880${digits.slice(1)}`;
  }

  if (digits.startsWith("1") && digits.length === 10) {
    return `880${digits}`;
  }

  if (digits.startsWith("880") && digits.length > 13) {
    return digits.slice(0, 13);
  }

  return null;
}
