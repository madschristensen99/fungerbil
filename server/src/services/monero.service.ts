import moneroTs from 'monero-ts';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { MoneroWalletInfo } from '../types/index.js';

class MoneroService {
  private daemon: any;
  private wallets: Map<string, any> = new Map();
  private isInitialized: boolean = false;

  /**
   * Initialize the Monero service
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Monero service...');
      
      // Connect to the Monero daemon
      this.daemon = await moneroTs.connectToDaemonRpc(config.monero.daemonUri);
      const height = await this.daemon.getHeight();
      logger.info(`Connected to Monero daemon at height: ${height}`);
      
      this.isInitialized = true;
      logger.info('Monero service initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize Monero service: ${error}`);
      throw error;
    }
  }

  /**
   * Create a new Monero wallet
   * @returns The wallet info
   */
  async createWallet(): Promise<MoneroWalletInfo> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info('Creating new Monero wallet...');
      
      // Check if we have a fixed seed phrase in the config
      if (config.monero.walletSeed) {
        logger.info('Using fixed seed phrase from environment variables');
        return this.openWallet(config.monero.walletSeed);
      }
      
      // Generate a new wallet with a random seed
      const wallet = await moneroTs.createWalletFull({
        password: config.monero.walletPassword,
        networkType: this.getNetworkType(),
        server: {
          uri: config.monero.daemonUri,
        }
      });

      // Get the wallet's seed and primary address
      const seed = await wallet.getSeed();
      const primaryAddress = await wallet.getPrimaryAddress();
      const height = await this.daemon.getHeight();
      
      // Start syncing the wallet in the background
      await wallet.startSyncing(20000);
      
      // Store the wallet in memory
      const walletId = primaryAddress;
      this.wallets.set(walletId, wallet);
      
      logger.info(`Created new Monero wallet with address: ${primaryAddress}`);
      
