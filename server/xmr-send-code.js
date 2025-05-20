    // Actually send XMR to the shared address using the server API
    let xmrTxHash;
    console.log(`Sending ${xmrAmountAtomic} atomic units to ${sharedMoneroAddress} via server API...`);
    const sendResponse = await fetch(`${SERVER_URL}/api/monero/send-to-address`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: sharedMoneroAddress,
        amount: xmrAmountAtomic.toString()
      })
    });
    
    const sendResult = await sendResponse.json();
    if (sendResult.error) {
      throw new Error(`Failed to send XMR: ${sendResult.error}`);
    }
    
    xmrTxHash = sendResult.txHash;
    console.log('XMR transaction hash:', xmrTxHash);
