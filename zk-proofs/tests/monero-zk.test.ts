import { describe, expect, test } from '@jest/globals';
import { createMoneroZKProof, verifyMoneroZKProof } from '../src/monero-zk';
import { MoneroZKData } from '../src/types';

describe('Monero ZK Proof System - Failing Tests', () => {
  
  describe('Block Height Validation', () => {
    test('should fail with negative block height', () => {
      const data = createTestData({ blockHeight: -100 });
      expect(() => createMoneroZKProof(data)).toThrow('Block height must be positive');
    });

    test('should fail with zero block height', () => {
      const data = createTestData({ blockHeight: 0 });
      expect(() => createMoneroZKProof(data)).toThrow('Block height must be positive');
    });

    test('should fail with non-numeric block height', () => {
      const data = createTestData({ blockHeight: 'invalid' as any });
      expect(() => createMoneroZKProof(data)).toThrow('Block height must be a valid number');
    });

    test('should fail with block height beyond current stagenet', () => {
      const data = createTestData({ blockHeight: 9999999 });
      expect(() => createMoneroZKProof(data)).toThrow('Block height exceeds stagenet chain');
    });
  });

  describe('Transaction Secret Validation', () => {
    test('should fail with invalid secret length (too short)', () => {
      const data = createTestData({ txSecret: 'deadbeef' });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction secret must be 64 hex characters');
    });

    test('should fail with invalid secret length (too long)', () => {
      const data = createTestData({ txSecret: 'deadbeef'.repeat(9) });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction secret must be 64 hex characters');
    });

    test('should fail with non-hex characters', () => {
      const data = createTestData({ txSecret: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction secret must contain only hex characters');
    });

    test('should fail with empty secret', () => {
      const data = createTestData({ txSecret: '' });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction secret is required');
    });
  });

  describe('Transaction Hash Validation', () => {
    test('should fail with invalid hash length (too short)', () => {
      const data = createTestData({ txHash: 'deadbeef' });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction hash must be 64 hex characters');
    });

    test('should fail with invalid hash length (too long)', () => {
      const data = createTestData({ txHash: 'deadbeef'.repeat(9) });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction hash must be 64 hex characters');
    });

    test('should fail with non-hex characters', () => {
      const data = createTestData({ txHash: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction hash must contain only hex characters');
    });
  });

  describe('Amount Validation', () => {
    test('should fail with negative amount', () => {
      const data = createTestData({ amount: -1000000000000 });
      expect(() => createMoneroZKProof(data)).toThrow('Amount must be positive');
    });

    test('should fail with zero amount', () => {
      const data = createTestData({ amount: 0 });
      expect(() => createMoneroZKProof(data)).toThrow('Amount must be positive');
    });

    test('should fail with amount overflow (>2^64)', () => {
      const data = createTestData({ amount: 18446744073709551616 });
      expect(() => createMoneroZKProof(data)).toThrow('Amount exceeds maximum value');
    });

    test('should fail with non-integer amount', () => {
      const data = createTestData({ amount: 1000000000.5 });
      expect(() => createMoneroZKProof(data)).toThrow('Amount must be an integer');
    });
  });

  describe('Destination Address Validation', () => {
    test('should fail with invalid Monero address format', () => {
      const data = createTestData({ destination: 'invalid_address_format' });
      expect(() => createMoneroZKProof(data)).toThrow('Invalid Monero destination address format');
    });

    test('should fail with address not starting with 9 (stagenet)', () => {
      const data = createTestData({ destination: '4zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' });
      expect(() => createMoneroZKProof(data)).toThrow('Invalid stagenet address: must start with 9');
    });

    test('should fail with address too short', () => {
      const data = createTestData({ destination: '9zzz' });
      expect(() => createMoneroZKProof(data)).toThrow('Invalid Monero address length');
    });

    test('should fail with empty address', () => {
      const data = createTestData({ destination: '' });
      expect(() => createMoneroZKProof(data)).toThrow('Destination address is required');
    });
  });

  describe('Block Header Validation', () => {
    test('should fail with invalid block header format', () => {
      const data = createTestData({ blockHeader: 'invalid_header' });
      expect(() => createMoneroZKProof(data)).toThrow('Invalid block header format');
    });

    test('should fail with block header too short', () => {
      const data = createTestData({ blockHeader: 'abcd' });
      expect(() => createMoneroZKProof(data)).toThrow('Block header must be 32 bytes');
    });

    test('should fail with non-hex block header', () => {
      const data = createTestData({ blockHeader: 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' });
      expect(() => createMoneroZKProof(data)).toThrow('Block header must contain only hex characters');
    });
  });

  describe('Consistency Checks', () => {
    test('should fail when block height does not match block header', () => {
      const data = createTestData({ 
        blockHeight: 1000,
        blockHeader: 'f6e9c0ff328b1f3a50cb9d4ca88e1e24ad45cbbdea4a0bd3f50261f123456789' // Wrong header for height 1000
      });
      expect(() => createMoneroZKProof(data)).toThrow('Block header does not match block height');
    });

    test('should fail when transaction does not exist at claimed block height', () => {
      const data = createTestData({ 
        blockHeight: 1000,
        txHash: 'deadbeef1234567890abcdef1234567890abcdef1234567890abcdef123456' // TX doesn't exist here
      });
      expect(() => createMoneroZKProof(data)).toThrow('Transaction not found at specified block height');
    });
  });

  describe('Proof Verification Tests', () => {
    test('should fail to verify proof with wrong transaction secret', () => {
      const validData = createTestData({});
      const proof = createMoneroZKProof(validData);
      
      const wrongSecret = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(verifyMoneroZKProof(proof, wrongSecret)).toBe(false);
    });

    test('should fail to verify proof with wrong amount', () => {
      const validData = createTestData({});
      const proof = createMoneroZKProof(validData);
      
      const wrongAmount = validData.amount + 1000;
      expect(verifyMoneroZKProof(proof, validData.txSecret, wrongAmount)).toBe(false);
    });

    test('should fail to verify proof with tampered proof data', () => {
      const validData = createTestData({});
      const proof = createMoneroZKProof(validData);
      
      // Tamper with the proof
      proof.proofBytes[0] = (proof.proofBytes[0] + 1) % 256;
      expect(verifyMoneroZKProof(proof)).toBe(false);
    });
  });
});

// Helper function to create test data with overrides
function createTestData(overrides: Partial<MoneroZKData>): MoneroZKData {
  const defaults = {
    blockHeight: 1548635, // Modern stagenet height
    txSecret: '1548635000000000000000000000000000000000000000000000000000000001', // 64 hex chars
    txHash: '6be023ac6982d9b3e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2', // 64 hex chars
    amount: 1000000000000, // 1 XMR in atomic units
    destination: '9tun7VYAVwa9Pqpu2k8HHdqXz6h1bP9FWLQ76dC8hxv3vXkxZVJcvUyMQXu2xhvDkmB4B51sX8dvFm7zWbbzJYm9ABvYwVBnt',
    blockHeader: 'f6e9c0ff328b1f3a50cb9d4ca88e1e24ad45cbbdea4a0bd3f50261f123456789'
  };
  
  return { ...defaults, ...overrides };
}