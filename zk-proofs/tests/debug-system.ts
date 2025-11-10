// Debug system to understand validation issues
import { CoreMoneroCrypto } from '../src/core-monero-crypto';

const crypto = new CoreMoneroCrypto();

const testData = {
  txHash: '5caae835b751a5ab243b455ad05c489cb9a06d8444ab2e8d3a9d8ef905c1439a',
  txSecret: '4cbf8f2cfb622ee126f08df053e99b96aa2e8c1cfd575d2a651f3343b465800a',
  amount: BigInt(20000000000),
  destination: '53Kajgo3GhV1ddabJZqdmESkXXoz2xD2gUCVc5L2YKjq8Qhx6UXoqFChhF9n2Th9NLTz77258PMdc3G5qxVd487pFZzzVNG',
  blockHeight: 1934116
};

console.log('Debug validation:');
console.log('txHash:', testData.txHash, 'length:', testData.txHash.length);
console.log('txSecret:', testData.txSecret, 'length:', testData.txSecret.length);
console.log('destination:', testData.destination, 'length:', testData.destination.length);

// Manual validation checks
const hashValid = /^[a-fA-F0-9]{64}$/.test(testData.txHash) && testData.txHash.length === 64;
const secretValid = testData.txSecret.length >= 64;
const destinationValid = testData.destination.length >= 93 && testData.destination.length <= 97;
const amountValid = testData.amount >= 0;

console.log('validation results:');
console.log('hashValid:', hashValid);
console.log('secretValid:', secretValid);
console.log('destinationValid:', destinationValid);
console.log('amountValid:', amountValid);

const result = crypto.validateTransaction(testData);
console.log('final result:', result);