export interface HelloInput {
  name: string;
}

export interface HelloOutput {
  greeting: string;
}

export interface ProofData {
  proof: Uint8Array;
  publicInputs: Uint8Array[];
  output: HelloOutput;
}

export interface SolanaTransaction {
  signature: string;
  blockhash: string;
}