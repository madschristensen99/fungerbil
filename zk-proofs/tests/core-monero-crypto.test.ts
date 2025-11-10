// Complete Monero cryptocurrency tests - refactored
import { CoreMoneroCrypto } from '../src/core-monero-crypto';

describe('Core Monero Cryptography Tests', () => {
  let crypto: CoreMoneroCrypto;

  beforeEach(() => {
    crypto = new CoreMoneroCrypto();
  });

  describe('Transaction validation', () => {
    const validStagenetData = {
      txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
      txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
      amount: BigInt(20000000000), // 0.02 XMR in piconero
      destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
      blockHeight: 1934116
    };

    test('should validate basic transaction format', () => {
      const result = crypto.validateTransaction(validStagenetData);
      
      expect(result.valid).toBe(true);
      expect(result.hashValid).toBe(true);
      expect(result.amountVerified).toBe(BigInt(20000000000));
    });

    test('should generate valid key image', () => {
      const result = crypto.validateTransaction(validStagenetData);
      
      expect(result.keyImage).toMatch(/^ki_[a-f0-9]{64}$/);
      expect(result.keyImage.length).toBe(67); // 'ki_' + 64 hex chars
    });

    test('should create valid Pedersen commitment', () => {
      const result = crypto.validateTransaction(validStagenetData);
      
      expect(result.commitment).toMatch(/^c_[a-f0-9]{64}$/);
    });

    test('should fail on invalid transaction hash format', () => {
      const invalidData = {
        ...validStagenetData,
        txHash: 'invalid-format' // Not 64 hex chars
      };
      
      const result = crypto.validateTransaction(invalidData);
      
      expect(result.valid).toBe(false);
      expect(result.hashValid).toBe(false);
    });

    test('should handle zero amount', () => {
      const zeroAmountData = {
        ...validStagenetData,
        amount: BigInt(0)
      };
      
      const result = crypto.validateTransaction(zeroAmountData);
      
      expect(result.valid).toBe(true);
      expect(result.amountVerified).toBe(BigInt(0));
    });

    test('should handle large amount', () => {
      const largeAmountData = {
        ...validStagenetData,
        amount: BigInt('1000000000000000') // 1000 XMR
      };
      
      const result = crypto.validateTransaction(largeAmountData);
      
      expect(result.valid).toBe(true);
      expect(result.amountVerified).toBe(BigInt('1000000000000000'));
    });
  });

  describe('ZK proof generation', () => {
    const testData = {
      txHash: '6f7e3c9a7b9f8e1c2d3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
      txSecret: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      amount: BigInt(100000000000), // 0.1 XMR
      destination: '9tC6DnCradern9b58cLTMkGKmb7FEsMcTfvGRBdQrzFa1WKA6Byqf1wGqjR5nvL1KVf5JRNzesLSfPtQDVgAFYfNNcMgGZM',
      blockHeight: 1934120
    };

    test('should generate valid ZK proof', () => {
      const result = crypto.generateZKProof(testData);
      
      expect(result.valid).toBe(true);
      expect(result.proof).toMatch(/^zk_[a-f0-9]{64}$/);
      expect(result.publicInputs).toHaveLength(5);
      expect(result.commitment).toMatch(/^c_[a-f0-9]{64}$/);
    });

    test('should fail gracefully on invalid hex input', () => {
      const invalidHexData = {
        ...testData,
        txSecret: 'invalid-hex-chars-not-valid'
      };
      
      const result = crypto.generateZKProof(invalidHexData);
      
      expect(result.valid).toBe(false);
    });

    test('should generate consistent proofs for same data', () => {
      const result1 = crypto.generateZKProof(testData);
      const result2 = crypto.generateZKProof(testData);
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
      expect(result1.proof).toBe(result2.proof);
      expect(result1.commitment).toBe(result2.commitment);
    });
  });
  
  describe('Real stagenet integration', () => {
    const stagenetData = {
      txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
      txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
      amount: BigInt(20000000000),
      destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
      blockHeight: 1934116
    };

    test('should validate real stagenet transaction 1934116', () => {
      const result = crypto.validateTransaction(stagenetData);
      
      expect(result.valid).toBe(true);
      expect(result.amountVerified).toBe(BigInt(20000000000));
      expect(result.hashValid).toBe(true);
    });

    test('should create ZK proof for stagenet transaction', () => {
      const result = crypto.generateZKProof(stagenetData);
      
      expect(result.valid).toBe(true);
      
      const publicInputs = result.publicInputs;
      expect(publicInputs[0]).toBe(stagenetData.txHash);
      expect(publicInputs[1]).toBe(stagenetData.destination);
      expect(publicInputs[2]).toBe('1934116');
      expect(publicInputs[3]).toBe('20000000000');
    });
  });
});