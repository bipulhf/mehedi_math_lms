import { createAuthClient } from "better-auth/client";
import { adminClient, customSessionClient } from "better-auth/client/plugins";

import { auth } from "./server";

export const authClient = createAuthClient({
  plugins: [adminClient(), customSessionClient<typeof auth>()]
});
