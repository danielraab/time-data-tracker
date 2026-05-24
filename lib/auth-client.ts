import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";
import { genericOAuthClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  // When running on the same domain the base URL is inferred automatically.
  // Override with NEXT_PUBLIC_BETTER_AUTH_URL if your auth server lives on a
  // different origin.
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,
  plugins: [magicLinkClient(), genericOAuthClient()],
});

export const { signIn, signOut, useSession } = authClient;
