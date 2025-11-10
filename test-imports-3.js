const MyMoneroClient = require('@mymonero/mymonero-monero-client');

console.log('MyMoneroClient is a function:', typeof MyMoneroClient);

MyMoneroClient({}).then(core => {
  console.log('MyMoneroClient init success!');
  console.log('Available methods:', Object.keys(core));
}).catch(err => {
  console.log('MyMoneroClient error:', err.message);
  console.log('Error stack:', err.stack);
});