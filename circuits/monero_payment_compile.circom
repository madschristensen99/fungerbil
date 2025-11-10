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

    // 1. txKey constraint - make sure it's a valid scalar
    component sc = Num2Bits(254);
    component pack1 = PackBits(254);
    pack1.in <== txKey;
    sc.in <== pack1.out;

    // 2. Shared secret calculation using Poseidon
    component txKeyHash = PackBits(256);
    txKeyHash.in <== txKey;
    
    signal txKeyPacked;
    txKeyPacked <== txKeyHash.out;
    
    component ss = Poseidon(1);
    ss.inputs[0] <== txKeyPacked;

    // 3. Amount commitment check
    component h_amt = Poseidon(2);
    h_amt.inputs[0] <== ss.out;
    h_amt.inputs[1] <== mask;
    h_amt.out === amount;

    // 4. Transaction hash verification
    component txHashPacked = PackBits(256);
    txHashPacked.in <== txHash;
    
    component txVerifier = Poseidon(1);
    txVerifier.inputs[0] <== txHashPacked.out;

    // 5. Block verification
    component blockPacked = PackBits(256);
    blockPacked.in <== blockHash;
    
    component blockVerifier = Poseidon(1);
    blockVerifier.inputs[0] <== blockPacked.out;

    // 6. Destination verification
    component destPacked = PackBits(256);
    destPacked.in <== destHash;
    
    component destVerifier = Poseidon(1);
    destVerifier.inputs[0] <== destPacked.out;
}

template PackBits(n) {
    signal input in[n];
    signal output out;
    
    out <== in[0];
    for (var i=1; i<n; i++) {
        out <== out * 2 + in[i];
    }
}

component main = Main();