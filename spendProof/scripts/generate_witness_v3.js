// Simplified witness generator for v3 circuit
// Only generates: r, v, output_index (private) + public inputs

const monerojs = require("monero-javascript");
const axios = require("axios");
const fs = require("fs");
const { Point } = require("@noble/ed25519");
const { sha512 } = require("@noble/hashes/sha512");
const { hexToBytes } = require("@noble/hashes/utils");

// Required for @noble/ed25519
const ed = require("@noble/ed25519");
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));

// Decode Monero address to extract view key (A) and spend key (B)
function decodeMoneroAddress(address) {
    const base58 = require('base58-monero');
    const decoded = base58.decode(address);
    
    const spendKey = decoded.slice(1, 33).toString('hex');
    const viewKey = decoded.slice(33, 65).toString('hex');
    
    return {
        viewKey: viewKey,
        spendKey: spendKey
    };
}

// Real Monero transaction data
const TX_DATA = {
    hash: "bb1eab8e0de071a272e522ad912d143aa531e0016d51e0aec800be39511dd141",
    block: 3569096,
    secretKey: "9be32769af6e99d0fef1dcddbef68f254004e2eb06e8f712c01a63d235a5410c",
    amount: 931064529072,
    destination: "87DZ8wkCoePVH7UH7zL3FhR2CjadnC83pBMqXZizg7T2dJod5rzQuAMbBg5PtcA9dHTtWAvrL7ZCTXEC2RDV3Mr4HJYP9gj",
    output_index: 0,
    node: "https://monero-rpc.cheems.de.box.skhron.com.ua:18089"
};

