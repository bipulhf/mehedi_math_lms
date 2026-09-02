import { OnecodesoftSmsProvider } from "./onecodesoft-provider";

export class SmsNotConfiguredError extends Error {
  public constructor() {
    super("SMS is not configured (ONECODESOFT_API_KEY, ONECODESOFT_SENDER_ID)");
    this.name = "SmsNotConfiguredError";
  }
}

export class SmsSendError extends Error {
  public constructor(statusCode: number, responseText: string) {
    super(`Onecodesoft refused the message: HTTP ${String(statusCode)} ${responseText.slice(0, 200)}`);
    this.name = "SmsSendError";
  }
}

const provider = new OnecodesoftSmsProvider();

/**
 * One message to one handset, for the callers with somebody waiting on it --
 * today that is the sign-in OTP. Bulk broadcasts go through the API's batch
 * processor instead, which records a row per recipient and can be resent.
 *
 * A refused send throws, for the reason `@mma/mailer` gives: a person waiting
 * for a code that was never sent, with nothing in the log saying so, is the
 * worse failure. Better Auth turns the throw into a 500 the operator sees, and
 * the caller never tells the user a code is on its way when it is not.
 */
export async function sendSms(input: { phoneE164: string; text: string }): Promise<void> {
  if (!provider.isConfigured()) {
    throw new SmsNotConfiguredError();
  }

  const result = await provider.sendBulk([{ Number: input.phoneE164, Text: input.text }]);

  if (result.statusCode < 200 || result.statusCode >= 300) {
    throw new SmsSendError(result.statusCode, result.responseText);
  }
}
