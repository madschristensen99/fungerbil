class SolanaWalletConnect {
  constructor(statusElement) {
    this.provider = this.getProvider();
    this.connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl("devnet"));
    this.wallet = null;
    this.statusEl = statusElement;
  }

  getProvider() {
    if ("phantom" in window) {
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) return provider;
    }
    alert("Phantom Wallet not found! Install from https://phantom.app");
    return null;
  }

  async connect() {
    if (!this.provider) return;
    try {
      const resp = await this.provider.connect({ onlyIfTrusted: false });
      this.wallet = resp.publicKey;
      this.setStatus(`Connected: ${this.wallet.toString()}`);
      return this.wallet;
    } catch (err) {
      console.error("Connect error:", err);
      this.setStatus("Connection failed!");
    }
  }

  async disconnect() {
    if (!this.provider) return;
    try {
      await this.provider.disconnect();
      this.wallet = null;
      this.setStatus("Disconnected");
    } catch (err) {
      console.error("Disconnect error:", err);
    }
  }

  async getBalance() {
    if (!this.wallet) {
      this.setStatus("Not connected");
      return;
    }
    const balanceLamports = await this.connection.getBalance(this.wallet);
    const balanceSOL = balanceLamports / solanaWeb3.LAMPORTS_PER_SOL;
    this.setStatus(`Balance: ${balanceSOL} SOL`);
    return balanceSOL;
  }

  setStatus(text) {
    if (this.statusEl) this.statusEl.textContent = text;
  }
}

// --- Wire up buttons on load ---
window.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const connectBtn = document.getElementById("connectBtn");
  const disconnectBtn = document.getElementById("disconnectBtn");
  const balanceBtn = document.getElementById("balanceBtn");

  const walletConnect = new SolanaWalletConnect(statusEl);

  connectBtn.addEventListener("click", async () => {
    const wallet = await walletConnect.connect();
    if (wallet) {
      disconnectBtn.disabled = false;
      balanceBtn.disabled = false;
      connectBtn.disabled = true;
    }
  });

  disconnectBtn.addEventListener("click", async () => {
    await walletConnect.disconnect();
    disconnectBtn.disabled = true;
    balanceBtn.disabled = true;
    connectBtn.disabled = false;
  });

  balanceBtn.addEventListener("click", async () => {
    await walletConnect.getBalance();
  });
});
