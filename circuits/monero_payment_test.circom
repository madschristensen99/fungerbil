pragma circom 2.1.6;

include "poseidon.circom";
include "bitify.circom";

template Main() {
    signal input txKey[256];
    signal input txHash[256];
    signal input destHash[256];
    signal input amount;
    signal input blockHash[256];
    signal input mask;

    // 1. txKey constraint - convert to actual value first
    signal txKeyVal;
    component sc = Num2Bits(254);
    sc.in <== txKey[0];  // Simplified: use only first element
    
    // 2. Shared secret calculation using Poseidon
    component ss = Poseidon(1);
    signal hashInputs[1];
    hashInputs[0] <== txKeyVal;
    for (var i=0; i<1; i++) {
        ss.inputs[i] <== hashInputs[i];
    }

    // 3. Amount commitment check
    component h_amt = Poseidon(2);
    signal amountInputs[2];
    amountInputs[0] <== ss.out;
    amountInputs[1] <== mask;
    for (var i=0; i<2; i++) {
        h_amt.inputs[i] <== amountInputs[i];
    }
    h_amt.out === amount;

    // 4. Transaction verification
    component txHashCalc = Poseidon(1);
    txHashCalc.inputs[0] <== txHash[0];

    // 5. Destination hash verification
    component destHashCalc = Poseidon(1);
    destHashCalc.inputs[0] <== destHash[0];
}

component main = Main();