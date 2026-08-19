import { describe, expect, it } from "vitest";
import { createElement } from "./Element.js";
import { binaryComposition, ternaryComposition } from "./Material.js";
import { canonicalizeSystemLabel, identifySystem } from "./SystemIdentity.js";

const Au = createElement("Au", "Gold", 79);
const Cu = createElement("Cu", "Copper", 29);
const Ni = createElement("Ni", "Nickel", 28);
const Fe = createElement("Fe", "Iron", 26);
const Cr = createElement("Cr", "Chromium", 24);

describe("canonicalizeSystemLabel", () => {
  it("sorts dash-separated symbols alphabetically", () => {
    expect(canonicalizeSystemLabel("Cu-Au")).toBe("Au-Cu");
    expect(canonicalizeSystemLabel("Au-Cu")).toBe("Au-Cu");
  });

  it("generalizes to three or more components", () => {
    expect(canonicalizeSystemLabel("Ni-Fe-Cr")).toBe("Cr-Fe-Ni");
    expect(canonicalizeSystemLabel("Fe-Ni-Cr")).toBe("Cr-Fe-Ni");
    expect(canonicalizeSystemLabel("Cr-Fe-Ni")).toBe("Cr-Fe-Ni");
  });
});

describe("identifySystem", () => {
  it("gives Au-Cu and Cu-Au the same canonicalId (reversed pair identity)", () => {
    const auCu = identifySystem(binaryComposition(Au, 0.5, Cu, 0.5));
    const cuAu = identifySystem(binaryComposition(Cu, 0.5, Au, 0.5));

    expect(auCu.canonicalId).toBe("Au-Cu");
    expect(cuAu.canonicalId).toBe("Au-Cu");
    expect(auCu.canonicalId).toBe(cuAu.canonicalId);
  });

  it("preserves input order separately in orderedLabel/orderedSymbols", () => {
    const auCu = identifySystem(binaryComposition(Au, 0.5, Cu, 0.5));
    const cuAu = identifySystem(binaryComposition(Cu, 0.5, Au, 0.5));

    expect(auCu.orderedLabel).toBe("Au-Cu");
    expect(cuAu.orderedLabel).toBe("Cu-Au");
    expect(auCu.orderedSymbols).toEqual(["Au", "Cu"]);
    expect(cuAu.orderedSymbols).toEqual(["Cu", "Au"]);
  });

  it("produces a stable canonical identity for a ternary system regardless of input order", () => {
    const a = identifySystem(ternaryComposition(Au, 0.34, Cu, 0.33, Ni, 0.33));
    const b = identifySystem(ternaryComposition(Ni, 0.33, Au, 0.34, Cu, 0.33));

    expect(a.canonicalId).toBe("Au-Cu-Ni");
    expect(b.canonicalId).toBe("Au-Cu-Ni");
  });

  it("works for Fe-Ni-Cr", () => {
    const identity = identifySystem(ternaryComposition(Fe, 0.34, Ni, 0.33, Cr, 0.33));
    expect(identity.canonicalId).toBe("Cr-Fe-Ni");
    expect(identity.orderedLabel).toBe("Fe-Ni-Cr");
  });
});
