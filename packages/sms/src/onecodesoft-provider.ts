import { smsEnv } from "./env";

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
    return smsEnv.isSmsConfigured;
  }

  public async sendBulk(parameters: readonly OnecodesoftMessageParameter[]): Promise<{
    responseText: string;
    statusCode: number;
  }> {
    if (!smsEnv.isSmsConfigured) {
      throw new Error("Onecodesoft SMS is not configured");
    }

    const body: OnecodesoftRequestBody = {
      MessageParameters: [...parameters],
      api_key: smsEnv.ONECODESOFT_API_KEY,
      senderid: smsEnv.ONECODESOFT_SENDER_ID
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
