import { buildPoseidon } from 'circomlibjs';
import path from 'path';
import fs from 'fs';
import { SnarkCalldata, SolanaProofData } from './solana-bridge';
import { MoneroZKData } from './types';

export class MoneroProofGenerator {
  private poseidon: any;
  private wasmPath: string;
  private zkeyPath: string;

  constructor() {
    this.wasmPath = path.join(__dirname, '../circuits/monero_transaction_js/monero_transaction.wasm');
    this.zkeyPath = path.join(__dirname, '../circuits/monero_transaction_final.zkey');
    
    // Ensure paths exist
    this.setupCircuitPaths();
  }

  private async setupCircuitPaths() {
    // Create directories if they don't exist
    const circuitsDir = path.dirname(this.wasmPath);
    if (!fs.existsSync(circuitsDir)) {
      fs.mkdirSync(circuitsDir, { recursive: true });
    }
  }

  async initialize(): Promise<void> {
    this.poseidon = await buildPoseidon();
  }

  /**
   * Generate proof for Monero stagenet transaction
   * Takes MoneroZKData and produces Solana-compatible proof
   */
  async generateProof(moneroData: MoneroZKData): Promise<SolanaProofData> {
    await this.initialize();

    // Validate inputs
    this.validateMoneroData(moneroData);

    // Convert Monero data to circuit inputs
    const circuitInputs = await this.createCircuitInputs(moneroData);
    
    // Generate proof using snarkjs
    const { proof, publicSignals } = await this.generateGroth16Proof(circuitInputs);
    
    // Convert to Solana-compatible format
    const solanaProof = this.convertProofToSolanaFormat(proof, publicSignals);
    
    return solanaProof;
  }

  /**
   * Create circuit inputs from Monero transaction data
   */
  private async createCircuitInputs(data: MoneroZKData): Promise<CircuitInputs> {
    // Convert string inputs to BigInt for snarkjs
    const txHashBigInt = BigInt('0x' + data.txHash);
    const amountBigInt = BigInt(data.amount);
    const blockHeightBigInt = BigInt(data.blockHeight);
    const txSecretBigInt = BigInt('0x' + data.txSecret);
    
    // Hash destination address to BigInt
    const destinationBuffer = Buffer.from(data.destination);
    const destinationHash = this.poseidon([...destinationBuffer]);
    const destinationBigInt = this.poseidon.F.toObject(destinationHash);
    
    // Create commitment mask for privacy
    const commitmentMask = this.poseidon([
      tx_secretBigInt,
      amountBigInt,
      blockHeightBigInt
    ]);
    const commitmentMaskBigInt = this.poseidon.F.toObject(commitmentMask);

    return {
      public_tx_hash: txHashBigInt,
      public_amount: amountBigInt,
      public_block_height: blockHeightBigInt,
      public_destination: destinationBigInt,
      private_tx_secret: txSecretBigInt,
      private_commitment_mask: commitmentMaskBigInt
    };
  }

