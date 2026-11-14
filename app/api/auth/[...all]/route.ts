import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/server/auth";

// Sign up, sign in, OAuth callbacks, sessions, password reset, account deletion...
export const { GET, POST } = toNextJsHandler(auth);