async function generateWitnessV3() {
    console.log("🔧 Generating V3 Circuit Witness (Secure Version)\n");
    console.log("TX Hash:", TX_DATA.hash);
    console.log("Amount:", TX_DATA.amount, "piconero\n");
    
    try {
        // Step 1: Fetch transaction
        console.log("📡 Fetching transaction...");
        const response = await axios.post(`${TX_DATA.node}/gettransactions`, {
            txs_hashes: [TX_DATA.hash],
            decode_as_json: true
        });
        
        if (!response.data || !response.data.txs || response.data.txs.length === 0) {
            throw new Error("Transaction not found");
        }
        
        const txData = response.data.txs[0];
        const txJson = JSON.parse(txData.as_json);
        
        // Extract R from blockchain (for reference only)
        const extraBytes = txJson.extra;
        if (extraBytes[0] !== 1) throw new Error("Invalid extra field format");
        const blockchainR = Buffer.from(extraBytes.slice(1, 33)).toString('hex');
        
        console.log("📍 Blockchain R:", blockchainR);
        
        // CRITICAL: For the circuit, we need to compute R = r·G
        // (blockchain R may be different for subaddress transactions)
        const r_bytes = Buffer.from(TX_DATA.secretKey, 'hex');
        let r_scalar = 0n;
        for (let i = 0; i < 32; i++) {
            r_scalar |= BigInt(r_bytes[i]) << BigInt(i * 8);
        }
        
        const R_point = Point.BASE.multiply(r_scalar);
        const txPubKey = R_point.toHex();
        
        console.log("✅ Computed R = r·G:", txPubKey);
        if (txPubKey !== blockchainR) {
            console.log("⚠️  Note: Subaddress transaction detected (R_blockchain ≠ r·G)");
        }
        
        // Extract output at specified index
        const output = txJson.vout[TX_DATA.output_index];
        const outputKey = output.target.tagged_key.key;
        const ecdhAmount = txJson.rct_signatures.ecdhInfo[TX_DATA.output_index].amount;
        
        console.log("✅ Output Key (P):", outputKey);
        console.log("✅ ECDH Amount:", ecdhAmount);
        
        // Decode destination address
        const addressKeys = decodeMoneroAddress(TX_DATA.destination);
        console.log("✅ View Key (A):", addressKeys.viewKey);
        console.log("✅ Spend Key (B):", addressKeys.spendKey);
        
        // Convert secret key to bits (LSB first)
        const secretKeyBytes = Buffer.from(TX_DATA.secretKey, 'hex');
        const secretKeyBits = [];
        for (let i = 0; i < 32; i++) {
            for (let j = 0; j < 8; j++) {
                secretKeyBits.push(((secretKeyBytes[i] >> j) & 1).toString());
            }
        }
        
        // Convert compressed points to field elements (clear top bit)
        // Convert computed R to compressed format for circuit
        const R_compressed = (() => {
            const rBytes = hexToBytes(txPubKey);
            let rBigInt = 0n;
            for (let i = 0; i < 32; i++) {
                rBigInt |= BigInt(rBytes[i]) << BigInt(i * 8);
            }
            // Clear top bit for 255-bit value
            return (rBigInt & ((1n << 255n) - 1n)).toString();
        })();
        
        const P_compressed = (() => {
            const pBytes = Buffer.from(outputKey, 'hex');
            pBytes[31] &= 0x7F;
            let pBigInt = 0n;
            for (let i = 0; i < 32; i++) {
                pBigInt |= BigInt(pBytes[i]) << BigInt(i * 8);
            }
            return (pBigInt & ((1n << 255n) - 1n)).toString();
        })();
        
        const A_compressed = (() => {
            const aBytes = Buffer.from(addressKeys.viewKey, 'hex');
            aBytes[31] &= 0x7F;
            let aBigInt = 0n;
            for (let i = 0; i < 32; i++) {
                aBigInt |= BigInt(aBytes[i]) << BigInt(i * 8);
            }
            return (aBigInt & ((1n << 255n) - 1n)).toString();
        })();
        
        const B_compressed = (() => {
            const bBytes = Buffer.from(addressKeys.spendKey, 'hex');
            bBytes[31] &= 0x7F;
            let bBigInt = 0n;
            for (let i = 0; i < 32; i++) {
                bBigInt |= BigInt(bBytes[i]) << BigInt(i * 8);
            }
            return (bBigInt & ((1n << 255n) - 1n)).toString();
        })();
        
        const ecdhAmountBigInt = BigInt('0x' + ecdhAmount);
        
        // Convert tx hash to field element
        const txHashBigInt = BigInt('0x' + TX_DATA.hash);
        
        // Create circuit input (V3 - simplified, no H_s_scalar or P_extended)
        const circuitInput = {
            // Private inputs
            r: secretKeyBits.slice(0, 255),
            v: TX_DATA.amount.toString(),
            output_index: TX_DATA.output_index.toString(),
            
            // Public inputs
            R_compressed: R_compressed,
            P_compressed: P_compressed,
            ecdhAmount: ecdhAmountBigInt.toString(),
            A_compressed: A_compressed,
            B_compressed: B_compressed,
            monero_tx_hash: txHashBigInt.toString()
        };
        
        fs.writeFileSync("input_v3.json", JSON.stringify(circuitInput, null, 2));
        console.log("\n✅ V3 Circuit input saved to input_v3.json");
        
        console.log("\n" + "=".repeat(70));
        console.log("📊 V3 WITNESS GENERATION SUMMARY");
        console.log("=".repeat(70));
        console.log("\n✅ Simplified Input (H_s and P computed in-circuit):");
        console.log("   • Private: r (255 bits), v, output_index");
        console.log("   • Public: R, P, ecdhAmount, A, B, tx_hash");
        console.log("\n🔒 Security Improvements:");
        console.log("   • H_s_scalar: COMPUTED from S || output_index");
        console.log("   • P derivation: VERIFIED as H_s·G + B");
        console.log("   • Identity checks: ENABLED");
        console.log("   • Nullifier: Generated for double-spend prevention");
        console.log("\n✅ Witness generation completed");
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        process.exit(1);
    }
}

generateWitnessV3();
