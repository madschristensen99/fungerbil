// Test the basic functionality
const { proveMoneroPayment } = require('./client/proveMoneroPayment');

async function test() {
  try {
    console.log('Testing Monero ZK proof generation...');
    
    // Test with mock data like in the spec
    const result = await proveMoneroPayment(
      'f' + 'a'.repeat(62),  // mock tx key
      'd'.repeat(64),        // mock tx hash
      '4B4AXDKKWB6L23N7R3USU2KYM2WQ5Z4F6S7E8P9Q12R3S4T5U6V7W8X9YZA', // mock address
      1.5                    // 1.5 XMR
    );
    
    console.log('✅ Test passed!');
    console.log('Result structure:', typeof result);
    console.log('Input fields:', Object.keys(result.input));
    
  } catch (error) {
    console.log('❌ Test failed:', error.message);
    console.log('Stack:', error.stack);
  }
}

test();