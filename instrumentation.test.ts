import { afterEach, describe, expect, it, vi } from "vitest";

const runMigrations = vi.fn();
const getAuth = vi.fn(() => ({
  $context: Promise.resolve({
    runMigrations,
  }),
}));

vi.mock("./lib/auth", () => ({
  getAuth,
}));

afterEach(() => {
  getAuth.mockClear();
  runMigrations.mockClear();
  delete process.env.NEXT_RUNTIME;
  delete process.env.NEXT_PHASE;
});

describe("instrumentation register", () => {
  it("runs better-auth migrations even when NEXT_RUNTIME is not set", async () => {
    const { register } = await import("./instrumentation");

    await register();

    expect(getAuth).toHaveBeenCalledTimes(1);
    expect(runMigrations).toHaveBeenCalledTimes(1);
  });

  it("skips better-auth initialization during production builds", async () => {
    process.env.NEXT_PHASE = "phase-production-build";

    const { register } = await import("./instrumentation");

    await register();

    expect(getAuth).not.toHaveBeenCalled();
    expect(runMigrations).not.toHaveBeenCalled();
  });
});
