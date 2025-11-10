#!/bin/bash
set -e

echo "🚀 Deploying Bonsol Hello World..."

# Check if Solana CLI is installed
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Please install:"
    echo "  sh -c \"\$(curl -sSfL https://release.solana.com/v1.16.0/install)\""
    exit 1
fi

# Check if Anchor is installed
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor not found. Please install:"
    echo "  cargo install --git https://github.com/coral-xyz/anchor avm --locked"
    exit 1
fi

# Configure Solana for devnet (change to mainnet-beta for production)
NETWORK=${1:-devnet}
echo "🌐 Deploying to network: $NETWORK"

# Build and deploy Solana program
echo "📋 Deploying Solana verification program..."
cd solana-program
anchor build
anchor deploy --provider.cluster $NETWORK

# Get program ID
PROGRAM_ID=$(solana address -k target/deploy/bonsol_verifier-keypair.json)
echo "📍 Program deployed to: $PROGRAM_ID"

# Update TypeScript client with actual program ID
echo "🔗 Updating client with program ID..."
cd ../ts-client
sed -i "s/He11oZK1111111111111111111111111111111111111/$PROGRAM_ID/g" src/bonsol-verifier.ts

# Update Anchor.toml
cd ../solana-program
sed -i "s/He11oZK1111111111111111111111111111111111111/$PROGRAM_ID/g" Anchor.toml
echo "✅ Deployment complete!"
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Test with:"
echo "  cd ../ts-client && npm run dev Alice"