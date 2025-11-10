import { createRealMoneroZKProof, verifyRealMoneroZKProof } from '../src/monero-real';
import { testMoneroConnection, validateTransactionWithRealCrypto } from '../src/monero-real';

// Test configuration for stagenet
const stagenetConfig = {
  network: 'stagenet' as const,
  rpcUrl: 'http://stagenet.community.xmr.to:38089'
};

describe('Real Monero Cryptography Tests', () => {
  
  test('should validate real stagenet transaction', async () => {
    const realData = {
      blockHeight: 1934116,
      txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
      txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
      amount: 20000000000,
      destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
      blockHeader: '347fdbca67bf6c7d46839925ccbc87a554b93b32e29166ffee8cece983a753fd'
    };

    const result = await validateTransactionWithRealCrypto(realData);
    
    expect(result.transaction).toBeTruthy();
    expect(result.amountDetails).toBeTruthy();
    expect(result.blockchainValidated).toBe(true);
    expect(result.cryptographicVerified).toBe(true);
    expect(result.valid).toBe(true);
  });

  test('should create real ZK proof', async () => {
    const data = {
      blockHeight: 1934116,
      txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
      txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
      amount: 20000000000,
      destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
      blockHeader: '347fdbca67bf6c7d46839925ccbc87a554b93b32e29166ffee8cece983a753fd'
    };

    const proof = await createRealMoneroZKProof(data);
    
    expect(proof.proofBytes).toBeInstanceOf(Uint8Array);
    expect(proof.publicInputs).toHaveLength(6);
    expect(proof.commitment).toContain('real_');
    
    const verified = await verifyRealMoneroZKProof(proof);
    expect(verified).toBe(true);
  });

  test('should connect to Monero stagenet', async () => {
    const connected = await testMoneroConnection(stagenetConfig.rpcUrl);
    expect(connected).toBe(true);
  });

  test('should fail with invalid transaction', async () => {
    const invalidData = {
      blockHeight: 9999999,
      txSecret: 'invalid-secret-key-invalid-secret-key-invalid-secret-key-inv',
      txHash: 'invalid-transaction-hash-that-does-not-exist-on-blockchain',
      amount: 100000000000,
      destination: 'invalid-destination-address-that-is-garbage-data',
      blockHeader: 'invalid-block-hash-that-does-not-match-anything-real'
    };

    await expect(createRealMoneroZKProof(invalidData)).rejects.toThrow();
  });

  test('should validate amount against blockchain data', async () => {
    const data = {
      blockHeight: 1934116,
      txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
      txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
      amount: 50000000000, // Wrong amount
      destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
      blockHeader: '347fdbca67bf6c7d46839925ccbc87a554b93b32e29166ffee8cece983a753fd'
    };

    await expect(createRealMoneroZKProof(data)).rejects.toThrow('Amount does not match blockchain data');
  });

  test('should validate destination against blockchain data', async () => {
    const data = {
      blockHeight: 1934116,
      txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
      txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
      amount: 20000000000,
      destination: 'invalid-destination-that-does-not-match',
      blockHeader: '347fdbca67bf6c7d46839925ccbc87a554b93b32e29166ffee8cece983a753fd'
    };

    await expect(createRealMoneroZKProof(data)).rejects.toThrow('Destination address not found in transaction');
  });
});