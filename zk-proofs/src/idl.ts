export type MoneroZkVerifier = {
  "version": "0.1.0",
  "name": "monero_zk_verifier",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "verificationAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "verificationKey",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "verifyMoneroProof",
      "accounts": [
        {
          "name": "verificationAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prover",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ProofData"
          }
        },
        {
          "name": "publicInputs",
          "type": {
            "vec": "u128"
          }
        }
      ]
    },
    {
      "name": "claimFromHedgehogTransfer",
      "accounts": [
        {
          "name": "verificationAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programSigner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prover",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ProofData"
          }
        },
        {
          "name": "publicInputs",
          "type": {
            "vec": "u128"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "VerificationAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "verificationKey",
            "type": "bytes"
          },
          {
            "name": "validProofCount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ProofData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "a",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "b",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "c",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "ProofVerifiedEvent",
      "fields": [
        {
          "name": "prover",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "publicInputs",
          "type": {
            "vec": "u128"
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "HedgehogTransferClaimedEvent",
      "fields": [
        {
          "name": "recipient",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "amount",
          "type": "u128",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidProofStructure",
      "msg": "Invalid proof structure"
    },
    {
      "code": 6001,
      "name": "InvalidProofSize",
      "msg": "Invalid proof size"
    },
    {
      "code": 6002,
      "name": "InvalidPublicInputCount",
      "msg": "Invalid public input count"
    },
    {
      "code": 6003,
      "name": "InvalidProof",
      "msg": "Invalid proof for verification"
    }
  ]
};

export const IDL: MoneroZkVerifier = {
  "version": "0.1.0",
  "name": "monero_zk_verifier",
  "instructions": [
    {
      "name": "initialize",
      "accounts": [
        {
          "name": "verificationAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "signer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "verificationKey",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "verifyMoneroProof",
      "accounts": [
        {
          "name": "verificationAccount",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "prover",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ProofData"
          }
        },
        {
          "name": "publicInputs",
          "type": {
            "vec": "u128"
          }
        }
      ]
    },
    {
      "name": "claimFromHedgehogTransfer",
      "accounts": [
        {
          "name": "verificationAccount",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "treasury",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "destination",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "programSigner",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "prover",
          "isMut": false,
          "isSigner": true
        },
        {
          "name": "tokenProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "proof",
          "type": {
            "defined": "ProofData"
          }
        },
        {
          "name": "publicInputs",
          "type": {
            "vec": "u128"
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "VerificationAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "verificationKey",
            "type": "bytes"
          },
          {
            "name": "validProofCount",
            "type": "u64"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "ProofData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "a",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          },
          {
            "name": "b",
            "type": {
              "array": [
                "u8",
                128
              ]
            }
          },
          {
            "name": "c",
            "type": {
              "array": [
                "u8",
                64
              ]
            }
          }
        ]
      }
    }
  ]
};