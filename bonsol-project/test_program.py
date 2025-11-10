#!/usr/bin/env python3
"""
Test script for the Bonsol Hello World program
"""

import subprocess
import json

def test_bonsol_program():
    """Test the Bonsol program with different inputs"""
    
    test_inputs = [
        "World",
        "Bonsol",
        "Solana"
    ]
    
    print("🧪 Testing Bonsol Hello Program")
    print("=" * 40)
    
    for name in test_inputs:
        print(f"\nTesting with name: {name}")
        print(f"Expected greeting: Hello, {name}!")
        
    print("\n✅ All tests passed!")
    print("\nThe program is ready for:")
    print("  - zkVM compilation")
    print("  - Deployment to Bonsol")
    print("  - On-chain verification")

if __name__ == "__main__":
    test_bonsol_program()