pragma circom 2.1.6;

// Monero Valid Blockchain Verification Circuit
include "poseidon.circom";

template Main() {
    signal private input ptxKey;
    signal private input pblinding;
    signal private input pmask;
    signal private input pviewKey;
    
    signal input txHash;
    signal input expAmount;
    signal input blockRoot;
    signal input commitment;
    signal input destAddr;
    
    component ecdh = Poseidon(5);
    ecdh.inputs[0] <== ptxKey;
    ecdh.inputs[1] <== pviewKey;
    ecdh.inputs[2] <== expAmount;
    ecdh.inputs[3] <== pmask;
    ecdh.inputs[4] <== blockRoot;

    component ringct = Poseidon(4);
    ringct.inputs[0] <== expAmount;
    ringct.inputs[1] <== pblinding;
    ringct.inputs[2] <== pmask;
    ringct.inputs[3] <== ecdh.out;
    
    ringct.out === commitment;

    component stealth = Poseidon(2);
    stealth.inputs[0] <== ecdh.out;
    stealth.inputs[1] <== destAddr;
    
    stealth.out === destAddr;

    component check = Num2Bits(254);
    check.in <== ptxKey;
}

component main = Main();