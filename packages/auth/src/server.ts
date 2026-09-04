import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { admin, oneTimeToken } from "better-auth/plugins";
import type { UserWithRole } from "better-auth/plugins/admin";
import { customSession } from "better-auth/plugins/custom-session";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { accounts, auditLogs, db, eq, sessions, users, verificationTokens } from "@mma/db";
import * as schema from "@mma/db/schema";
import { passwordResetExpirySeconds, sendPasswordResetEmail } from "@mma/mailer";
import { generateUniqueSlug } from "@mma/shared";
import { z } from "zod";

import { credentialAccountIssuer } from "./account-issuer";
import { createPhoneOtpPlugin, phoneOtpCooldownHook } from "./phone-otp";
import { enforceDeviceLimit, recordDevice } from "./single-device";

const authEnvSchema = z.object({
  APP_URL: z.url().default("https://mehedismathacademy.com"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  /** Comma-separated extra origins to trust. Development only — see below. */
  DEV_TRUSTED_ORIGINS: z.string().default(""),
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
  "mma://",
  // A phone or emulator running the mobile app reaches this machine by its LAN
  // address, never by `localhost` — that name resolves to the handset itself.
  // React Native's fetch sends no `Origin` header either, so Better Auth falls
  // back to the request's own host and rejects `http://192.168.x.x:3000` with
  // "Missing or null Origin". Listing the machine's address here is what lets
  // a device sign in against a dev server. Development only: the parse below
  // drops the whole list outside it, so a stray value in a production
  // environment cannot widen what the deployed server trusts.
  ...(process.env.NODE_ENV === "development"
    ? parsedAuthEnv.DEV_TRUSTED_ORIGINS.split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [])
];

const isGoogleConfigured =
  parsedAuthEnv.GOOGLE_CLIENT_ID !== "replace-me" &&
  parsedAuthEnv.GOOGLE_CLIENT_SECRET !== "replace-me";
const isDevelopment = process.env.NODE_ENV === "development";

interface AuthUserFields extends UserWithRole {
  profileCompleted?: boolean;
  isActive?: boolean;
}

// Login/logout land in the audit trail too, but this package has no access to
// the API's AuditLogService/container -- it already talks to the database
// directly (see `database: drizzleAdapter(db, ...)` below), so these hooks do
// the same. Never let a logging failure block an auth flow.
async function recordAuthAuditEvent(action: "session.created" | "session.deleted", userId: string): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      action,
      actorId: userId,
      entityId: userId,
      entityType: "user"
    });
  } catch (writeError) {
    console.error("Failed to write auth audit log entry", writeError);
  }
}

async function createUniqueUserSlug(name: string): Promise<string> {
  return generateUniqueSlug(name, async (candidate) => {
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.slug, candidate))
      .limit(1);

    return existingUser.length > 0;
  });
}

export { credentialAccountIssuer };

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
          clientSecret: parsedAuthEnv.GOOGLE_CLIENT_SECRET,
          // "Continue with Google" on the sign-in screen means sign in. Without
          // this it also means sign up, silently, so somebody typing the wrong
          // Google address gets a brand new empty account instead of being
          // told their account is not this one. The sign-up screen asks for the
          // account explicitly, with `requestSignUp`.
          disableImplicitSignUp: true
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
      },
      // The administrator's override on the device limit. `input: false` for
      // the same reason `isActive` is -- it is a decision made about an
      // account, never one the account makes about itself.
      multiDeviceAllowed: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false
      }
    }
  },
  session: {
    modelName: "sessions",
    additionalFields: {
      // Written by the device guard, never by a client: the header is read in
      // the hook and the column is set from there.
      deviceId: {
        type: "string",
        required: false,
        input: false
      }
    }
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
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              slug: await createUniqueUserSlug(typeof user.name === "string" ? user.name : "")
            }
          };
        }
      }
    },
    session: {
      create: {
        // The device limit lives here rather than in a request middleware:
        // this is the one place every way in goes through, and refusing a
        // session is the only refusal that cannot be worked around by
        // replaying a cookie. ADR-0019.
        before: async (session, context) => enforceDeviceLimit(session, context),
        after: async (session, context) => {
          await recordDevice(session, context);
          await recordAuthAuditEvent("session.created", session.userId);
        }
      },
      delete: {
        after: async (session) => {
          await recordAuthAuditEvent("session.deleted", session.userId);
        }
      }
    }
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
    })
  ]
});

export type AuthSessionPayload = typeof auth.$Infer.Session;
export type AuthUser = AuthSessionPayload["user"];
export type AuthSession = AuthSessionPayload["session"];

export async function createPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}

/**
 * Confirms a password against a stored hash. Used to make an admin prove who
 * they are before minting another admin — a hijacked session should not be
 * enough on its own. ADR-0002.
 */
export async function verifyPasswordHash(input: {
  hash: string;
  password: string;
}): Promise<boolean> {
  try {
    return await verifyPassword({ hash: input.hash, password: input.password });
  } catch {
    // A malformed stored hash throws rather than returning false. Fail closed:
    // a corrupt credential is a failed confirmation, not a 500 on an auth path.
    return false;
  }
}
