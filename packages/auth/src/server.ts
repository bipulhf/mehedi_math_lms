import { betterAuth } from "better-auth";
import { hashPassword } from "better-auth/crypto";
import { admin } from "better-auth/plugins";
import type { UserWithRole } from "better-auth/plugins/admin";
import { customSession } from "better-auth/plugins/custom-session";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { accounts, db, eq, sessions, users, verificationTokens } from "@mma/db";
import * as schema from "@mma/db/schema";
import { generateUniqueSlug } from "@mma/shared";
import { z } from "zod";

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
  "exp://127.0.0.1:8081"
];

const isGoogleConfigured =
  parsedAuthEnv.GOOGLE_CLIENT_ID !== "replace-me" &&
  parsedAuthEnv.GOOGLE_CLIENT_SECRET !== "replace-me";

interface AuthUserFields extends UserWithRole {
  profileCompleted?: boolean;
  isActive?: boolean;
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
    })
  ]
});

export type AuthSessionPayload = typeof auth.$Infer.Session;
export type AuthUser = AuthSessionPayload["user"];
export type AuthSession = AuthSessionPayload["session"];

export async function createPasswordHash(password: string): Promise<string> {
  return hashPassword(password);
}
