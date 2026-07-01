const path = require('path');

try {
  const Service = require('node-windows').Service;

  const svc = new Service({
    name: 'VendorHub',
    script: path.join(__dirname, 'server', 'index.js'),
  });

  svc.on('uninstall', function () {
    console.log('VendorHub service uninstalled.');
  });

  svc.uninstall();
} catch (e) {
  console.log('node-windows not found or service not installed.');
}
