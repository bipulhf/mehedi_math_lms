import { betterAuth } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { admin, oneTimeToken } from "better-auth/plugins";
import type { UserWithRole } from "better-auth/plugins/admin";
import { customSession } from "better-auth/plugins/custom-session";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { accounts, db, sessions, users, verificationTokens } from "@mma/db";
import { passwordResetExpirySeconds, sendPasswordResetEmail } from "@mma/mailer";
import * as schema from "@mma/db/schema";
import { z } from "zod";

import { createPhoneOtpPlugin, phoneOtpCooldownHook } from "./phone-otp";

const authEnvSchema = z.object({
  APP_URL: z.url().default("https://mehedismathacademy.com"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
  GOOGLE_CLIENT_ID: z.string().min(1).default("replace-me"),
  GOOGLE_CLIENT_SECRET: z.string().min(1).default("replace-me")
});

const parsedAuthEnv = authEnvSchema.parse(process.env);

const trustedOrigins = [
  parsedAuthEnv.APP_URL,
  parsedAuthEnv.BETTER_AUTH_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8081",
  "exp://127.0.0.1:8081",
  // The Expo app's deep-link scheme (app.json `scheme`). The mobile Google
  // flow finishes by redirecting the in-app browser back into the app.
  "mma://"
];

const isGoogleConfigured =
  parsedAuthEnv.GOOGLE_CLIENT_ID !== "replace-me" &&
  parsedAuthEnv.GOOGLE_CLIENT_SECRET !== "replace-me";
const isDevelopment = process.env.NODE_ENV === "development";

// The API and the web app live on sibling subdomains in production (e.g.
// lms.example.com and api.lms.example.com) -- a host-only cookie set while
// signing in on the web origin never reaches the API origin. Scoping the
// cookie to the shared parent domain instead is what lets both see it.
// `localhost` has no dot to split on, so this is a no-op in development.
const authHost = new URL(parsedAuthEnv.BETTER_AUTH_URL).hostname;
const cookieDomain = authHost.split(".").slice(-2).join(".");

interface AuthUserFields extends UserWithRole {
  profileCompleted?: boolean;
  isActive?: boolean;
}

export const auth = betterAuth({
  appName: "Mehedi's Math Academy",
  baseURL: parsedAuthEnv.BETTER_AUTH_URL,
  secret: parsedAuthEnv.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: users,
      account: accounts,
      session: sessions,
      verification: verificationTokens,
      verification_tokens: verificationTokens
    }
  }),
  advanced: {
    database: {
      generateId: "uuid"
    },
    crossSubDomainCookies: {
      enabled: true,
      domain: cookieDomain
    }
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    resetPasswordTokenExpiresIn: passwordResetExpirySeconds,
    // A reset is how somebody who has lost the account takes it back, so every
    // other session goes with it. The cost is the honest one: the person is
    // signed out on their other devices.
    revokeSessionsOnPasswordReset: true,
    // Throws when SMTP is unset or the relay refuses. That is deliberate --
    // `@mma/mailer` explains why a swallowed send is the worse failure --
    // and Better Auth turns it into a 500 the operator sees in the log.
    sendResetPassword: async ({ user, url }, request) => {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        request,
        resetUrl: url
      });
    }
  },
  socialProviders: isGoogleConfigured
    ? {
        google: {
          clientId: parsedAuthEnv.GOOGLE_CLIENT_ID,
          clientSecret: parsedAuthEnv.GOOGLE_CLIENT_SECRET
        }
      }
    : undefined,
  rateLimit: {
    enabled: !isDevelopment,
    // Generous on purpose. Every page in the app reads the session, a shared
    // office or a phone on carrier NAT arrives as one address, and the limiter
    // counts per address -- so a limit tuned to one person's browsing locks
    // out a classroom. These numbers are here to stop a script, not to ration
    // ordinary use; the ceiling a real person can reach is their own patience.
    window: 15 * 60,
    max: 1000,
    customRules: {
      "/sign-in/email": {
        window: 15 * 60,
        max: 50
      },
      "/sign-up/email": {
        window: 15 * 60,
        max: 50
      },
      // Each one of these sends a mail to an address the caller chose, so it
      // stays below the global limit: without a rule of its own a script could
      // use this endpoint to post somebody else's inbox full.
      "/request-password-reset": {
        window: 15 * 60,
        max: 20
      },
      "/reset-password": {
        window: 15 * 60,
        max: 50
      },
      // Every one of these costs a message. The per-handset cooldown in
      // `phone-otp.ts` is the other half: this counts per IP, that one counts
      // per number, and a code sender needs both. One person needs two or
      // three codes; the rest of this allowance is for everybody behind the
      // same address.
      "/phone-number/send-otp": {
        window: 15 * 60,
        max: 15
      },
      "/phone-number/verify": {
        window: 15 * 60,
        max: 60
      }
    }
  },
  user: {
    modelName: "users",
    additionalFields: {
      slug: {
        type: "string",
        required: false
      },
      profileCompleted: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false
      }
    }
  },
  session: {
    modelName: "sessions"
  },
  account: {
    modelName: "accounts",
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "credential"],
      allowDifferentEmails: false
    }
  },
  verification: {
    modelName: "verification_tokens"
  },
  hooks: {
    before: phoneOtpCooldownHook
  },
  plugins: [
    admin({
      defaultRole: "STUDENT",
      adminRoles: ["ADMIN"]
    }),
    // How a native sign-in gets a session out of the in-app browser. The web
    // app mints a short-lived, single-use token at /api/mobile-auth-handoff and
    // hands it to the app over the deep link; the app exchanges it for the
    // session cookie. `disableClientRequest` keeps minting server-side only.
    oneTimeToken({
      disableClientRequest: true,
      expiresIn: 3,
      storeToken: "hashed"
    }),
    createPhoneOtpPlugin(),
    customSession(async ({ session, user }) => {
      const authUser = user as AuthUserFields;

      return {
        user: authUser,
        session: {
          ...session,
          role: authUser.role,
          profileCompleted: authUser.profileCompleted ?? false,
          isActive: authUser.isActive ?? true
        }
      };
    }),
    tanstackStartCookies()
  ]
});

export type AuthSessionPayload = typeof auth.$Infer.Session;
export type AuthUser = AuthSessionPayload["user"];
export type AuthSession = AuthSessionPayload["session"];

export async function createPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}
