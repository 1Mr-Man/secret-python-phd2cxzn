import { describe, expect, it } from "vitest";
import { createElement } from "./Element.js";
import { binaryComposition, classifySystem, pureElement, systemLabel, validateComposition } from "./Material.js";

const Au = createElement("Au", "Gold", 79);
const Cu = createElement("Cu", "Copper", 29);

describe("validateComposition", () => {
  it("accepts a valid binary mole-fraction composition", () => {
    const result = validateComposition(binaryComposition(Au, 0.3, Cu, 0.7));
    expect(result.valid).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it("accepts a pure element composition (fraction = 1)", () => {
    const result = validateComposition(pureElement(Au));
    expect(result.valid).toBe(true);
  });

  it("rejects an empty composition", () => {
    const result = validateComposition({ basis: "mole_fraction", components: [] });
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe("INVALID_COMPOSITION");
  });

  it("rejects a negative mole fraction", () => {
    const result = validateComposition(binaryComposition(Au, -0.1, Cu, 1.1));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("must not be negative"))).toBe(true);
  });

  it("rejects fractions that do not sum to 1", () => {
    const result = validateComposition(binaryComposition(Au, 0.3, Cu, 0.3));
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("must sum to 1"))).toBe(true);
  });

  it("rejects a duplicated element", () => {
    const result = validateComposition({
      basis: "mole_fraction",
      components: [
        { element: Au, fraction: 0.5 },
        { element: Au, fraction: 0.5 },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("more than once"))).toBe(true);
  });

  it("rejects a non-finite fraction with a meaningful message", () => {
    const result = validateComposition(binaryComposition(Au, Number.NaN, Cu, 0.5));
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.message).toContain("Au");
    expect(result.issues[0]?.message).toContain("finite number");
  });
});

describe("classifySystem", () => {
  it("classifies pure, binary, ternary, and multicomponent systems", () => {
    expect(classifySystem(pureElement(Au))).toBe("pure");
    expect(classifySystem(binaryComposition(Au, 0.5, Cu, 0.5))).toBe("binary");
    expect(
      classifySystem({
        basis: "mole_fraction",
        components: [
          { element: Au, fraction: 0.34 },
          { element: Cu, fraction: 0.33 },
          { element: createElement("Ag", "Silver", 47), fraction: 0.33 },
        ],
      }),
    ).toBe("ternary");
    expect(
      classifySystem({
        basis: "mole_fraction",
        components: [
          { element: Au, fraction: 0.25 },
          { element: Cu, fraction: 0.25 },
          { element: createElement("Ag", "Silver", 47), fraction: 0.25 },
          { element: createElement("Pt", "Platinum", 78), fraction: 0.25 },
        ],
      }),
    ).toBe("multicomponent");
  });
});

describe("systemLabel", () => {
  it("joins element symbols in component order", () => {
    expect(systemLabel(binaryComposition(Au, 0.5, Cu, 0.5))).toBe("Au-Cu");
    expect(systemLabel(binaryComposition(Cu, 0.5, Au, 0.5))).toBe("Cu-Au");
  });

  it("works for a pure element", () => {
    expect(systemLabel(pureElement(Au))).toBe("Au");
  });
});
