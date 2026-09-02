import { createLocalAccountIssuer } from "@better-auth/core/db";

/**
 * The issuer Better Auth stores on an email/password account.
 *
 * `accounts.issuer` records who vouched for an identity. An OAuth provider
 * publishes its own -- Google's is `https://accounts.google.com` -- but a
 * password is proved by us, so Better Auth mints a synthetic one instead.
 * Sign-in, password reset and `findCredentialAccount` all match on this exact
 * string, so a row we write ourselves has to carry the same value the library
 * would have written; anything else is an account nobody can sign in to.
 */
export const credentialAccountIssuer = createLocalAccountIssuer("credential");
