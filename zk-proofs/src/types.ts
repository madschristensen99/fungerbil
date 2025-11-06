export interface MoneroZKData {
  blockHeight: number;
  txSecret: string;      // 64 hex characters (32 bytes)
  txHash: string;        // 64 hex characters (32 bytes)
  amount: number;        // Atomic units (piconero)
  destination: string;   // Monero address (95 chars for stagenet)
  blockHeader: string;   // 32 bytes hex
}

export interface ZKProof {
  proofBytes: Uint8Array;
  publicInputs: string[];
  commitment: string;
}

export interface VerificationResult {
  valid: boolean;
  error?: string;
}