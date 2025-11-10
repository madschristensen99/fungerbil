#!/bin/bash
set -e

echo "🏗️  Building Bonsol Hello World Project..."

# Build Rust program for zkVM
echo "📦 Building zkVM guest program..."
cd say_hello
cargo build-sbf

# Build Rust methods
echo "🔨 Compiling zkVM methods..."
cd methods
RUST_LOG=info cargo build --release -p say-hello-methods
cd ../../

# Build Solana program
echo "⛓️  Building Solana verification program..."
cd solana-program
anchor build

# Generate IDL
echo "📝 Generating IDL..."
anchor idl build --programs-dir=programs

# Copy IDL to TypeScript
mkdir -p ../ts-client/src/idl
cp target/idl/bonsol_verifier.json ../ts-client/src/idl/

# Generate TypeScript types
echo "🔄 Generating TypeScript bindings..."
anchor client-gen --program-id He11oZK1111111111111111111111111111111111111 ../../ts-client/src/types

cd ../

# Build TypeScript
echo "🎯 Building TypeScript client..."
cd ts-client
npm install
npm run build

cd ../

echo "✅ Build complete!"
echo ""
echo "Next steps:"
echo "1. solana-test-validator (start local Solana cluster)"
echo "2. anchor deploy (deploy Solana program)"
echo "3. npm run test (run end-to-end test)"