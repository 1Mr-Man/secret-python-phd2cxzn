import { beforeEach, describe, expect, it } from "vitest";
import { isEngineError } from "../core/Errors.js";
import { ok } from "../core/Validation.js";
import type { ModelDefinition } from "./ModelDefinition.js";
import { clearRegistry, getModel, listModels, registerModel, resolveModel } from "./registry.js";

function fakeModel(overrides: Partial<ModelDefinition> = {}): ModelDefinition {
  return {
    id: "test.fake-model",
    name: "Fake Model",
    domain: "thermodynamic",
    outputProperties: [],
    requiredInputs: [],
    requiredParameters: [],
    numericalMethod: "closed-form",
    assumptions: [],
    references: [],
    equations: [],
    validate: () => ok(),
    calculate: () => ({ values: {} }),
    ...overrides,
  };
}

describe("model registry", () => {
  beforeEach(() => {
    clearRegistry();
  });

  it("registers and resolves a model by id", () => {
    registerModel(fakeModel());
    const resolved = resolveModel("test.fake-model");
    expect(resolved.name).toBe("Fake Model");
  });

  it("getModel returns undefined for an unknown id instead of throwing", () => {
    expect(getModel("does.not.exist")).toBeUndefined();
  });

  it("resolveModel throws a structured MODEL_NOT_FOUND error for an unknown id", () => {
    try {
      resolveModel("does.not.exist");
      expect.unreachable("resolveModel should have thrown");
    } catch (error) {
      expect(isEngineError(error)).toBe(true);
      if (isEngineError(error)) expect(error.code).toBe("MODEL_NOT_FOUND");
    }
  });

  it("rejects registering two models under the same id", () => {
    registerModel(fakeModel());
    expect(() => registerModel(fakeModel())).toThrow();
  });

  it("lists models, optionally filtered by domain", () => {
    registerModel(fakeModel({ id: "test.a", domain: "thermodynamic" }));
    registerModel(fakeModel({ id: "test.b", domain: "magnetic" }));

    expect(listModels().map((m) => m.id).sort()).toEqual(["test.a", "test.b"]);
    expect(listModels("magnetic").map((m) => m.id)).toEqual(["test.b"]);
  });
});
