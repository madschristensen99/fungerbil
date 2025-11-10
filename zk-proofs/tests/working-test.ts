// Working Monero cryptocurrency test
import { CoreMoneroCrypto } from '../src/core-monero-crypto';

console.log('\n🚀 Running Monero Cryptocurrency Tests\n');

const crypto = new CoreMoneroCrypto();

// Test 1: Basic functionality
const test1Data = {
  txHash: 'a'.repeat(64),  // 64 'a's
  txSecret: 'b'.repeat(64), // 64 'b's
  amount: BigInt(20000000000),
  destination: 'c'.repeat(95), // 95 'c's
  blockHeight: 1934116
};

console.log('Test 1: Basic transaction validation...');
try {
  const result1 = crypto.validateTransaction(test1Data);
  console.log('   Result 1:', {
    valid: result1.valid,
    hashValid: result1.hashValid,
    amount: result1.amountVerified.toString(),
    keyImageLen: result1.keyImage.length,
    commitLen: result1.commitment.length
  });
} catch (error) {
  console.error('Test 1 failed:', error);
}

// Test 2: Real stagenet data
const stagenetData = {
  txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
  txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
  amount: BigInt(20000000000),
  destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
  blockHeight: 1934116
};

console.log('\nTest 2: Real stagenet transaction...');
try {
  const result2 = crypto.validateTransaction(stagenetData);
  console.log('   Result 2:', {
    valid: result2.valid,
    hashValid: result2.hashValid,
    amount: result2.amountVerified.toString(),
    keyImage: result2.keyImage.substring(0, 20) + '...',
    commitment: result2.commitment.substring(0, 20) + '...'
  });
} catch (error) {
  console.error('Test 2 failed:', error);
}

// Test 3: ZK proof generation
console.log('\nTest 3: ZK proof generation...');
try {
  const zkResult = crypto.generateZKProof(stagenetData);
  console.log('   ZK Proof:', {
    valid: zkResult.valid,
    proof: zkResult.proof.substring(0, 20) + '...',
    publicInputs: zkResult.publicInputs.length
  });
} catch (error) {
  console.error('Test 3 failed:', error);
}

console.log('\n✅ Monero cryptocurrency tests completed!');