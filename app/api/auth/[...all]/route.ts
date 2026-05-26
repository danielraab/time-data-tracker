import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

let cachedAuthHandlers: ReturnType<typeof toNextJsHandler> | undefined;

function getAuthHandlers() {
  cachedAuthHandlers ??= toNextJsHandler(getAuth());
  return cachedAuthHandlers;
}

export function GET(request: Request) {
  return getAuthHandlers().GET(request);
}

export function POST(request: Request) {
  return getAuthHandlers().POST(request);
}
