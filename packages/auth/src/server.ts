import { betterAuth } from "better-auth";
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { admin, oneTimeToken } from "better-auth/plugins";
import type { UserWithRole } from "better-auth/plugins/admin";
import { customSession } from "better-auth/plugins/custom-session";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { accounts, auditLogs, db, eq, sessions, users, verificationTokens } from "@genex/db";
import * as schema from "@genex/db/schema";
import { generateUniqueSlug } from "@genex/shared";
import { z } from "zod";

const authEnvSchema = z.object({
  APP_URL: z.url().default("https://genex.com.bd"),
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
  "genex://"
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

export const auth = betterAuth({
  appName: "Genex",
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
    enabled: !isDevelopment,
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
    },
    session: {
      create: {
        after: async (session) => {
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