  /**
   * Generate Groth16 zero-knowledge proof using snarkjs
   */
  private async generateGroth16Proof(inputs: CircuitInputs) {
    const snarkjs = await import('snarkjs');
    
    // Ensure circuit files exist
    if (!fs.existsSync(this.wasmPath) || !fs.existsSync(this.zkeyPath)) {
      throw new Error(
        'Circuit files not found. Please build circuits first: `npm run build:circuits`'
      );
    }

    console.log('Generating zero-knowledge proof...');
    
    try {
      const { wasmBuffer, zkeyBuffer } = await this.loadCircuitFiles();
      
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        wasmBuffer,
        zkeyBuffer
      );

      console.log('✅ Proof generated successfully');
      return { proof, publicSignals };
    } catch (error) {
      console.error('Proof generation failed:', error);
      throw new Error(`Proof generation failed: ${error.message}`);
    }
  }

  /**
   * Load circuit WASM and proving key files
   */
  private async loadCircuitFiles() {
    try {
      const wasmBuffer = fs.readFileSync(this.wasmPath);
      const zkeyBuffer = fs.readFileSync(this.zkeyPath);
      return { wasmBuffer, zkeyBuffer };
    } catch (error) {
      throw new Error(`Failed to load circuit files: ${error.message}`);
    }
  }

  /**
   * Convert snarkjs proof to Solana-compatible format
   */
  private convertProofToSolanaFormat(proof: any, publicSignals: any[]): SolanaProofData {
    const proofA = this.serializeProofPoint(proof.pi_a.slice(0, 2));
    const proofB = this.serializeProofPoint(proof.pi_b.slice(0, 2));
    const proofC = this.serializeProofPoint(proof.pi_c.slice(0, 2));

    return {
      a: proofA,
      b: proofB,
      c: proofC,
      public_inputs: publicSignals.map((input, index) => ({
        value: input.toString(),
        index: BigInt(index)
      }))
    };
  }

  /**
   * Serialize elliptic curve points for Solana
   * Converts hex strings to compact byte arrays
   */
  private serializeProofPoint(point: string[]): Uint8Array {
    if (point.length !== 2) {
      throw new Error('Invalid proof point format');
    }

    const x = BigInt(point[0]);
    const y = BigInt(point[1]);

    // Serialize as 32-byte arrays (little-endian)
    const buffer = new Uint8Array(64); // 32 + 32 bytes
    
    // Convert BigInt to bytes
    const xBytes = this.bigIntToBytes(x, 32);
    const yBytes = this.bigIntToBytes(y, 32);

    buffer.set(xBytes, 0);
    buffer.set(yBytes, 32);

    return buffer;
  }

  /**
   * Convert BigInt to byte array (little-endian)
   */
  private bigIntToBytes(n: BigInt, length: number): Uint8Array {
    const buffer = new Uint8Array(length);
    let hex = n.toString(16);
    
    // Pad with zeros to ensure correct length
    hex = hex.padStart(length * 2, '0');
    
    for (let i = 0; i < length; i++) {
      const byteIndex = i * 2;
      const byteHex = hex.slice(byteIndex, byteIndex + 2);
      buffer[i] = parseInt(byteHex, 16);
    }
    
    return buffer;
  }

  /**
   * Validate Monero transaction data format
   */
  private validateMoneroData(data: MoneroZKData): void {
    // Block height validation
    if (!Number.isInteger(data.blockHeight) || data.blockHeight <= 0) {
      throw new Error('Block height must be a positive integer');
    }

    // Transaction hash format (64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(data.txHash)) {
      throw new Error('Transaction hash must be 64 hexadecimal characters');
    }

    // Transaction secret format (64 hex chars)
    if (!/^[0-9a-fA-F]{64}$/.test(data.txSecret)) {
      throw new Error('Transaction secret must be 64 hexadecimal characters');
    }

    // Amount validation (positive integer, piconero)
    if (!Number.isInteger(data.amount) || data.amount <= 0) {
      throw new Error('Amount must be a positive integer in piconero');
    }

    // Destination address validation (stagenet)
    if (!/^9[a-zA-Z0-9]{93}$/.test(data.destination)) {
      throw new Error('Destination must be a valid stagenet Monero address (95 chars)');
    }
  }

  /**
   * Generate verification key for Solana program
   */
  async generateVerificationKey(): Promise<Uint8Array> {
    const vkPath = path.join(__dirname, '../circuits/verification_key.json');
    
    if (!fs.existsSync(vkPath)) {
      throw new Error('Verification key not found. Please run `npm run setup:circuits` first.');
    }

    const vkData = JSON.parse(fs.readFileSync(vkPath, 'utf8'));
    
    // Convert verification key to Solana-compatible format
    // This will be used to initialize the Solana program
    return Buffer.from(JSON.stringify(vkData));
  }

  /**
   * Test the proof system with dummy data
   */
  async testWithDummyData(): Promise<SolanaProofData> {
    const dummyData: MoneroZKData = {
      blockHeight: 1548635,
      txSecret: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
      txHash: '7be023ac6982d9b3e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2',
      amount: 1000000000000, // 1 XMR in piconero
      destination: '9tun7VYAVwa9Pqpu2k8HHdqXz6h1bP9FWLQ76dC8hxv3vXkxZVJcvUyMQXu2xhvDkmB4B51sX8dvFm7zWbbzJYm9ABvYwVBnt',
      blockHeader: 'f6e9c0ff328b1f3a50cb9d4ca88e1e24ad45cbbdea4a0bd3f50261f123456789'
    };

    return this.generateProof(dummyData);
  }
}

interface CircuitInputs {
  public_tx_hash: BigInt;
  public_amount: BigInt;
  public_block_height: BigInt;
  public_destination: BigInt;
  private_tx_secret: BigInt;
  private_commitment_mask: BigInt;
}

// Export for external usage
export { MoneroProofGenerator };