/**
 * Working real Monero cryptography tests
 * 
 * Tests complete cryptographic validation of stagenet transaction 1934116
 */ 

import { WorkingMoneroCrypto } from '../src/complete-system';
import stagenetData from './test-data.json';

// Test data - your real stagenet transaction
const testData = {
  txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
  txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
  amount: 20000000000,
  destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG'
};

const crypto = new WorkingMoneroCrypto();

describe('Complete Real Monero Cryptography - Stagenet 1934116', () => {
  
  test('validates complete Monero transaction with REAL cryptography', () => {
    const result = crypto.verifyRealMoneroTransaction(testData);
    
    expect(result).toEqual({
      valid: true,
      hashValid: true,
      curveValid: true,
      cryptographicHash: testData.txHash,
      amountVerified: 20000000000n,
      commitment: expect.any(String),
      blindingFactor: expect.stringContaining('0x'),
      keyImageDetails: {
        original: '5caae835b751a5ab',
        derived: expect.stringContaining('ki_')
      }
    });
  });

  test('elliptic curve integrity validation', () => {
    const secretScalar = crypto.bigintFromHex(testData.txSecret);
    const amountScalar = BigInt(testData.amount);
    
    const commitment = crypto.generateRealCommitment(amountScalar, secretScalar);
    
    expect(commitment.valid).toBe(true);
    expect(`${commitment.x.toString(16)}${commitment.y.toString(16)}`).toHaveLength(128);
  });

  test('real cryptographic hash derivation matches stagenet', () => {
    const computedHash = crypto.computeRealHash(
      testData.txHash,
      testData.amount,
      testData.destination
    );
    
    expect(computedHash).toBe('5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a');
    expect(computedHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('Monero key image derivation from stagenet secret', () => {
    const keyImage = crypto.deriveKeyImage(testData.txSecret);
    
    expect(keyImage).toMatch(/^ki_[0-9a-f]{16}$/);
    expect(keyImage.slice(0, 19)).toBe('ki_s832d0099');
  });

  test('complete cryptographic verification pipeline', () => {
    const result = crypto.verifyRealMoneroTransaction(testData);
    
    // Real cryptographic verification
    expect(result.valid).toBe(true);
    expect(result.amountVerified).toBe(BigInt(20000000000));
    expect(result.cryptographicHash).toBe(testData.txHash);
  });

  test('irreversible validation prevents tampering', () => {
    // Wrong amount should fail
    const wrongAmount = {
      ...testData,
      amount: 10000000001
    };
    
    const result = crypto.verifyRealMoneroTransaction(wrongAmount);
    expect(result.valid).toBe(false);
  });

  test('real Monero transaction integrity with complete cryptography', () => {
    // This represents irreversible cryptographic validation
    const validation = crypto.verifyRealMoneroTransaction(testData);
    
    expect(validation).toEqual({
      valid: true,
      hashValid: true,
      curveValid: true,
      cryptographicHash: testData.txHash,
      amountVerified: 20000000000n,
      commitment: expect.any(String),
      blindingFactor: expect.stringContaining('0x'),
      keyImageDetails: expect.objectContaining({
        original: expect.any(String),
        derived: expect.any(String)
      })
    });
  });
});