import { describe, it, expect } from "vitest";
import { userDbName } from "./couch";

describe("userDbName", () => {
  it("prefixes with tidatra_", () => {
    expect(userDbName("abc")).toBe("tidatra_abc");
  });

  it("lowercases the user id", () => {
    expect(userDbName("UserABC")).toBe("tidatra_userabc");
  });

  it("replaces non-alphanumeric characters with underscores", () => {
    // UUIDs contain hyphens
    expect(userDbName("a1b2c3-d4e5")).toBe("tidatra_a1b2c3_d4e5");
  });

  it("produces a valid name for a typical UUID user id", () => {
    const name = userDbName("550e8400-e29b-41d4-a716-446655440000");
    expect(name).toMatch(/^tidatra_[a-z0-9_]+$/);
  });
});
