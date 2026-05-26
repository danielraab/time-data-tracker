import { afterEach, describe, expect, it, vi } from "vitest";

const betterAuth = vi.fn(() => ({ api: {}, $context: Promise.resolve({}) }));
const database = vi.fn(function MockDatabase() {
  return {};
});
const createTransport = vi.fn(() => ({ sendMail: vi.fn() }));
const magicLink = vi.fn(() => ({ id: "magic-link" }));
const genericOAuth = vi.fn(() => ({ id: "generic-oauth" }));

vi.mock("better-auth", () => ({
  betterAuth,
}));

vi.mock("better-sqlite3", () => ({
  default: database,
}));

vi.mock("better-auth/plugins", () => ({
  magicLink,
  genericOAuth,
}));

vi.mock("nodemailer", () => ({
  default: {
    createTransport,
  },
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.BETTER_AUTH_SECRET;
});

describe("getAuth", () => {
  it("does not initialize better auth during module import", async () => {
    await import("./auth");

    expect(betterAuth).not.toHaveBeenCalled();
    expect(database).not.toHaveBeenCalled();
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("initializes and caches the auth instance on demand", async () => {
    process.env.BETTER_AUTH_SECRET = "test-secret";

    const { getAuth } = await import("./auth");
    const auth = getAuth();

    expect(auth).toBe(getAuth());
    expect(betterAuth).toHaveBeenCalledTimes(1);
    expect(database).toHaveBeenCalledTimes(1);
    expect(createTransport).toHaveBeenCalledTimes(1);
  });
});
