import { HelloProofClient } from './client';
import { BonsolVerifyClient } from './bonsol-verifier';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

export class HelloWorldTestRunner {
  private proofClient: HelloProofClient;
  private verifyClient: BonsolVerifyClient;
  private provider: anchor.AnchorProvider;

  constructor(
    rpcUrl: string = 'http://localhost:8899',
    programId: string = 'He11oZK1111111111111111111111111111111111111'
  ) {
    const connection = new Connection(rpcUrl);
    const payer = Keypair.generate();
    
    this.provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(payer),
      anchor.AnchorProvider.defaultOptions()
    );

    this.proofClient = new HelloProofClient(
      rpcUrl,
      payer,
      new PublicKey('BoNs11111111111111111111111111111111111111')
    );

    this.verifyClient = new BonsolVerifyClient(
      new PublicKey(programId),
      this.provider
    );
  }

  async runFullTest(name: string = "World") {
    console.log(`🧪 Starting full test workflow...`);
    
    try {
      // Step 1: Generate proof
      console.log(`\n📊 Step 1: Generate ZK proof`);
      const proofData = await this.proofClient.generateProof(name);
      console.log(`Generated proof for: ${proofData.output.greeting}`);

      // Step 2: Verify on-chain
      console.log(`\n⛓️  Step 2: Submit for on-chain verification`);
      const txSignature = await this.verifyClient.verifyHelloProof(
        proofData.proof,
        proofData.publicInputs,
        name,
        proofData.output.greeting,
        this.provider.publicKey
      );

      console.log(`On-chain verification tx: ${txSignature}`);

      // Step 3: Confirm verification
      console.log(`\n✅ Step 3: Confirm verification`);
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for confirmation

      const verifiedData = await this.verifyClient.getVerifiedGreeting(
        this.provider.publicKey
      );

      console.log(`\n🎯 Verification confirmed:`);
      console.log(`Name: ${verifiedData.name}`);
      console.log(`Greeting: ${verifiedData.greeting}`);
      console.log(`Verified at: ${new Date(verifiedData.verifiedAt.toNumber() * 1000)}`);

      return {
        proofData,
        txSignature,
        verifiedData
      };

    } catch (error) {
      console.error('❌ Test failed:', error);
      throw error;
    }
  }

  async verifyDeployment() {
    console.log(`🔍 Verifying deployment...`);
    
    try {
      const programData = await this.provider.connection.getAccountInfo(
        this.verifyClient.program.programId
      );
      
      if (programData) {
        console.log(`✅ Program deployed: ${this.verifyClient.program.programId}`);
        console.log(`Program size: ${programData.data.length} bytes`);
        return true;
      } else {
        console.log(`❌ Program not found at: ${this.verifyClient.program.programId}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Deployment verification failed:', error);
      return false;
    }
  }
}

// CLI runner
if (require.main === module) {
  const runner = new HelloWorldTestRunner();
  
  const name = process.argv[2] || "Bonsol";
  
  runner.runFullTest(name)
    .then(result => {
      console.log('\n🎉 Full test completed successfully!');
      console.log(JSON.stringify(result, null, 2));
    })
    .catch(console.error);
}