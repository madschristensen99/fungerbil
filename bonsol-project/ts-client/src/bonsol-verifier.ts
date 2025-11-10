import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { BonsolVerifier } from './types/bonsol_verifier';
import { PublicKey, Connection } from '@solana/web3.js';

export class BonsolVerifyClient {
  private program: Program<BonsolVerifier>;
  private connection: Connection;

  constructor(
    programId: PublicKey,
    provider: anchor.AnchorProvider
  ) {
    this.connection = provider.connection;
    this.program = new Program(
      require('./idl/bonsol_verifier.json'),
      programId,
      provider
    );
  }

  async verifyHelloProof(
    proof: Uint8Array,
    publicInputs: Uint8Array[],
    expectedName: string,
    expectedGreeting: string,
    signer: PublicKey
  ) {
    const [verifiedGreetingPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('greeting'), signer.toBuffer()],
      this.program.programId
    );

    return await this.program.methods
      .verifyHelloProof(
        Array.from(proof),
        publicInputs.map(input => Array.from(input)),
        expectedName,
        expectedGreeting
      )
      .accounts({
        signer,
        verifiedGreeting: verifiedGreetingPDA,
        executionInfo: PublicKey.default(), // Set by bonsol
        bonsolProgram: new PublicKey('BoNs11111111111111111111111111111111111111'), // Actual bonsol program ID
      })
      .rpc();
  }

  async getVerifiedGreeting(verifier: PublicKey) {
    const [verifiedGreetingPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('greeting'), verifier.toBuffer()],
      this.program.programId
    );

    return await this.program.account
      .greetingAccount
      .fetch(verifiedGreetingPDA);
  }
}