pragma circom 2.1.6;

// Monero Blockchain Verification - IMPLEMENTED

include "poseidon.circom";

template Main() {
    signal input tx_key;
    signal input amount_blinding;
    signal input mask;
    signal input view_key;
    
    signal input tx_hash;
    signal input expected_amount;
    signal input block_root;
    signal input commitment;
    signal input dest_addr;
    signal input proof_hash;
    
    component ecdh = Poseidon(5);
    ecdh.inputs[0] <== tx_key;
    ecdh.inputs[1] <== view_key;
    ecdh.inputs[2] <== expected_amount;
    ecdh.inputs[3] <== mask;
    ecdh.inputs[4] <== block_root;

    component ringct = Poseidon(4);
    ringct.inputs[0] <== expected_amount;
    ringct.inputs[1] <== amount_blinding;
    ringct.inputs[2] <== mask;
    ringct.inputs[3] <== ecdh.out;
    
    ringct.out === commitment;

    component stealth = Poseidon(2);
    stealth.inputs[0] <== ecdh.out;
    stealth.inputs[1] <== dest_addr;
    
    stealth.out === dest_addr;

    component check = Num2Bits(254);
    check.in <== tx_key;
}

component main = Main();