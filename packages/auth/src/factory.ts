import { betterAuth, type BetterAuthPlugin } from "better-auth";
import { admin } from "better-auth/plugins";
import type { UserWithRole } from "better-auth/plugins/admin";
import { customSession } from "better-auth/plugins/custom-session";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { accounts, db, sessions, users } from "@mma/db";
import * as schema from "@mma/db/schema";
import { z } from "zod";

const authEnvSchema = z.object({
  APP_URL: z.url().default("https://mehedismathacademy.com"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.url().default("http://localhost:3001"),
  GOOGLE_CLIENT_ID: z.string().min(1).default("replace-me"),
  GOOGLE_CLIENT_SECRET: z.string().min(1).default("replace-me")
});

interface AuthUserFields extends UserWithRole {
  profileCompleted?: boolean;
  isActive?: boolean;
}

export const parsedAuthEnv = authEnvSchema.parse(process.env);

export const trustedOrigins = [
  parsedAuthEnv.APP_URL,
  parsedAuthEnv.BETTER_AUTH_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:8081",
  "exp://127.0.0.1:8081"
] as const;

const isGoogleConfigured =
  parsedAuthEnv.GOOGLE_CLIENT_ID !== "replace-me" &&
  parsedAuthEnv.GOOGLE_CLIENT_SECRET !== "replace-me";

export function createAuth(extraPlugins: BetterAuthPlugin[] = []) {
  return betterAuth({
    appName: "Mehedi's Math Academy",
    baseURL: parsedAuthEnv.BETTER_AUTH_URL,
    secret: parsedAuthEnv.BETTER_AUTH_SECRET,
    trustedOrigins: [...trustedOrigins],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        ...schema,
        user: users,
        account: accounts,
        session: sessions,
        verification: schema.verificationTokens
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
      autoSignIn: true
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
      enabled: true,
      window: 15 * 60,
      max: 100,
      customRules: {
        "/sign-in/email": {
          window: 15 * 60,
          max: 5
        },
        "/sign-up/email": {
          window: 15 * 60,
          max: 5
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
      fields: {
        accountId: "provider_account_id",
        password: "password_hash"
      },
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "credential"],
        allowDifferentEmails: false
      }
    },
    verification: {
      modelName: "verification_tokens",
      fields: {
        value: "token"
      }
    },
    plugins: [
      admin({
        defaultRole: "STUDENT",
        adminRoles: ["ADMIN"]
      }),
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
      ...extraPlugins
    ]
  });
}
