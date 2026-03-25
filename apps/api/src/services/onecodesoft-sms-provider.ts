import { env } from "@/lib/env";

const ONECODESOFT_URL = "https://sms.onecodesoft.com/api/send-bulk-sms";

export interface OnecodesoftMessageParameter {
  Number: string;
  Text: string;
}

interface OnecodesoftRequestBody {
  MessageParameters: OnecodesoftMessageParameter[];
  api_key: string;
  senderid: string;
}

export class OnecodesoftSmsProvider {
  public isConfigured(): boolean {
    return (
      Boolean(env.ONECODESOFT_API_KEY && env.ONECODESOFT_API_KEY.length > 0) &&
      Boolean(env.ONECODESOFT_SENDER_ID && env.ONECODESOFT_SENDER_ID.length > 0)
    );
  }

  public async sendBulk(parameters: readonly OnecodesoftMessageParameter[]): Promise<{
    responseText: string;
    statusCode: number;
  }> {
    const apiKey = env.ONECODESOFT_API_KEY;
    const senderId = env.ONECODESOFT_SENDER_ID;

    if (!apiKey || !senderId) {
      throw new Error("Onecodesoft SMS is not configured");
    }

    const body: OnecodesoftRequestBody = {
      MessageParameters: [...parameters],
      api_key: apiKey,
      senderid: senderId
    };

    const response = await fetch(ONECODESOFT_URL, {
      body: JSON.stringify(body),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const responseText = await response.text();

    return {
      responseText,
      statusCode: response.status
    };
  }
}
