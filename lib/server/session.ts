// The data access layer for "who is signed in". Pages, server actions and route
// handlers check the session here, close to the data. The proxy only does an
// optimistic redirect based on whether a session cookie exists.
import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/** The current session, or null. Cached for the rest of the request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** The signed-in user; redirects to the sign-in page if there isn't one. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/sign-in");
  return session.user;
}

/** For route handlers: the signed-in user, or null. */
export async function userFromRequest(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user ?? null;
}
