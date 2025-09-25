// SolanaWalletConnect.js
// Detects Brave (window.braveSolana), Phantom (window.phantom?.solana) and window.solana
// Uses global solanaWeb3 from the CDN bundle loaded in index.html

class SolanaWalletConnect {
  constructor(statusEl, debugEl, opts = {}) {
    this.statusEl = statusEl;
    this.debugEl = debugEl;
    this.network = opts.network || "devnet";
    this.connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl(this.network));
    this.provider = null;   // the provider object we will use for connect/disconnect
    this.publicKey = null;  // solanaWeb3.PublicKey instance when connected
    this.init();
  }

  logDebug(...args) {
    console.log(...args);
    if (this.debugEl) {
      const now = new Date().toISOString();
      this.debugEl.textContent = `${now}  ${args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')}\n\n` + this.debugEl.textContent;
    }
  }

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
    this.logDebug("STATUS:", text);
  }

  init() {
    // detect Brave, Phantom, generic window.solana in order of preference
    this.logDebug("Running provider detection...");
    if (window.braveSolana) {
      this.provider = window.braveSolana;
      this.logDebug("Detected window.braveSolana (Brave Wallet). provider:", {
        isBraveWallet: !!this.provider.isBraveWallet,
        isPhantom: !!this.provider.isPhantom,
      });
    } else if (window.phantom && window.phantom.solana) {
      this.provider = window.phantom.solana;
      this.logDebug("Detected window.phantom.solana (Phantom extension).");
    } else if (window.solana) {
      // some wallets expose only window.solana (alias)
      this.provider = window.solana;
      this.logDebug("Detected window.solana (generic). Flags:", {
        isPhantom: !!this.provider.isPhantom,
        isBraveWallet: !!this.provider.isBraveWallet,
      });
    } else {
      this.provider = null;
      this.logDebug("No Solana provider detected (window.braveSolana / window.phantom / window.solana not found).");
    }

    if (!this.provider) {
      this.setStatus("No Solana provider found. Install Phantom or enable Brave Wallet.");
    } else {
      // Optional: Listen for account changes (some providers support this)
      if (typeof this.provider.on === "function") {
        try {
          this.provider.on("connect", (pubkey) => {
            this.logDebug("provider.on connect event", pubkey?.toString?.() ?? pubkey);
            this.publicKey = pubkey || this.publicKey;
            this.setStatus(`Connected (event): ${this.publicKey?.toString?.() ?? "unknown"}`);
          });
          this.provider.on("disconnect", () => {
            this.logDebug("provider.on disconnect event");
            this.publicKey = null;
            this.setStatus("Disconnected (event)");
          });
          this.logDebug("Registered provider event listeners (if supported).");
        } catch (e) {
          this.logDebug("Failed to register provider listeners:", e);
        }
      }
    }
  }

  async connect() {
    if (!this.provider) {
      this.setStatus("No provider detected. Please install Phantom or enable Brave Wallet.");
      return null;
    }

    // Brave & many providers support the same API as Phantom:
    // provider.connect() returns { publicKey }
    this.setStatus("Requesting connection...");
    try {
      // use onlyIfTrusted:false to always prompt the user (useful for debugging)
      const resp = await this.provider.connect({ onlyIfTrusted: false }).catch(async (err) => {
        // Some Brave builds might require different options; fallback to plain connect()
        this.logDebug("connect() rejected, trying connect() without options. error:", err);
        return await this.provider.connect();
      });

      // provider.connect may return {publicKey} or set provider.publicKey
      const pk = resp?.publicKey ?? this.provider.publicKey ?? null;
      if (!pk) {
        this.logDebug("No publicKey returned from connect() response; checking provider.publicKey:", this.provider.publicKey);
        this.setStatus("Connected but no public key returned (unexpected).");
        return null;
      }

      // normalize to solanaWeb3.PublicKey if needed
      this.publicKey = (pk instanceof solanaWeb3.PublicKey) ? pk : new solanaWeb3.PublicKey(pk.toString());
      this.setStatus(`Connected: ${this.publicKey.toString()}`);
      this.logDebug("Connected successful. PublicKey:", this.publicKey.toString());
      return this.publicKey;
    } catch (err) {
      this.logDebug("Connection error:", err);
      this.setStatus(`Connect failed: ${err?.message ?? err}`);
      return null;
    }
  }

  async disconnect() {
    if (!this.provider) {
      this.setStatus("No provider to disconnect.");
      return;
    }
    try {
      if (typeof this.provider.disconnect === "function") {
        await this.provider.disconnect();
      } else {
        this.logDebug("Provider has no disconnect() method. Clearing local state.");
      }
    } catch (err) {
      this.logDebug("Error during disconnect:", err);
    } finally {
      this.publicKey = null;
      this.setStatus("Disconnected");
    }
  }

  async getBalance() {
    if (!this.publicKey) {
      this.setStatus("Not connected");
      return null;
    }
    try {
      const lamports = await this.connection.getBalance(this.publicKey);
      const sol = lamports / solanaWeb3.LAMPORTS_PER_SOL;
      this.setStatus(`Balance: ${sol} SOL`);
      this.logDebug("Balance fetched:", { lamports, sol });
      return sol;
    } catch (err) {
      this.logDebug("Balance fetch error:", err);
      this.setStatus("Failed to fetch balance");
      return null;
    }
  }
}

// --- Wire up UI ---
window.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const debugEl = document.getElementById("debug");
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const balanceBtn = document.getElementById("balanceBtn");

  const client = new SolanaWalletConnect(statusEl, debugEl, { network: "devnet" });

  connectBtn.addEventListener("click", async () => {
    connectBtn.disabled = true;
    debugEl.textContent = ""; // clear old logs
    const pk = await client.connect();
    if (pk) {
      disconnectBtn.disabled = false;
      balanceBtn.disabled = false;
      connectBtn.disabled = true;
    } else {
      connectBtn.disabled = false;
    }
  });

  disconnectBtn.addEventListener("click", async () => {
    await client.disconnect();
    disconnectBtn.disabled = true;
    balanceBtn.disabled = true;
    connectBtn.disabled = false;
  });

  balanceBtn.addEventListener("click", async () => {
    await client.getBalance();
  });
});
