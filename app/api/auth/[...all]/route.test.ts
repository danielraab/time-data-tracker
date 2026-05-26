import { afterEach, describe, expect, it, vi } from "vitest";

const getAuth = vi.fn(() => ({ id: "auth" }));
const get = vi.fn(async () => new Response("ok"));
const post = vi.fn(async () => new Response("ok"));
const toNextJsHandler = vi.fn(() => ({
  GET: get,
  POST: post,
}));

vi.mock("@/lib/auth", () => ({
  getAuth,
}));

vi.mock("better-auth/next-js", () => ({
  toNextJsHandler,
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

describe("auth route handler", () => {
  it("does not initialize auth during module import", async () => {
    await import("./route");

    expect(getAuth).not.toHaveBeenCalled();
    expect(toNextJsHandler).not.toHaveBeenCalled();
  });

  it("initializes auth when handling requests", async () => {
    const { GET, POST } = await import("./route");
    const request = new Request("http://localhost/api/auth/session");

    await GET(request);
    await POST(request);

    expect(getAuth).toHaveBeenCalledTimes(2);
    expect(toNextJsHandler).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenCalledWith(request);
    expect(post).toHaveBeenCalledWith(request);
  });
});
