import { describe, expect, it } from "vitest";
import { validateConditions } from "./Conditions.js";

describe("validateConditions", () => {
  it("accepts conditions with all required keys present", () => {
    const result = validateConditions({ temperatureK: 1550 }, ["temperatureK"]);
    expect(result.valid).toBe(true);
  });

  it("reports a missing required condition", () => {
    const result = validateConditions({}, ["temperatureK"]);
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("INVALID_CONDITION");
    expect(result.issues[0]?.message).toContain("temperatureK");
  });

  it("rejects a non-positive temperature", () => {
    const result = validateConditions({ temperatureK: 0 });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("greater than 0"))).toBe(true);
  });

  it("rejects a negative pressure", () => {
    const result = validateConditions({ pressurePa: -5 });
    expect(result.valid).toBe(false);
  });

  it("does not require conditions it was not told to require", () => {
    const result = validateConditions({});
    expect(result.valid).toBe(true);
  });
});
