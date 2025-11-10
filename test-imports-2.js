const MyMoneroClient = require('@mymonero/mymonero-monero-client');

console.log('MyMoneroClient:', typeof MyMoneroClient);
console.log('MyMoneroClient keys:', Object.keys(MyMoneroClient));

// Check if it's a default export scenario
const { default: WABridge } = MyMoneroClient;
console.log('WABridge directly:', typeof WABridge);

// Try a simple function call
if (typeof WABridge === 'function') {
  WABridge({}).then(core => {
    console.log('WABridge success!');
  }).catch(err => {
    console.log('WABridge error:', err.message);
  });
}