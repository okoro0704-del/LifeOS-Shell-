declare module "snarkjs" {
  export const groth16: {
    verify: (vKey: unknown, publicSignals: string[], proof: unknown) => Promise<boolean>;
    fullProve: (
      input: Record<string, unknown>,
      wasmFile: string | Uint8Array,
      zkeyFile: string | Uint8Array,
    ) => Promise<{ proof: unknown; publicSignals: string[] }>;
  };
}
