const snarkjs = require('snarkjs');
const axios = require('axios');
const WABridge = require('@mymonero/mymonero-monero-client');

console.log('snarkjs loaded:', typeof snarkjs.groth16 !== 'undefined');
console.log('axios loaded:', typeof axios.post !== 'undefined');
console.log('MyMonero loaded:', typeof WABridge !== 'undefined');

async function test() {
  try {
    const core = await WABridge.default({});
    console.log('WABridge initialized successfully');
  } catch (e) {
    console.log('WABridge init failed:', e.message);
  }
}

test();