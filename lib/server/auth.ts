import "server-only";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { deleteUploadsForUser } from "./analyses";
import { db } from "./db";
import * as schema from "./db/schema";
import { passwordResetEmail, sendEmail } from "./email";

// OAuth providers are optional: each one turns on when its credentials are set.
const socialProviders: BetterAuthOptions["socialProviders"] = {};
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  socialProviders.github = {
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
  };
}
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    prompt: "select_account",
  };
}

export type SocialProvider = "github" | "google";
export const enabledSocialProviders = Object.keys(socialProviders) as SocialProvider[];

/**
 * BETTER_AUTH_URL wins when set. Otherwise the base URL comes from the request,
 * limited to localhost and this deployment's Vercel URLs (production, branch and
 * preview), so preview deployments work without extra configuration.
 */
function baseURL(): BetterAuthOptions["baseURL"] {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  const vercelHosts = [
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_URL,
  ].filter((host): host is string => Boolean(host));
  return {
    allowedHosts: ["localhost:*", "127.0.0.1:*", ...vercelHosts],
    fallback: vercelHosts[0] ? `https://${vercelHosts[0]}` : "http://localhost:3000",
  };
}

export const auth = betterAuth({
  appName: "AI Gym Coach",
  baseURL: baseURL(),
  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({ to: user.email, ...passwordResetEmail(user.name, url) });
    },
  },
  socialProviders,
  account: {
    // Signing in with GitHub/Google using the same verified email links to the existing account.
    accountLinking: { enabled: true, trustedProviders: ["github", "google"] },
  },

  session: {
    // Cache the session in a signed cookie for 5 minutes so most page loads skip the database.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  user: {
    deleteUser: {
      enabled: true,
      // Analyses are removed by the foreign key cascade; also delete any video still on Gemini.
      beforeDelete: async (user) => {
        await deleteUploadsForUser(user.id);
      },
    },
  },

  // Stored in Postgres because serverless instances don't share memory.
  // Better Auth enables rate limiting in production only; end-to-end tests,
  // which sign up many users from one IP, turn it off explicitly.
  rateLimit: {
    ...(process.env.DISABLE_AUTH_RATE_LIMIT === "true" ? { enabled: false } : {}),
    storage: "database",
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/request-password-reset": { window: 60 * 60, max: 3 },
      "/change-password": { window: 60, max: 5 },
      "/delete-user": { window: 60, max: 5 },
    },
  },

  // Must be last: lets server actions that call auth.api set cookies.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
export type SessionUser = Session["user"];
