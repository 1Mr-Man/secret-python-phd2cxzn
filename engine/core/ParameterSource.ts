/**
 * Where a numeric model parameter (e.g. W, Z) came from. This lives in
 * core/ (not engine/parameters/) because CalculationRequest/Result — core
 * types — reference it directly: every calculation should be able to say
 * whether its parameters were typed in by a user or looked up from a
 * source, per the engine's scientific-traceability requirement.
 */
export type ParameterSourceKind = "user_supplied" | "literature" | "database" | "estimated";

export interface ParameterSource {
  kind: ParameterSourceKind;
  /** Required in practice for "literature"/"database" — never fabricate one. */
  citation?: string;
  note?: string;
}
