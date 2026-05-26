import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

let authHandlers: ReturnType<typeof toNextJsHandler> | undefined;

function getAuthHandlers() {
  authHandlers ??= toNextJsHandler(getAuth());
  return authHandlers;
}

export async function GET(request: Request) {
  return getAuthHandlers().GET(request);
}

export async function POST(request: Request) {
  return getAuthHandlers().POST(request);
}
