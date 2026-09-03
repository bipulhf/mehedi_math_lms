import { createAuthClient } from "better-auth/client";
import { adminClient, customSessionClient, phoneNumberClient } from "better-auth/client/plugins";
import { deviceIdHeader, devicePlatformHeader } from "@mma/shared";

import { readBrowserDeviceId } from "./browser-device";

type ServerAuth = typeof import("./tanstack-server").auth;

export const authClient = createAuthClient({
  fetchOptions: {
    // Every call this client makes carries the browser's own id, because the
    // one that matters -- a sign-in -- is not distinguishable here from the
    // ones that do not. The server reads it only where a session is created.
    // ADR-0019.
    onRequest: (context) => {
      const deviceId = readBrowserDeviceId();

      if (deviceId === null) {
        return context;
      }

      const headers = new Headers(context.headers);

      headers.set(deviceIdHeader, deviceId);
      headers.set(devicePlatformHeader, "web");

      return { ...context, headers };
    }
  },
  plugins: [adminClient(), phoneNumberClient(), customSessionClient<ServerAuth>()]
});
