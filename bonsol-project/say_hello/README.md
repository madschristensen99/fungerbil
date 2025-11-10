# Bonsol Hello World

A simple zkVM greeting program built with Bonsol.

## Structure

- `src/lib.rs` - zkVM program with proof generation
- `src/main.rs` - CLI interface for testing
- `Cargo.toml` - Project configuration

## Dependencies

This project uses:
- Bonsol prover framework
- RISC Zero zkVM
- Serde for serialization

## Build Instructions

1. Install dependencies
2. Build with `cargo build`
3. Generate zkVM programs

## Usage

The program takes a name as input and produces a greeting as a verifiable proof.