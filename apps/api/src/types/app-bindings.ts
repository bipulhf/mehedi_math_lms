import type { Logger } from "pino";

export type QueueName = "email" | "notification" | "sms" | "file-processing";

export interface AppVariables {
  logger: Logger;
  requestId: string;
}

export interface AppBindings {
  Variables: AppVariables;
}
