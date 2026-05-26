import { afterEach, describe, expect, it, vi } from "vitest";

const runMigrations = vi.fn();

vi.mock("./lib/auth", () => ({
  auth: {
    $context: Promise.resolve({
      runMigrations,
    }),
  },
}));

afterEach(() => {
  runMigrations.mockClear();
  delete process.env.NEXT_RUNTIME;
});

describe("instrumentation register", () => {
  it("runs better-auth migrations even when NEXT_RUNTIME is not set", async () => {
    const { register } = await import("./instrumentation");

    await register();

    expect(runMigrations).toHaveBeenCalledTimes(1);
  });
});
