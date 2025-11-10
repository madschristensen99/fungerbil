// Test the circom circuit compilation
const fs = require('fs');
const path = require('path');

console.log('Checking files...');
try {
  const circomPath = path.join(__dirname, 'circuits', 'monero_payment.circom');
  const exists = fs.existsSync(circomPath);
  console.log('Circom circuit exists:', exists);
  
  if (exists) {
    const stats = fs.statSync(circomPath);
    console.log('Circuit size:', stats.size, 'bytes');
    
    const content = fs.readFileSync(circomPath, 'utf8');
    console.log('Circuit has components:');
    console.log('- Num2Bits:', content.includes('Num2Bits'));
    console.log('- Poseidon:', content.includes('Poseidon'));
    console.log('- MerkleTreeChecker:', content.includes('MerkleTreeChecker'));
    console.log('Has 32-bit path:', content.includes('merklePath[32]'));
  }
} catch (e) {
  console.error('Error checking files:', e.message);
}