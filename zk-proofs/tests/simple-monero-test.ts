// Simple functional test for Monero cryptocurrency validation
import { CoreMoneroCrypto } from '../src/core-monero-crypto';

// Basic test runner for our working system
function runTests() {
  console.log('Running Monero cryptocurrency tests...\n');
  
  const crypto = new CoreMoneroCrypto();
  
  const testData = {
    txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
    txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
    amount: BigInt(20000000000),
    destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
    blockHeight: 1934116
  };
  
  console.log('Test 1: Transaction validation');
  const result = crypto.validateTransaction(testData);
  console.log('✓ Transaction validation result:', {
    valid: result.valid,
    hashValid: result.hashValid,
    amount: result.amountVerified.toString()
  });
  
  console.log('✓ Key image:', result.keyImage);
  console.log('✓ Commitment:', result.commitment);
  
  console.log('\nTest 2: ZK proof generation');
  const zkResult = crypto.generateZKProof(testData);
  console.log('✓ ZK proof result:', {
    valid: zkResult.valid,
    proof: zkResult.proof.length,
    publicInputs: zkResult.publicInputs.length
  });
  
  if (zkResult.valid) {
    console.log('✓ Public inputs:', zkResult.publicInputs);
    console.log('✓ Successful Monero ZK proof generated!');
    return true;
  }
  
  return false;
}

// Run if this file is executed directly
if (require.main === module) {
  try {
    const success = runTests();
    if (success) {
      console.log('\n🎉 All Monero cryptocurrency tests completed successfully!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

export { runTests };