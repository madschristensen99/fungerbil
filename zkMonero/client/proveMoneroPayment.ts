/* proveMoneroPayment.ts */
import WABridge from '@mymonero/mymonero-monero-client';
import * as snarkjs from 'snarkjs';
import axios from 'axios';

const ATOMIC_PER_XMR = 1_000_000_000_000n;

export async function proveMoneroPayment(
  txKeyHex: string,          // 1. pasted
  txHashHex: string,         // 2. pasted
  recipientAddr: string,     // 3. pasted
  expectedXmr: number        // 4. typed
) {
  // 0. load WASM
  const core = await WABridge({});

  // 1. fetch tx + block from any public daemon
  const daemon = 'https://xmr-node.cakewallet.com:18081';
  const rpc = (m: string, p: any) => axios.post(daemon + '/json_rpc', {
    jsonrpc: '2.0', id: '0', method: m, params: p
  });

  const { data: txResp } = await rpc('get_transactions', {
    txs_hashes: [txHashHex], decode_as_json: true
  });
  if (!txResp.txs.length) throw new Error('tx not found');
  const blkHashHex = txResp.blocks[0].hash;

  // 2. decrypt amount & build Merkle proof
  const { receivedAtomic, mask, merkleSiblings, leafIndex } =
        core.checkTxKeyMerkle(txKeyHex, txHashHex, recipientAddr, txResp);

  // 3. amount check
  const wanted = (BigInt(Math.round(expectedXmr * 100)) * ATOMIC_PER_XMR) / 100n;
  if (receivedAtomic !== wanted.toString())
    throw new Error(`Amount mismatch: got ${receivedAtomic}, want ${wanted}`);

  // 4. build witness
  const input = {
    txKey: hexToBits(txKeyHex, 256),
    txHash: hexToBits(txHashHex, 256),
    destHash: await poseidonHashStr(recipientAddr),
    amount: receivedAtomic,
    blockHash: hexToBits(blkHashHex, 256),
    mask,
    merklePath: merkleSiblings.map((h: string) => hexToBits(h, 256)),
    merkleIndex: leafIndex
  };

  // 5. groth16 prove
  const { proof, publicSignals } =
        await snarkjs.groth16.fullProve(input, '/monero_payment.wasm', '/monero_payment.pk');

  // 6. export Solana / EVM calldata
  return snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
}

/* ---------- helpers ---------- */
function hexToBits(hex: string, len: number) {
  return BigInt('0x' + hex).toString(2).padStart(len, '0').split('').map(Number);
}

async function poseidonHashStr(str: string) {
  const buf = Buffer.from(str);
  return await snarkjs.poseidonHash([...buf]);
}