      return {
        address: primaryAddress,
        seed,
        height,
        balance: '0',
        unlockedBalance: '0'
      };
    } catch (error) {
      logger.error(`Failed to create Monero wallet: ${error}`);
      throw error;
    }
  }

  /**
   * Open an existing Monero wallet from a seed
   * @param seed The wallet's seed phrase
   * @returns The wallet info
   */
  async openWallet(seed: string): Promise<MoneroWalletInfo> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      logger.info('Opening Monero wallet from seed...');
      
      const height = await this.daemon.getHeight();
      
      // Create a wallet from the provided seed
      const wallet = await moneroTs.createWalletFull({
        password: config.monero.walletPassword,
        networkType: this.getNetworkType(),
        seed,
        restoreHeight: height - 1000, // Start syncing from 1000 blocks ago
        server: {
          uri: config.monero.daemonUri,
        }
      });

      // Get the wallet's primary address
      const primaryAddress = await wallet.getPrimaryAddress();
      
      // Synchronize the wallet
      await wallet.sync(new class extends moneroTs.MoneroWalletListener {
        async onSyncProgress(height: number, startHeight: number, endHeight: number, percentDone: number, message: string) {
          if (percentDone % 10 === 0) {
            logger.debug(`Wallet sync progress: ${percentDone.toFixed(2)}%`);
          }
        }
      });
      
      // Start syncing the wallet in the background
      await wallet.startSyncing(20000);
      
      // Get the wallet's balance
      const balance = await wallet.getBalance();
      const unlockedBalance = await wallet.getUnlockedBalance();
      
      // Store the wallet in memory
      const walletId = primaryAddress;
      this.wallets.set(walletId, wallet);
      
      logger.info(`Opened Monero wallet with address: ${primaryAddress}`);
      
      return {
        address: primaryAddress,
        seed,
        height,
        balance: balance.toString(),
        unlockedBalance: unlockedBalance.toString()
      };
    } catch (error) {
      logger.error(`Failed to open Monero wallet: ${error}`);
      throw error;
    }
  }

  /**
   * Get a wallet's info
   * @param address The wallet's address
   * @returns The wallet info
   */
  async getWalletInfo(address: string): Promise<MoneroWalletInfo> {
    if (!this.wallets.has(address)) {
      throw new Error(`Wallet with address ${address} not found`);
    }

    try {
      const wallet = this.wallets.get(address);
      const seed = await wallet.getSeed();
      const height = await this.daemon.getHeight();
      const balance = await wallet.getBalance();
      const unlockedBalance = await wallet.getUnlockedBalance();
      
      return {
        address,
        seed,
        height,
        balance: balance.toString(),
        unlockedBalance: unlockedBalance.toString()
      };
    } catch (error) {
      logger.error(`Failed to get wallet info: ${error}`);
      throw error;
    }
  }

  /**
   * Send XMR from a wallet
   * @param fromAddress The sender's address
   * @param toAddress The recipient's address
   * @param amount The amount to send (in atomic units)
   * @returns The transaction hash
   */
  async sendTransaction(fromAddress: string, toAddress: string, amount: string): Promise<string> {
    if (!this.wallets.has(fromAddress)) {
      throw new Error(`Wallet with address ${fromAddress} not found`);
    }

    try {
      logger.info(`Sending ${amount} XMR from ${fromAddress} to ${toAddress}...`);
      
      const wallet = this.wallets.get(fromAddress);
      
      // Create the transaction
      const tx = await wallet.createTx({
        address: toAddress,
        amount: BigInt(amount)
      });
      
      // Submit the transaction
      const txHash = await wallet.submitTx(tx);
      
      logger.info(`Transaction sent with hash: ${txHash}`);
      
      return txHash;
    } catch (error) {
      logger.error(`Failed to send transaction: ${error}`);
      throw error;
    }
  }

  /**
   * Listen for incoming transactions to a specific address
   * @param address The address to monitor
   * @param callback The callback function to call when a transaction is received
   */
  async listenForTransactions(address: string, callback: (txHash: string, amount: string) => void): Promise<void> {
    if (!this.wallets.has(address)) {
      throw new Error(`Wallet with address ${address} not found`);
    }

    try {
      const wallet = this.wallets.get(address);
      
      // Add a listener for incoming transactions
      await wallet.addListener(new class extends moneroTs.MoneroWalletListener {
        async onOutputReceived(output: moneroTs.MoneroOutputWallet) {
          const amount = output.getAmount().toString();
          const txHash = output.getTx().getHash();
          
          logger.info(`Received ${amount} XMR in transaction ${txHash}`);
          
          // Call the callback function
          callback(txHash, amount);
        }
      });
      
      logger.info(`Listening for transactions to ${address}`);
    } catch (error) {
      logger.error(`Failed to listen for transactions: ${error}`);
      throw error;
    }
  }

  /**
   * Close a wallet
   * @param address The wallet's address
   */
  async closeWallet(address: string): Promise<void> {
    if (!this.wallets.has(address)) {
      return;
    }

    try {
      const wallet = this.wallets.get(address);
      await wallet.close();
      this.wallets.delete(address);
      
      logger.info(`Closed wallet with address: ${address}`);
    } catch (error) {
      logger.error(`Failed to close wallet: ${error}`);
      throw error;
    }
  }

  /**
   * Close all wallets
   */
  async closeAllWallets(): Promise<void> {
    try {
      for (const [address, wallet] of this.wallets.entries()) {
        await wallet.close();
        logger.info(`Closed wallet with address: ${address}`);
      }
      
      this.wallets.clear();
      logger.info('Closed all wallets');
    } catch (error) {
      logger.error(`Failed to close all wallets: ${error}`);
      throw error;
    }
  }

  /**
   * Get the Monero network type based on the configuration
   * @returns The Monero network type
   */
  private getNetworkType(): moneroTs.MoneroNetworkType {
    switch (config.monero.network.toLowerCase()) {
      case 'mainnet':
        return moneroTs.MoneroNetworkType.MAINNET;
      case 'testnet':
        return moneroTs.MoneroNetworkType.TESTNET;
      case 'stagenet':
        return moneroTs.MoneroNetworkType.STAGENET;
      default:
        return moneroTs.MoneroNetworkType.MAINNET;
    }
  }
}

export default new MoneroService();
