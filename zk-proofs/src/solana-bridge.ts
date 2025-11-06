import { Connection, PublicKey, Transaction, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { AnchorProvider, Program, AnchorError } from '@coral-xyz/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';

import { IDL } from './idl';
import BN from 'bn.js';

export interface SolanaProofData {
  a: Uint8Array;     // 64 bytes (A point)
  b: Uint8Array;     // 128 bytes (B point)
  c: Uint8Array;     // 64 bytes (C point)
  public_inputs: PublicInput[];
}

export interface PublicInput {
  value: string;     // The actual value (as string)
  index: bigint;     // Field index
}

export interface SnarkCalldata {
  proof: SolanaProofData;
  verification_key: Uint8Array;
  public_inputs: BN[];
}

export class SolanaZKBridge {
  private connection: Connection;
  private program: Program;
  private programId: PublicKey;

  constructor(
    rpcUrl: string,
    programId: string,
    keypair?: any // Keypair can be provided for transactions
  ) {
    this.connection = new Connection(rpcUrl);
    this.programId = new PublicKey(programId);
    
    // Default to devnet if no keypair provided
    const provider = new AnchorProvider(
      this.connection,
      {
        publicKey: new PublicKey("SysvarC1ock11111111111111111111111111111111"),
        signTransaction: () => { throw new Error("Signer required for transactions") },
        signAllTransactions: () => { throw new Error("Signer required for transactions") }
      } as any,
      AnchorProvider.defaultOptions()
    );

    this.program = new Program(IDL, this.programId, provider);
  }

  /**
   * Deploy the verification state account with verification key
   */
  async deployVerificationState(
    verificationKeyData: Uint8Array,
    signer: any
  ): Promise<string> {
    const [verificationAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("verification_state")],
      this.programId
    );

    try {
      const tx = await this.program.methods
        .initialize(verificationKeyData)
        .accounts({
          verificationAccount,
          signer: signer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([signer])
        .transaction();

      const signature = await this.connection.sendTransaction(tx, [signer]);
      await this.connection.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      throw new Error(`Failed to deploy verification state: ${error.message}`);
    }
  }

  /**
   * Verify a Monero zk proof on Solana
   */
  async verifyProof(
    proofData: SolanaProofData,
    signer: any
  ): Promise<string> {
    const [verificationAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("verification_state")],
      this.programId
    );

    // Convert proof data to program format
    const publicInputs = this.convertToSolanaPublicInputs(proofData.public_inputs);

    try {
      const tx = await this.program.methods
        .verifyMoneroProof(
          {
            a: Array.from(proofData.a),
            b: Array.from(proofData.b),
            c: Array.from(proofData.c),
          },
          publicInputs
        )
        .accounts({
          verificationAccount,
          prover: signer.publicKey,
        })
        .signers([signer])
        .transaction();

      const signature = await this.connection.sendTransaction(tx, [signer]);
      await this.connection.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      throw new Error(`Failed to verify proof: ${error.message}`);
    }
  }

  /**
   * Claim tokens after proof verification
   */
  async claimTokens(
    proofData: SolanaProofData,
    recipientTokenAccount: string,
    treasuryTokenAccount: string,
    signer: any
  ): Promise<string> {
    const recipient = new PublicKey(recipientTokenAccount);
    const treasury = new PublicKey(treasuryTokenAccount);
    
    const [programSigner] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      this.programId
    );

    const [verificationAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("verification_state")],
      this.programId
    );

    const publicInputs = this.convertToSolanaPublicInputs(proofData.public_inputs);

    try {
      const tx = await this.program.methods
        .claimFromHedgehogTransfer(
          {
            a: Array.from(proofData.a),
            b: Array.from(proofData.b),
            c: Array.from(proofData.c),
          },
          publicInputs
        )
        .accounts({
          verificationAccount,
          treasury,
          destination: recipient,
          programSigner,
          prover: signer.publicKey,
          tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        })
        .signers([signer])
        .transaction();

      const signature = await this.connection.sendTransaction(tx, [signer]);
      await this.connection.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      throw new Error(`Failed to claim tokens: ${error.message}`);
    }
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<VerificationStats> {
    const [verificationAccount] = PublicKey.findProgramAddressSync(
      [Buffer.from("verification_state")],
      this.programId
    );

    try {
      const account = await this.program.account.verificationAccount.fetch(
        verificationAccount
      );
      
      return {
        validProofCount: account.validProofCount.toNumber(),
        verificationKeyLength: account.verificationKey.length,
      };
    } catch (error) {
      throw new Error(`Failed to get verification stats: ${error.message}`);
    }
  }

  /**
   * Helper method to get token account address
   */
  async getAssociatedTokenAddress(owner: string, mint: string): Promise<string> {
    const ownerKey = new PublicKey(owner);
    const mintKey = new PublicKey(mint);
    
    return (await getAssociatedTokenAddress(mintKey, ownerKey)).toString();
  }

  /**
   * Convert public inputs to Solana format (BN arrays)
   */
  private convertToSolanaPublicInputs(inputs: PublicInput[]): BN[] {
    return inputs.map(input => new BN(input.value));
  }

  /**
   * Build deployment transaction for verification key
   */
  async buildDeploymentTransaction(verificationKeyPath: string, signer: any): Promise<string> {
    const verificationKey = await this.readVerificationKey(verificationKeyPath);
    return this.deployVerificationState(verificationKey, signer);
  }

  /**
   * Read verification key from file
   */
  private async readVerificationKey(verificationKeyPath: string): Promise<Uint8Array> {
    try {
      const fs = require('fs');
      const vkData = JSON.parse(fs.readFileSync(verificationKeyPath, 'utf8'));
      return Buffer.from(JSON.stringify(vkData));
    } catch (error) {
      throw new Error(`Failed to read verification key: ${error.message}`);
    }
  }
}

export interface VerificationStats {
  validProofCount: number;
  verificationKeyLength: number;
}

// Re-export all types
export * from './proof-generator';