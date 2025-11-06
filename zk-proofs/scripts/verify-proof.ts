#!/usr/bin/env node
import { MoneroProofGenerator } from '../src/proof-generator';
import { SolanaZKBridge } from '../src/solana-bridge';

/**
 * Example script to generate and verify a Monero zk proof
 * This demonstrates the end-to-end flow with your stagenet data
 */

async function main() {
  console.log('🎯 Monero zk Proof Verification Demo\n');

  // Example stagenet transaction data (replace with your real data)
  const moneroData = {
    // You need to replace these with your actual stagenet transaction data
    blockHeight: 1548635,
    txSecret: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd',
    txHash: '7be023ac6982d9b3e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2e5b5a7c8b0a8b3b2',
    amount: 1000000000000, // 1 XMR in piconero
    destination: '9tun7VYAVwa9Pqpu2k8HHdqXz6h1bP9FWLQ76dC8hxv3vXkxZVJcvUyMQXu2xhvDkmB4B51sX8dvFm7zWbbzJYm9ABvYwVBnt',
    blockHeader: 'f6e9c0ff328b1f3a50cb9d4ca88e1e24ad45cbbdea4a0bd3f50261f123456789'
  };

  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'generate':
      await generateProof(moneroData);
      break;
    case 'verify':
      await verifyOnSolana();
      break;
    case 'claim':
      await claimTokens();
      break;
    case 'help':
      showHelp();
      break;
    default:
      promptUser();
      break;
  }
}

async function generateProof(data: any) {
  console.log('📊 Using stagenet data:');
  console.log('  Block Height:', data.blockHeight);
  console.log('  Amount:', (data.amount / 1e12).toFixed(8), 'XMR');
  console.log('  Destination:', data.destination);
  console.log('  Tx Hash:', data.txHash);

  try {
    const generator = new MoneroProofGenerator();
    const result = await generator.generateProof(data);

    console.log('\n✅ Proof generated successfully!\n');
    console.log('Proof data (for Solana):');
    console.log('A:', Buffer.from(result.a).toString('hex'));
    console.log('B:', Buffer.from(result.b).toString('hex'));
    console.log('C:', Buffer.from(result.c).toString('hex'));
    console.log('Public inputs:', result.public_inputs.map(p => p.value));

    // Save to file for later use
    const fs = require('fs');
    const proofData = {
      proof: {
        a: Array.from(result.a),
        b: Array.from(result.b),
        c: Array.from(result.c)
      },
      publicInputs: result.public_inputs.map(p => p.value),
      moneroData: data
    };

    fs.writeFileSync('./proof_data.json', JSON.stringify(proofData, null, 2));
    console.log('\n💾 Proof saved to proof_data.json');

  } catch (error) {
    console.error('❌ Proof generation failed:', error.message);
    console.log('\n💡 Troubleshooting:');
    console.log('1. Ensure circuit files are built (`npm run build:circuits`)');
    console.log('2. Ensure keys are generated (`npm run generate-keys`)');
    console.log('3. Check Monero transaction data format');
    process.exit(1);
  }
}

async function verifyOnSolana() {
  console.log('🔍 Setting up Solana connection...');

  // Example Solana configuration
  const config = {
    rpcUrl: 'http://localhost:8899', // Local validator
    programId: 'MoneroZKProofVer1cumnt11111111111111111111111111'
  };

  try {
    const bridge = new SolanaZKBridge(config.rpcUrl, config.programId);
    
    console.log('🌐 Connected to Solana');
    
    // Check verification stats
    const stats = await bridge.getVerificationStats();
    console.log('📊 Current stats:');
    console.log('  Valid proofs verified:', stats.validProofCount);
    console.log('  Verification key length:', stats.verificationKeyLength);

  } catch (error) {
    console.error('❌ Solana connection failed:', error.message);
    console.log('\n💡 Connect to:');
    console.log('1. Local validator (`npm run start:localnet`)');
    console.log('2. Devnet (for testing)');
    console.log('3. Production RPC');
    process.exit(1);
  }
}

async function claimTokens() {
  // This would be used after proof verification
  console.log('💰 Token claiming would happen here');
  console.log('   - After proof is verified on-chain');
  console.log('   - Requires recipient token account');
  console.log('   - Requires treasury with tokens');
}

function showHelp() {
  console.log('\n💡 Monero zk Proof Commands:');
  console.log('');
  console.log('  npm run verify generate   - Generate proof with current data');
  console.log('  npm run verify verify     - Test Solana connection');
  console.log('  npm run verify claim      - Test token claiming');
  console.log('');
  console.log('📝 Usage Tips:');
  console.log('1. First: npm run setup:circuits');
  console.log('2. Then: Update moneroData with your real stagenet transaction');
  console.log('3. Finally: npm run verify generate');
}

function promptUser() {
  console.log('\n👋 Welcome to Monero zk Proof Verification!');
  console.log('');
  console.log('This tool demonstrates the complete flow:');
  console.log('1. Generate zk proof from Monero stagenet data');
  console.log('2. Verify on Solana blockchain');
  console.log('3. Claim tokens based on proof');
  console.log('');
  console.log('💡 Next steps:');
  console.log('1. Get your real stagenet transaction data');
  console.log('2. Run: npm run setup:circuits');
  console.log('3. Run: npm run verify generate');
  console.log('');
  console.log('For help: npm run verify help');
}

// Example of reading real stagenet data
function readRealData() {
  console.log('\n📖 Instructions for real data:');
  console.log('');
  console.log('1. Get transaction info from your Monero wallet:');
  console.log('   monero-wallet-cli --stagenet');
  console.log('   > show_transfers');
  console.log('   > get_tx_key <txid>');
  console.log('');
  console.log('2. Get block header:');
  console.log('   curl -X POST http://node.monerodevs.org:38089/json_rpc');
  console.log('   -d \'{"jsonrpc":"2.0","method":"get_block_header_by_height","params":{"height":<your_height>}}\'');
  console.log('');
  console.log('3. Update the moneroData object in this file');
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export { main as verifyProof, generateProof, readRealData };