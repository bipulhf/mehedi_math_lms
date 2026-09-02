import { describe, expect, test } from "bun:test";

import { smsEnv } from "./env";
import { SmsNotConfiguredError, sendSms } from "./send-sms";

describe("sendSms with no credentials", () => {
  // This suite runs without the root `.env`, so the placeholder defaults apply
  // and this is the "off" deployment the env module describes.
  test("reads the placeholder as off rather than as an API key", () => {
    expect(smsEnv.ONECODESOFT_API_KEY).toBe("replace-me");
    expect(smsEnv.isSmsConfigured).toBe(false);
  });

  test("throws instead of quietly doing nothing", async () => {
    // The alternative is somebody waiting for a sign-in code that was never
    // going to be sent, with nothing in the log saying so.
    await expect(sendSms({ phoneE164: "8801712345678", text: "hi" })).rejects.toBeInstanceOf(
      SmsNotConfiguredError
    );
  });
});
