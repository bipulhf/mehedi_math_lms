import { createAuthClient } from "better-auth/client";
import { adminClient, customSessionClient, phoneNumberClient } from "better-auth/client/plugins";

type ServerAuth = typeof import("./tanstack-server").auth;

export const authClient = createAuthClient({
  plugins: [adminClient(), phoneNumberClient(), customSessionClient<ServerAuth>()]
});
