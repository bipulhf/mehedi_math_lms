import type { AuthSession, AuthUser } from "@mma/auth/server";
import type { Logger } from "pino";

export type QueueName = "email" | "notification" | "sms" | "file-processing";

export interface AppVariables {
  authSession: AuthSession | null;
  authUser: AuthUser | null;
  logger: Logger;
  requestId: string;
}

export interface AppBindings {
  Variables: AppVariables;
}
