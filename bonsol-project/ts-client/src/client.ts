import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { BonsolClient, ExecutionConfig } from '@bonsol/sdk';
import { HelloInput, HelloOutput, ProofData, SolanaTransaction } from './types';
import * as bs58 from 'bs58';

export class HelloProofClient {
  private bonsol: BonsolClient;
  private connection: Connection;
  private payer: Keypair;

  constructor(
    rpcUrl: string,
    payerKeypair: Keypair,
    bonsolProgramId: PublicKey
  ) {
    this.connection = new Connection(rpcUrl);
    this.payer = payerKeypair;
    this.bonsol = new BonsolClient({
      connection: this.connection,
      payer: this.payer,
      bonsolProgramId: bonsolProgramId
    });
  }

  async generateProof(name: string): Promise<ProofData> {
    console.log(`⏳ Generating ZK proof for input: "${name}"`);
    
    const input: HelloInput = { name };
    
    const inputBytes = new TextEncoder().encode(JSON.stringify(input));
    const inputHash = await this.computeInputHash(inputBytes);
    
    const executionConfig: ExecutionConfig = {
      imageId: 'say_hello',
      inputs: [inputBytes],
      executionConfig: {
        fees: 5000,
        tip: 0,
        maxBlockHeight: 0
      },
      signaturePolicy: null,
      inputsCommitments: [inputHash]
    };

    try {
      const { proof, publicInputs, output } = await this.bonsol.execute(executionConfig);
      
      const outputString = new TextDecoder().decode(output[0]);
      const outputData: HelloOutput = JSON.parse(outputString);
      
      console.log(`✅ Proof generated successfully`);
      console.log(`🎯 Output: ${outputData.greeting}`);
      
      return {
        proof,
        publicInputs,
        output: outputData
      };
    } catch (error) {
      console.error('❌ Proof generation failed:', error);
      throw error;
    }
  }

  private async computeInputHash(input: Uint8Array): Promise<string> {
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest('hex');
  }

  async verifyProofOnChain(
    proof: Uint8Array,
    publicInputs: Uint8Array[],
    verifierProgramId: PublicKey
  ): Promise<SolanaTransaction> {
    console.log(`⏳ Submitting proof for on-chain verification...`);
    
    try {
      const transaction = await this.bonsol.submitExecution(proof, publicInputs, verifierProgramId);
      
      console.log(`✅ Proof verified on-chain`);
      console.log(`🔗 Transaction: ${transaction}`);
      
      return {
        signature: transaction,
        blockhash: await this.connection.getLatestBlockhash().then(r => r.blockhash)
      };
    } catch (error) {
      console.error('❌ On-chain verification failed:', error);
      throw error;
    }
  }

  async getVerificationStatus(signature: string): Promise<string> {
    try {
      const tx = await this.connection.getTransaction(signature);
      return tx ? 'confirmed' : 'pending';
    } catch (error) {
      return 'failed';
    }
  }
}