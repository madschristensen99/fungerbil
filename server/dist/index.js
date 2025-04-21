import moneroTs from "monero-ts";
main();
async function main() {
    console.log('Sample app using monero-ts v' + moneroTs.MoneroUtils.getVersion());
    const daemonUri = "https://node.sethforprivacy.com";
    // connect to a daemon
    console.log("Connecting to daemon");
    let daemon = await moneroTs.connectToDaemonRpc(daemonUri);
    const height = await daemon.getHeight();
    console.log("Daemon height: " + height);
    // create wallet from seed phrase using WebAssembly bindings to monero-project
    console.log("Creating wallet from seed phrase");
    let walletFull = await moneroTs.createWalletFull({
        password: "supersecretpassword123",
        networkType: moneroTs.MoneroNetworkType.MAINNET,
        seed: "fruit utensils auburn nabbing huts hexagon espionage fainted oxygen tattoo azure dash phase opened rotate owner grunt happens usage velvet rhythm deepest utensils velvet rotate",
        restoreHeight: height - 1000,
        server: {
            uri: daemonUri,
        }
    });
    // synchronize with progress notifications
    console.log("Synchronizing wallet");
    await walletFull.sync(new class extends moneroTs.MoneroWalletListener {
        async onSyncProgress(height, startHeight, endHeight, percentDone, message) {
            // feed a progress bar?
        }
    });
    // synchronize in the background
    await walletFull.startSyncing(20000);
    // listen for incoming transfers
    let fundsReceived = false;
    await walletFull.addListener(new class extends moneroTs.MoneroWalletListener {
        async onOutputReceived(output) {
            let amount = output.getAmount();
            let txHash = output.getTx().getHash();
            fundsReceived = true;
        }
    });
    // close wallets
    console.log("Closing wallets");
    await walletFull.close();
    console.log("Done running XMR sample app");
    return true;
}
